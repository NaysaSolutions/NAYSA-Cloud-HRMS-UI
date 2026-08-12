

import {
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFileLines,
  faMagnifyingGlass,
  faPrint,
  faFileExport,
  faInfoCircle,
  faUser,
  faCalendarAlt,
  faUndo,
} from "@fortawesome/free-solid-svg-icons";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";

import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { fetchData } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import { exportGenericHistoryExcel } from "@/NAYSA Cloud/Global/report";
import {
  useTopCompanyRow,
  useTopUserRow,
  useTopBranchRow,
} from "@/NAYSA Cloud/Global/top1RefTable";
import { useSelectedHSColConfig } from "@/NAYSA Cloud/Global/selectedData";
import SearchGlobalReportTable from "@/NAYSA Cloud/Lookup/SearchGlobalReportTable.jsx";
import PayeeMastLookupModal from "@/NAYSA Cloud/Lookup/SearchVendMast";
import BranchLookupModal from "@/NAYSA Cloud/Lookup/SearchBranchRef";
import GlobalGLPostingModalv1 from "@/NAYSA Cloud/Lookup/SearchGlobalGLPostingv1.jsx";
import Swal from "sweetalert2";
import {
  useformatToDatev2,
  useGetCurrentDayV2,
  useGetFirstDayOfMonth,
  useFormatToDate,
} from "@/NAYSA Cloud/Global/dates";

import {
  useSwalSuccessAlert,
  useSwalErrorAlert,
  useSwalValidationAlert,
} from "@/NAYSA Cloud/Global/behavior.jsx";

import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import DateFormatInput from "@/NAYSA Cloud/Global/DateFormatInput.jsx";

const ENDPOINT = "getAPCheckRelasing";
const EXPORT_FILE_NAME = "Check Releasing and Return";

/* ---------------- Status Helpers ---------------- */

function normalizeStatusCode(value) {
  const s = (value || "").toString().trim().toUpperCase();

  if (
    s === "U" ||
    s === "UNRELEASED" ||
    s === "U - UNRELEASED" ||
    s === "🟢 UNRELEASED"
  )
    return "U";

  if (
    s === "R" ||
    s === "RELEASED" ||
    s === "R - RELEASED" ||
    s === "🔵 RELEASED"
  )
    return "R";

  if (
    s === "H" ||
    s === "HOLD" ||
    s === "H - HOLD" ||
    s === "🔴 HOLD"
  )
    return "H";

  if (
    s === "X" ||
    s === "RETURNED" ||
    s === "X - RETURNED" ||
    s === "⚪ RETURNED"
  )
    return "X";

  if (
    s === "V" ||
    s === "REV" ||
    s === "REVERSED" ||
    s === "V - REVERSED" ||
    s === "🟣 REVERSED"
  )
    return "V";

  if (
    s === "S" ||
    s === "STALE" ||
    s === "S - STALE" ||
    s === "⚫ STALE"
  )
    return "S";

  if (s === "ALL") return "ALL";

  return "";
}

function getExplicitPostedCvStatus(row) {
  const statusValues = [
    row?.cvDocStatus,
    row?.cv_doc_status,
    row?.cvStatus,
    row?.cv_status,
    row?.documentStatus,
    row?.document_status,
    row?.tranStatus,
    row?.tran_status,
    row?.postingStatus,
    row?.posting_status,
  ];

  if (
    statusValues.some((value) =>
      ["FINALIZED", "POSTED"].includes(
        (value || "").toString().trim().toUpperCase()
      )
    )
  ) {
    return true;
  }

  if (
    statusValues.some((value) =>
      ["OPEN", "CANCELLED", "CLOSED", "UNPOSTED"].includes(
        (value || "").toString().trim().toUpperCase()
      )
    )
  ) {
    return false;
  }

  const postedFlags = [
    row?.isPosted,
    row?.is_posted,
    row?.posted,
    row?.isFinalized,
    row?.is_finalized,
    row?.finalized,
  ];

  if (postedFlags.some((value) => {
    const normalized = (value ?? "").toString().trim().toUpperCase();
    return normalized === "1" || normalized === "Y" || normalized === "TRUE";
  })) {
    return true;
  }

  if (postedFlags.some((value) => {
    const normalized = (value ?? "").toString().trim().toUpperCase();
    return normalized === "0" || normalized === "N" || normalized === "FALSE";
  })) {
    return false;
  }

  return null;
}

function getRowBranchCode(row, fallbackBranchCode = "") {
  return (
    row?.branchCode ||
    row?.branch_code ||
    row?.branchcode ||
    row?.BranchCode ||
    fallbackBranchCode ||
    ""
  );
}

function getCvNoFromPathUrl(pathUrl) {
  const raw = String(pathUrl || "").trim();
  if (!raw) return "";

  try {
    const url = new URL(raw, "http://naysa.local");
    return url.searchParams.get("cvNo") || url.searchParams.get("docNo") || "";
  } catch {
    return "";
  }
}

function getRowCvNo(row) {
  return (
    row?.cvNo ||
    row?.cv_no ||
    row?.CVNo ||
    row?.docNo ||
    row?.doc_no ||
    row?.documentNo ||
    row?.document_no ||
    getCvNoFromPathUrl(row?.pathUrl) ||
    ""
  );
}

async function isPostedCvTransaction(row, fallbackBranchCode = "") {
  const explicitStatus = getExplicitPostedCvStatus(row);
  if (explicitStatus !== null) return explicitStatus;

  const cvNo = getRowCvNo(row);
  const rowBranchCode = getRowBranchCode(row, fallbackBranchCode);
  if (!cvNo || !rowBranchCode) return false;

  try {
    const query = `cvNo=${encodeURIComponent(cvNo)}&branchCode=${encodeURIComponent(
      rowBranchCode
    )}&direction=`;
    const response = await fetchData(`getCV?${query}`);
    const cvData = response?.data?.[0]?.result
      ? JSON.parse(response.data[0].result)
      : null;

    return getExplicitPostedCvStatus({
      cvStatus: cvData?.cvStatus,
      cvDocStatus: cvData?.docStatus,
      documentStatus: cvData?.documentStatus,
      tranStatus: cvData?.tranStatus,
    }) === true;
  } catch (error) {
    console.error("CV posted status check failed:", error);
    return false;
  }
}

function buildStatusDisplay(codeOrText) {
  const code = normalizeStatusCode(codeOrText);
  switch (code) {
    case "U":
      return "🟢 UnReleased";
    case "R":
      return "🔵 Released";
    case "H":
      return "🔴 Hold";
    case "X":
      return "⚪ Returned";
    case "V":
      return "🟣 Reversed";
    case "S":
      return "⚫ Stale";
    default:
      return (codeOrText || "").toString();
  }
}

function getDetailReleasedStatCode(row) {
  return normalizeStatusCode(
    row?.releasedStat ??
      row?.released_stat ??
      row?.docStatus ??
      row?.doc_status ??
      row?.status ??
      row?.statusCode ??
      ""
  );
}

function filterRowsByHeaderStatus(list = [], headerStatus) {
  const normalizedHeader = normalizeStatusCode(headerStatus);

  if (!normalizedHeader || normalizedHeader === "ALL") return list;

  return list.filter((row) => getDetailReleasedStatCode(row) === normalizedHeader);
}

function safeDateFromString(s) {
  if (!s) return null;

  const raw = String(s).trim();

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
    const [mm, dd, yyyy] = raw.split("/");
    const d = new Date(`${yyyy}-${mm}-${dd}`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(raw.substring(0, 10));
  return Number.isNaN(d.getTime()) ? null : d;
}

function getRowDocDate(row) {
  if (!row) return "";
  return (
    row.docDate ||
    row.doc_date ||
    row.docdate ||
    row.DocDate ||
    row.checkDate ||
    row.check_date ||
    ""
  );
}

function getRowReceivedDate(row) {
  if (!row) return "";
  return row.receivedDate || row.received_date || row.recvDate || "";
}

const summaryCardClass =
  "border rounded-lg px-3 py-2 bg-slate-50 flex flex-col min-h-[72px]";
const summaryLabelClass =
  "text-[10px] uppercase tracking-wide text-slate-500";
const summaryValueClass =
  "mt-2 text-right text-base font-bold text-slate-900 tabular-nums";

export default function CheckRL() {
  const { user, companyInfo, currentUserRow } = useAuth();
  const [userPassword, setUserPassword] = useState(null);

  const barRef = useRef(null);
  const [headerH, setHeaderH] = useState(48);
  const [barH, setBarH] = useState(48);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;

    const header =
      document.querySelector("#appHeader") ||
      document.querySelector(".global-app-topbar") ||
      document.querySelector("header[role='banner']") ||
      document.querySelector("header");

    const remeasure = () => {
      if (header) {
        const rect = header.getBoundingClientRect();
        setHeaderH(Math.max(0, Math.round(rect.height)));
      }
      if (barRef.current) {
        const rect = barRef.current.getBoundingClientRect();
        setBarH(Math.max(0, Math.round(rect.height)));
      }
    };

    remeasure();
    window.addEventListener("resize", remeasure);
    const a = requestAnimationFrame(remeasure);
    const b = requestAnimationFrame(remeasure);

    return () => {
      window.removeEventListener("resize", remeasure);
      cancelAnimationFrame(a);
      cancelAnimationFrame(b);
    };
  }, []);

  const [state, setState] = useState({
    branchCode: "",
    branchName: "",
    payeeCode: "",
    payeeName: "",
    startDate: useGetFirstDayOfMonth(),
    endDate: useGetCurrentDayV2(),
    status: "ALL",
    allRows: [],
    rows: [],
    cols: [],
    jvNo: "",
    jvDate: useGetCurrentDayV2(),
    showBranchModal: false,
    showPayeeModal: false,
    isLoading: false,
    showSpinner: false,
    guideOpen: false,
    showReversalModal: false,
    countU: 0,
    countR: 0,
    countH: 0,
    countX: 0,
    countV: 0,
    countS: 0,
    grandTotal: 0,
  });

  const updateState = (u) => setState((p) => ({ ...p, ...u }));

  const {
    branchCode,
    branchName,
    payeeCode,
    payeeName,
    startDate,
    endDate,
    status,
    allRows,
    rows,
    cols,
    showBranchModal,
    showPayeeModal,
    isLoading,
    showSpinner,
    guideOpen,
    showReversalModal,
    countU,
    countR,
    countH,
    countX,
    countV,
    countS,
    grandTotal,
  } = state;

  const [actionModal, setActionModal] = useState({
    open: false,
    row: null,
    status: "R",
    originalStatus: "",
    releasedBy: "",
    receivedBy: "",
    receivedDate: useGetCurrentDayV2(),
    invoiceNo: "",
    remarks: "",
    activeTab: "release",
    returnedBy: "",
    returnedDate: "",
    returnedReason: "",
  });

  const tableRef = useRef(null);

  useEffect(() => {
    let t;
    if (isLoading) {
      t = setTimeout(() => updateState({ showSpinner: true }), 200);
    } else {
      updateState({ showSpinner: false });
    }
    return () => clearTimeout(t);
  }, [isLoading]);

  const loadedColsRef = useRef(false);
  useEffect(() => {
    if (loadedColsRef.current) return;
    let alive = true;

    (async () => {
      try {
        const result = await useSelectedHSColConfig(ENDPOINT);
        if (!alive || !Array.isArray(result)) return;

        const mappedCols = result.map((c) => ({ ...c }));
        const statusCol =
          mappedCols.find((c) => c.key === "docStatus") ||
          mappedCols.find((c) => c.key === "doc_status") ||
          mappedCols.find((c) => c.key === "releasedStat") ||
          mappedCols.find((c) => c.key === "released_stat");

        if (statusCol) {
          statusCol.key = "docStatusView";
          statusCol.label = "Status";
        }

        setState((prev) => ({ ...prev, cols: mappedCols }));
        loadedColsRef.current = true;
      } catch (e) {
        console.error("Load column config failed:", e);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const colsWithActions = useMemo(() => {
    if (!Array.isArray(cols) || cols.length === 0) return cols;

    const alreadyHasActions = cols.some((c) => c.renderType === "actions");
    if (alreadyHasActions) return cols;

    return [
      {
        key: "__actions",
        label: "Actions",
        renderType: "actions",
        sortable: false,
      },
      ...cols,
    ];
  }, [cols]);

  const computeTotals = useCallback((list = []) => {
    if (!Array.isArray(list) || list.length === 0) {
      updateState({
        countU: 0,
        countR: 0,
        countH: 0,
        countX: 0,
        countV: 0,
        countS: 0,
        grandTotal: 0,
      });
      return;
    }

    const acc = list.reduce(
      (a, r) => {
        const rel = getDetailReleasedStatCode(r);

        switch (rel) {
          case "U":
            a.countU += 1;
            break;
          case "R":
            a.countR += 1;
            break;
          case "H":
            a.countH += 1;
            break;
          case "X":
            a.countX += 1;
            break;
          case "V":
            a.countV += 1;
            break;
          case "S":
            a.countS += 1;
            break;
          default:
            break;
        }

        return a;
      },
      {
        countU: 0,
        countR: 0,
        countH: 0,
        countX: 0,
        countV: 0,
        countS: 0,
      }
    );

    updateState({
      countU: acc.countU,
      countR: acc.countR,
      countH: acc.countH,
      countX: acc.countX,
      countV: acc.countV,
      countS: acc.countS,
      grandTotal: list.length,
    });
  }, []);

  const applyHeaderStatusFilter = useCallback(
    (sourceRows, headerStatus) => {
      const filtered = filterRowsByHeaderStatus(sourceRows, headerStatus);
      updateState({ rows: filtered });
      computeTotals(filtered);
      return filtered;
    },
    [computeTotals]
  );

  const fetchCheckReleasingRows = useCallback(async (filters) => {
    const searchBranchCode = filters?.branchCode || "";

    const resp = await fetchData(ENDPOINT, {
      json_data: {
        json_data: {
          branchCode: searchBranchCode,
          payeeCode: filters?.payeeCode || "",
          startDate: filters?.startDate || "",
          endDate: filters?.endDate || "",
          status: "",
        },
      },
    });

    const parsed = resp?.data?.[0]?.result
      ? JSON.parse(resp.data[0].result)
      : [];

    const dt1 = Array.isArray(parsed) ? parsed : [];
    const postedChecks = await Promise.all(
      dt1.map((row) => isPostedCvTransaction(row, searchBranchCode))
    );
    const postedCvRows = dt1.filter((_, index) => postedChecks[index]);

    return postedCvRows.map((r) => {
      const rawStatus =
        r.releasedStat ??
        r.released_stat ??
        r.docStatus ??
        r.doc_status ??
        r.status ??
        "";

      const code = normalizeStatusCode(rawStatus);

      return {
        ...r,
        statusCode: code,
        originalDocStatus: rawStatus,
        docStatusView: buildStatusDisplay(rawStatus),
      };
    });
  }, []);

  const loadDefaults = useCallback(async () => {
    updateState({ showSpinner: true });
    const defaults = {
      branchCode: "",
      branchName: "",
      startDate: useGetFirstDayOfMonth(),
      endDate: useGetCurrentDayV2(),
      status: "ALL",
    };

    try {
      const [, hsUser] = await Promise.all([
        useTopCompanyRow(),
        useTopUserRow(user?.USER_CODE),
      ]);

      if (hsUser) {
        const hsBranch = await useTopBranchRow(hsUser.branchCode);
        defaults.branchCode = hsUser.branchCode || "";
        defaults.branchName = hsBranch?.branchName || hsUser.branchName || "";
      }

      updateState(defaults);
      return defaults;
    } catch (err) {
      console.error("Error loading defaults:", err);
      updateState(defaults);
      return defaults;
    } finally {
      updateState({ showSpinner: false });
    }
  }, [user?.USER_CODE]);

  const handleReset = useCallback(async () => {
    updateState({ isLoading: true });
    tableRef.current?.clearAllState();

    try {
      const defaults = await loadDefaults();
      const resetFilters = {
        ...defaults,
        payeeCode: "",
        payeeName: "",
      };

      updateState({
        ...resetFilters,
        allRows: [],
        rows: [],
        countU: 0,
        countR: 0,
        countH: 0,
        countX: 0,
        countV: 0,
        countS: 0,
        grandTotal: 0,
      });

      const decorated = await fetchCheckReleasingRows(resetFilters);
      updateState({ allRows: decorated });
      applyHeaderStatusFilter(decorated, "ALL");
    } catch (e) {
      console.error("Reset failed:", e);
      updateState({ allRows: [], rows: [] });
      computeTotals([]);
    } finally {
      updateState({ isLoading: false });
    }
  }, [
    applyHeaderStatusFilter,
    computeTotals,
    fetchCheckReleasingRows,
    loadDefaults,
  ]);

  const doFind = useCallback(async () => {
    updateState({ isLoading: true });
    try {
      const decorated = await fetchCheckReleasingRows({
        branchCode,
        payeeCode,
        startDate,
        endDate,
      });

      updateState({ allRows: decorated });
      const filteredRows = applyHeaderStatusFilter(decorated, status);

      if (filteredRows.length === 0) {
        useSwalValidationAlert({
          icon: "info",
          title: "No Records Found",
          message: `No records found for the selected date range: ${
            startDate || "N/A"
          } to ${endDate || "N/A"}.`,
        });
      }
    } catch (e) {
      console.error("Find failed:", e);
      updateState({ allRows: [], rows: [] });
      computeTotals([]);
    } finally {
      updateState({ isLoading: false });
    }
  }, [
    branchCode,
    payeeCode,
    startDate,
    endDate,
    status,
    applyHeaderStatusFilter,
    computeTotals,
    fetchCheckReleasingRows,
  ]);

  useEffect(() => {
    if (!user?.USER_CODE) return;
    loadDefaults();
  }, [user?.USER_CODE, loadDefaults]);

  useEffect(() => {
    applyHeaderStatusFilter(allRows, status);
  }, [status, allRows, applyHeaderStatusFilter]);

  const doExport = useCallback(async () => {
    if (!Array.isArray(rows) || rows.length === 0) return;

    try {
      updateState({ isLoading: true });

      const exportData = {
        Data: {
          "Check Releasing Detailed": rows,
        },
      };

      const columnConfigsMap = {
        "Check Releasing Detailed": cols,
      };

      const payload = {
        ReportName: EXPORT_FILE_NAME,
        UserCode: currentUserRow?.userName,
        Branch: branchCode || "",
        JsonData: exportData,
        companyName: companyInfo?.compName,
        companyAddress: companyInfo?.compAddr,
        companyTelNo: companyInfo?.telNo,
      };

      await exportGenericHistoryExcel(payload, columnConfigsMap);
    } catch (e) {
      console.error("Export failed:", e);
    } finally {
      updateState({ isLoading: false });
    }
  }, [rows, cols, branchCode, currentUserRow?.userName, companyInfo]);

  const onAction = (id) => {
    switch (id) {
      case "find":
        return doFind();
      case "reset":
        return handleReset();
      case "print":
        return window.print();
      case "export-query":
        return doExport();
      case "guide":
        return updateState({ guideOpen: !guideOpen });
      default:
        return;
    }
  };

  const handleRowActionsClick = useCallback(
    (row) => {
      const defaultUserName = user?.userName || currentUserRow?.userName || "";

      const code =
        row.statusCode ||
        normalizeStatusCode(
          row.originalDocStatus ||
            row.releasedStat ||
            row.released_stat ||
            row.docStatus ||
            row.doc_status ||
            ""
        );

      const formattedDate = row?.receivedDate
        ? useFormatToDate(row.receivedDate)
        : useGetCurrentDayV2();

      const initialStatus = code === "R" || code === "H" ? code : "R";

      setActionModal({
        open: true,
        row,
        status: initialStatus,
        originalStatus: code || "",
        releasedBy: row?.releasedBy || defaultUserName,
        receivedBy: row?.receivedBy || "",
        receivedDate: initialStatus === "H" ? "" : formattedDate,
        invoiceNo: row?.receiptNo || "",
        remarks: row?.releasedRemarks || "",
        activeTab: "release",
        returnedBy: row?.returnedBy || "",
        returnedDate: row?.returnedDate
          ? useFormatToDate(row.returnedDate)
          : "",
        returnedReason: row?.returnedRemarks || "",
      });
    },
    [user?.userName, currentUserRow?.userName]
  );

  const handleActionModalCancel = () => {
    setActionModal((prev) => ({ ...prev, open: false, row: null }));
  };

  const handleActionModalApply = async () => {
    if (!actionModal.row) {
      handleActionModalCancel();
      return;
    }

    const {
      row,
      status: statusCode,
      releasedBy,
      receivedBy,
      receivedDate,
      invoiceNo,
      remarks,
      originalStatus,
      returnedBy,
      returnedDate,
      returnedReason,
      activeTab,
    } = actionModal;

    const normalizedCurrentStatus = normalizeStatusCode(statusCode);
    const originalStatusCode = normalizeStatusCode(originalStatus);
    const isReleased = normalizedCurrentStatus === "R";

    if (["X", "V", "S"].includes(originalStatusCode)) return;

    if (activeTab === "release") {
      if (normalizedCurrentStatus === "H" && !String(remarks || "").trim()) {
        useSwalErrorAlert("Remarks required","Remarks is required when status is set to HOLD.",)      
        return;
      }

      if (isReleased) {
      const missingFields = [];
      if (!String(releasedBy || "").trim()) missingFields.push("Released By");
      if (!String(receivedBy || "").trim()) missingFields.push("Received By");
      if (!String(receivedDate || "").trim()) missingFields.push("Received Date");
      if (!String(invoiceNo || "").trim()) missingFields.push("Invoice No");

      if (missingFields.length > 0) {
        const numberedFields = missingFields
          .map((field, index) => `${index + 1}. ${field}`)
          .join("\n");

        useSwalErrorAlert(
          "Missing required fields",
          `The following field(s) are required when status is Released:\n\n${numberedFields}`
        );
        return;
      }


        const docDateStr = getRowDocDate(row);
        const docD = safeDateFromString(docDateStr);
        const recvD = safeDateFromString(receivedDate);

        if (docD && recvD && recvD < docD) {
          useSwalErrorAlert("Invalid Received Date","Received Date must be equal to or later than the Document Date.")         
          return;
        }
      }
    } 

    

    try {
      updateState({ isLoading: true });

      let finalStatus = normalizedCurrentStatus;
      if (activeTab === "return") {
        finalStatus = "X";
      }

      const payload = {
        json_data: {
          tranId: row.tran_id,
          status: finalStatus,
          releasedBy,
          receivedDate,
          receivedBy,
          invoiceNo,
          remarks,
          returnedBy,
          returnedDate,
          returnedReason,
        },
      };

      const { data: res } = await apiClient.post("updateAPCKRL", payload);

      if (res?.status !== "success") {
        useSwalErrorAlert("Check Releasing failed", res?.message ?? "Check Releasing failed.")  
        
        return;
      }

      await doFind();
      useSwalSuccessAlert("Update completed","Document status has been updated successfully.")  
      

      handleActionModalCancel();
    } catch (error) {
      console.error("Error updating check releasing:", error);
      await Swal.fire({
        icon: "error",
        title: "Update failed",
        text: "An error occurred while updating the status. Please try again.",
      });
    } finally {
      updateState({ isLoading: false });
    }
  };

  const selectedRow = actionModal.row || {};
  const originalStatusCode = normalizeStatusCode(actionModal.originalStatus);
  const isAllLocked = ["X", "V", "S"].includes(originalStatusCode);
  const isReleaseTabLocked = originalStatusCode === "R" || isAllLocked;

  const isRemarksRequired =
    normalizeStatusCode(actionModal.status) === "H" &&
    !String(actionModal.remarks || "").trim();

  const showReturnTab = originalStatusCode !== "U";

  const isReturnMissing =
    actionModal.activeTab === "return" &&
    (!String(actionModal.returnedBy || "").trim() ||
      !String(actionModal.returnedDate || "").trim() ||
      !String(actionModal.returnedReason || "").trim());

  const applyDisabled =
    isLoading ||
    isAllLocked ||
    (actionModal.activeTab === "release" && originalStatusCode === "R") ||
    (actionModal.activeTab === "return" && originalStatusCode === "X") ||
    (actionModal.activeTab === "return" && isReturnMissing);

  return (
    <div className="global-ref-main-div-ui">
      {showSpinner && <LoadingSpinner />}

      <div className="global-ref-header-ui">
        <div className="w-full flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="w-full md:w-auto flex md:justify-start">
            <h1 className="global-ref-headertext-ui w-full md:w-auto truncate text-center md:text-left">
              Check Releasing and Return
            </h1>
          </div>

          <div className="w-full md:w-auto flex md:justify-end">
            <div className="w-full md:w-auto overflow-visible">
              <div className="flex flex-nowrap items-center justify-center md:justify-end gap-2">
                <button
                  onClick={() => onAction("find")}
                  className="shrink-0 px-3 py-2 text-xs font-medium rounded-md text-white bg-blue-600 hover:opacity-90"
                >
                  <FontAwesomeIcon icon={faMagnifyingGlass} />
                  <span className="hidden lg:inline ml-2">Find</span>
                </button>

                <button
                  onClick={() => onAction("reset")}
                  className="shrink-0 px-3 py-2 text-xs font-medium rounded-md text-white bg-blue-600 hover:opacity-90"
                >
                  <FontAwesomeIcon icon={faUndo} />
                  <span className="hidden lg:inline ml-2">Reset</span>
                </button>

                <div className="relative shrink-0">
                  <button
                    onClick={() => onAction("guide")}
                    className="px-3 py-2 text-xs font-medium rounded-md text-white bg-blue-600 hover:opacity-90"
                  >
                    <FontAwesomeIcon icon={faInfoCircle} />
                    <span className="hidden lg:inline ml-2">Guide</span>
                  </button>

                  {guideOpen && (
                    <div className="absolute right-0 mt-2 w-40 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-[9999]">
                      <button
                        onClick={() =>
                          window.open("/public/NAYSA Check Releasing.pdf", "_blank")
                        }
                        className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100"
                      >
                        <FontAwesomeIcon icon={faFileLines} className="mr-2" />
                        PDF Guide
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div id="summary" className="global-ref-tab-div-ui">
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-gray-200">
            <section className="p-5">
              <h3 className="flex items-center gap-2 text-gray-800 font-semibold mb-4">
                <FontAwesomeIcon className="text-blue-600" icon={faUser} />
                Payee Details
              </h3>

              <div className="space-y-3">
                <FieldRenderer
                  type="lookup"
                  id="branchName"
                  name="branchName"
                  label="Branch"
                  value={branchName}
                  readOnly
                  disabled={isLoading}
                  onLookup={() => updateState({ showBranchModal: true })}
                />

                <FieldRenderer
                  type="lookup"
                  id="payeeCode"
                  name="payeeCode"
                  label="Payee Code"
                  value={payeeCode}
                  disabled={isLoading}
                  onChange={(e) =>
                    updateState({
                      payeeCode: e.target.value,
                      payeeName: "",
                    })
                  }
                  onLookup={() => updateState({ showPayeeModal: true })}
                />

                <FieldRenderer
                  type="text"
                  id="payeeName"
                  name="payeeName"
                  label="Payee Name"
                  value={payeeName}
                  readOnly
                  disabled
                />
              </div>
            </section>

            <section className="p-5">
              <h3 className="flex items-center gap-2 text-gray-800 font-semibold mb-4">
                <FontAwesomeIcon className="text-blue-600" icon={faCalendarAlt} />
                Date Range Info
              </h3>

              <div className="space-y-3">
                <div className="relative">
                  <div className="global-ref-textbox-ui">
                    <DateFormatInput
                      id="startDate"
                      name="startDate"
                      value={startDate || ""}
                      updateState={updateState}
                      disabled={isLoading}
                      className="peer w-full bg-transparent outline-none pr-10"
                    />
                  </div>
                  <label htmlFor="startDate" className="global-ref-floating-label">
                    Starting Date
                  </label>
                </div>

                <div className="relative">
                  <div className="global-ref-textbox-ui">
                    <DateFormatInput
                      id="endDate"
                      name="endDate"
                      value={endDate || ""}
                      updateState={updateState}
                      disabled={isLoading}
                      className="peer w-full bg-transparent outline-none pr-10"
                    />
                  </div>
                  <label htmlFor="endDate" className="global-ref-floating-label">
                    Ending Date
                  </label>
                </div>

                <FieldRenderer
                  type="select"
                  id="status"
                  name="status"
                  label="Check Status"
                  value={status}
                  disabled={isLoading}
                  onChange={(value) => updateState({ status: value })}
                  options={[
                    { value: "ALL", label: "All" },
                    { value: "U", label: "U - UnReleased" },
                    { value: "R", label: "R - Released" },
                    { value: "H", label: "H - Hold" },
                    { value: "X", label: "X - Returned" },
                    { value: "V", label: "V - Reversed" },
                    { value: "S", label: "S - Stale" },
                  ]}
                />
              </div>
            </section>

            <section className="p-5">
              <h3 className="flex items-center gap-2 text-gray-800 font-semibold mb-4">
                <FontAwesomeIcon className="text-blue-600" icon={faFileLines} />
                Status Summary
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                <div className={summaryCardClass}>
                  <div className={summaryLabelClass}>U - UnReleased</div>
                  <div className={summaryValueClass}>{countU}</div>
                </div>

                <div className={summaryCardClass}>
                  <div className={summaryLabelClass}>R - Released</div>
                  <div className={summaryValueClass}>{countR}</div>
                </div>

                <div className={summaryCardClass}>
                  <div className={summaryLabelClass}>H - Hold</div>
                  <div className={summaryValueClass}>{countH}</div>
                </div>

                <div className={summaryCardClass}>
                  <div className={summaryLabelClass}>X - Returned</div>
                  <div className={summaryValueClass}>{countX}</div>
                </div>

                <div className={summaryCardClass}>
                  <div className={summaryLabelClass}>V - Reversed</div>
                  <div className={summaryValueClass}>{countV}</div>
                </div>

                <div className={summaryCardClass}>
                  <div className={summaryLabelClass}>S - Stale</div>
                  <div className={summaryValueClass}>{countS}</div>
                </div>

                <div className="col-span-2 md:col-span-3 border rounded-lg px-3 py-3 bg-slate-100 flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Grand Total</span>
                  <span className="text-base font-bold text-slate-900 text-right tabular-nums">
                    {grandTotal}
                  </span>
                </div>
              </div>
            </section>

            



          </div>
        </div>
      </div>

      <div className="global-tran-tab-div-ui">
        <div className="global-tran-tab-nav-ui">
          <div className="flex flex-row sm:flex-row">
            <button className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">
              Detailed
            </button>
          </div>
        </div>

        <div className="global-tran-table-main-div-ui">
          <SearchGlobalReportTable
            ref={tableRef}
            docType={EXPORT_FILE_NAME}
            columns={colsWithActions}
            data={rows}
            itemsPerPage={50}
            rightActionLabel="View"
            onRowAction={(row) => {
              const url = `${window.location.origin}${row.pathUrl}`;
              window.open(url, "_blank", "noopener,noreferrer");
            }}
            onRowActionsClick={handleRowActionsClick}
          />
        </div>
      </div>

      {showReversalModal && (
        <GlobalGLPostingModalv1
          data={rows}
          colConfigData={cols}
        title="Finalize CWT Reversal"
          btnCaption="Generate & Post Reversal"
          userPassword={userPassword}
          onClose={() => updateState({ showReversalModal: false })}
          remoteLoading={isLoading}
          onViewDocument={(row) => {
            const url = `${window.location.origin}${row.pathUrl}`;
            window.open(url, "_blank", "noopener,noreferrer");
          }}
        />
      )}

     {actionModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-2 sm:px-0">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-lg p-4">
            {/* Header with document info */}
            <div className="mb-3 border-b pb-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <FontAwesomeIcon icon={faFileLines} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-800">
                      Update Check Status
                    </p>
                    <p className="text-[11px] text-gray-500">
                      Apply status and remarks for this document.
                    </p>
                  </div>
                </div>

                {/* Status pill */}
                <span
                  className={`px-2 py-1 rounded-full text-[10px] font-semibold ${
                    originalStatusCode === "R"
                      ? "bg-blue-100 text-blue-700"
                      : originalStatusCode === "H"
                      ? "bg-red-100 text-red-700"
                      : originalStatusCode === "X"
                      ? "bg-gray-100 text-gray-700"
                      : originalStatusCode === "V"
                      ? "bg-purple-100 text-purple-700"
                      : originalStatusCode === "S"
                      ? "bg-black/10 text-black"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  {originalStatusCode === "R"
                    ? "🔵 Released"
                    : originalStatusCode === "H"
                    ? "🔴 Hold"
                    : originalStatusCode === "X"
                    ? "⚪ Returned"
                    : originalStatusCode === "V"
                    ? "🟣 Reversed"
                    : originalStatusCode === "S"
                    ? "⚫ Stale"
                    : "🟢 UnReleased"}
                </span>
              </div>

              {/* Doc info row - compressed */}
              <div className="mt-2 grid grid-cols-3 gap-2 text-[10px]">
                <div>
                  <div className="uppercase tracking-wide text-gray-400">Branch</div>
                  <div className="font-mono text-gray-800 text-[11px]">
                    {selectedRow.branchCode || "—"}
                  </div>
                </div>
                <div>
                  <div className="uppercase tracking-wide text-gray-400">Doc</div>
                  <div className="font-mono text-gray-800 text-[11px]">
                    {selectedRow.docCode || "—"}
                  </div>
                </div>
                <div>
                  <div className="uppercase tracking-wide text-gray-400">No.</div>
                  <div className="font-mono text-gray-800 text-[11px]">
                    {selectedRow.docNo || "—"}
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs for Releasing / Returned Info */}
            <div className="mb-3 border-b border-gray-200">
              <div className="flex text-[11px]">
                <button
                  type="button"
                  onClick={() =>
                    setActionModal((prev) => ({
                      ...prev,
                      activeTab: "release",
                    }))
                  }
                  className={`px-3 py-2 border-b-2 ${
                    actionModal.activeTab === "release"
                      ? "border-blue-600 text-blue-700 font-semibold"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Releasing Info
                </button>

                {showReturnTab && (
                  <button
                    type="button"
                    onClick={() =>
                      setActionModal((prev) => ({
                        ...prev,
                        activeTab: "return",
                      }))
                    }
                    className={`px-3 py-2 border-b-2 ${
                      actionModal.activeTab === "return"
                        ? "border-blue-600 text-blue-700 font-semibold"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Returned Info
                  </button>
                )}
              </div>
            </div>

            {/* Body fields - Releasing Info */}
            {actionModal.activeTab === "release" && (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Status */}
                  <div>
                    <label className="block mb-1 text-gray-700">Status</label>
                    <select
                      value={actionModal.status}
                      onChange={(e) => {
                        const newStatus = e.target.value;
                        setActionModal((prev) => ({
                          ...prev,
                          status: newStatus,
                          receivedDate:
                            normalizeStatusCode(newStatus) === "H"
                              ? ""
                              : prev.receivedDate || useGetCurrentDayV2(),
                        }));
                      }}
                      disabled={isReleaseTabLocked}
                      className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
                    >
                      <option value="R">R - Released</option>
                      <option value="H">H - Hold</option>
                    </select>
                  </div>

                  {/* Received Date */}
                  <div>
                    <label className="block mb-1 text-gray-700">Received Date</label>
                    <input
                      type="date"
                      value={actionModal.receivedDate || ""}
                      onChange={(e) =>
                        setActionModal((prev) => ({
                          ...prev,
                          receivedDate: e.target.value,
                        }))
                      }
                      readOnly={isReleaseTabLocked}
                      className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Released By */}
                  <div>
                    <label className="block mb-1 text-gray-700">Released By</label>
                    <input
                      type="text"
                      value={actionModal.releasedBy}
                      onChange={(e) =>
                        setActionModal((prev) => ({
                          ...prev,
                          releasedBy: e.target.value,
                        }))
                      }
                      readOnly={isReleaseTabLocked}
                      className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Received By */}
                  <div>
                    <label className="block mb-1 text-gray-700">Received By</label>
                    <input
                      type="text"
                      value={actionModal.receivedBy}
                      onChange={(e) =>
                        setActionModal((prev) => ({
                          ...prev,
                          receivedBy: e.target.value,
                        }))
                      }
                      readOnly={isReleaseTabLocked}
                      className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Invoice No */}
                <div>
                  <label className="block mb-1 text-gray-700">Invoice No</label>
                  <input
                    type="text"
                    value={actionModal.invoiceNo}
                    onChange={(e) =>
                      setActionModal((prev) => ({
                        ...prev,
                        invoiceNo: e.target.value,
                      }))
                    }
                    readOnly={isReleaseTabLocked}
                    className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
                    placeholder="Enter invoice number..."
                  />
                </div>

                {/* Extended Remarks */}
                <div>
                  <label className="block mb-1 text-gray-700">
                    Extended Remarks{" "}
                    {normalizeStatusCode(actionModal.status) === "H" && (
                      <span className="text-red-500">*</span>
                    )}
                  </label>
                  <textarea
                    rows={2}
                    value={actionModal.remarks}
                    onChange={(e) =>
                      setActionModal((prev) => ({
                        ...prev,
                        remarks: e.target.value,
                      }))
                    }
                    readOnly={isReleaseTabLocked}
                    className={`w-full border rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500 resize-none ${
                      isRemarksRequired ? "border-red-500" : ""
                    }`}
                    placeholder="Enter remarks..."
                  />
                  {isRemarksRequired && !isReleaseTabLocked && (
                    <p className="mt-1 text-[10px] text-red-500">
                      Remarks is required when status is HOLD.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Body fields - Returned Info */}
            {actionModal.activeTab === "return" && showReturnTab && (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Returned Status */}
                  <div>
                    <label className="block mb-1 text-gray-700">Status</label>
                    <input
                      type="text"
                      value="Returned"
                      readOnly
                      className="w-full border rounded px-2 py-1 text-xs bg-gray-100 text-gray-700 cursor-not-allowed"
                    />
                  </div>

                  {/* Returned Date */}
                  <div>
                    <label className="block mb-1 text-gray-700">
                      Returned Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={actionModal.returnedDate || ""}
                      onChange={(e) =>
                        setActionModal((prev) => ({
                          ...prev,
                          returnedDate: e.target.value,
                        }))
                      }
                      disabled={isAllLocked}
                      className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500 disabled:bg-gray-100"
                    />
                  </div>

                  {/* Returned By */}
                  <div>
                    <label className="block mb-1 text-gray-700">
                      Returned By <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={actionModal.returnedBy}
                      onChange={(e) =>
                        setActionModal((prev) => ({
                          ...prev,
                          returnedBy: e.target.value,
                        }))
                      }
                      disabled={isAllLocked}
                      className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500 disabled:bg-gray-100"
                      placeholder="Enter name..."
                    />
                  </div>

                  {/* Reason */}
                  <div className="sm:col-span-2">
                    <label className="block mb-1 text-gray-700">
                      Reason <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={2}
                      value={actionModal.returnedReason}
                      onChange={(e) =>
                        setActionModal((prev) => ({
                          ...prev,
                          returnedReason: e.target.value,
                        }))
                      }
                      disabled={isAllLocked}
                      className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500 resize-none disabled:bg-gray-100"
                      placeholder="Enter reason for returning the check..."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Footer buttons */}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleActionModalCancel}
                className="px-3 py-1.5 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleActionModalApply}
                className="px-3 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                disabled={applyDisabled}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {showBranchModal && (
        <BranchLookupModal
          isOpen={showBranchModal}
          onClose={(selectedBranch) => {
            if (selectedBranch) {
              updateState({
                branchCode: selectedBranch.branchCode,
                branchName: selectedBranch.branchName,
                allRows: [],
                rows: [],
              });
            }
            updateState({ showBranchModal: false });
          }}
        />
      )}

      {showPayeeModal && (
        <PayeeMastLookupModal
          isOpen={showPayeeModal}
          onClose={(selectedPayee) => {
            if (selectedPayee) {
              updateState({
                payeeCode: selectedPayee.vendCode || selectedPayee.payeeCode || "",
                payeeName: selectedPayee.vendName || selectedPayee.payeeName || "",
                allRows: [],
                rows: [],
              });
            }
            updateState({ showPayeeModal: false });
          }}
        />
      )}
    </div>
  );
}
