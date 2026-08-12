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
  faChevronDown,
  faNoteSticky,
  faUndo,
  faDatabase,
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
import {
  formatNumber,
  parseFormattedNumber,
} from "@/NAYSA Cloud/Global/behavior.jsx";
import SearchGlobalReportTable from "@/NAYSA Cloud/Lookup/SearchGlobalReportTable.jsx";
import CustomerMastLookupModal from "@/NAYSA Cloud/Lookup/SearchCustMast";
import BranchLookupModal from "@/NAYSA Cloud/Lookup/SearchBranchRef";
import GlobalGLPostingModalv1 from "@/NAYSA Cloud/Lookup/SearchGlobalGLPostingv1.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import Swal from "sweetalert2";
import {
  useGetCurrentDay,
  useFormatToDate,
} from "@/NAYSA Cloud/Global/dates";
import { useSwalSuccessAlert,} from '@/NAYSA Cloud/Global/behavior';

const ENDPOINT = "getARCWLCLInquiry";

// --- Helper: build icon + text display string for status ---
function buildStatusDisplay(code) {
  const status = (code || "").toString().trim().toUpperCase();
  switch (status) {
    case "R":
      return "🔵 Received";
    case "O":
      return "🟢 Open";
    case "H":
      return "🔴 Hold";
    default:
      return status || "";
  }
}

export default function CWTMonitoring() {
  const { user, companyInfo, currentUserRow } = useAuth();
  const [userPassword, setUserPassword] = useState(null);
  // ----- Layout (fixed header bar) -----
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

  // ----- App state -----
  const [state, setState] = useState({
    branchCode: "",
    branchName: "",
    custCode: "",
    custName: "",

    // Date range & status
    startDate: "",
    endDate: "",
    status: "", // R / O / H

    rows: [],
    cols: [],

    baseAmount: "0.00",
    atcAmount: "0.00",

    // Journal Voucher header fields
    jvNo: "",
    jvDate: "",
    recvFromDate: "",
    recvToDate: "",

    showBranchModal: false,
    showCustomerModal: false,
    isLoading: false,
    showSpinner: false,
    guideOpen: false,

    // dropdown menus
    showGenerateMenu: false, // "Action" dropdown
    showReversalModal: false, // <-- NEW STATE FOR MODAL
  });

  const updateState = (u) => setState((p) => ({ ...p, ...u }));

  const {
    branchCode,
    branchName,
    custCode,
    custName,
    startDate,
    endDate,
    status,
    rows,
    cols,
    baseAmount,
    atcAmount,
    jvNo,
    jvDate,
    recvFromDate,
    recvToDate,
    showBranchModal,
    showCustomerModal,
    isLoading,
    showSpinner,
    guideOpen,
    showGenerateMenu,
    showReversalModal, // <-- DESTRUCTURE NEW STATE
  } = state;

  // 🔹 Modal state for Actions (status update, etc.)
  const [actionModal, setActionModal] = useState({
    open: false,
    row: null,
    status: "R",
    originalStatus: "",
    receivedBy: "",
    receivedDate: useFormatToDate(new Date()),
    remarks: "",
  });

  // Table ref
  const tableRef = useRef(null);

  // Spinner smoothing
  useEffect(() => {
    let t;
    if (isLoading) {
      t = setTimeout(() => updateState({ showSpinner: true }), 200);
    } else {
      updateState({ showSpinner: false });
    }
    return () => clearTimeout(t);
  }, [isLoading]);

  // Close Action menu when clicking outside
  const generateMenuRef = useRef(null);
  useEffect(() => {
    const onDocClick = (e) => {
      if (
        generateMenuRef.current &&
        !generateMenuRef.current.contains(e.target) &&
        showGenerateMenu
      ) {
        updateState({ showGenerateMenu: false });
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [showGenerateMenu]);

  // Load column config once
  const loadedColsRef = useRef(false);
  useEffect(() => {
    if (loadedColsRef.current) return;
    let alive = true;
    (async () => {
      try {
        const result = await useSelectedHSColConfig(ENDPOINT);
        if (!alive || !Array.isArray(result)) return;

        const mappedCols = result.map((c) => ({ ...c }));

        // 🔹 Find the status column and point it to docStatusView (icon + text)
        const statusCol =
          mappedCols.find((c) => c.key === "docStatus") ||
          mappedCols.find((c) => c.key === "doc_status");

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

  // 🔹 Inject actions config column (for gear button)
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

  // Defaults (company + user/branch)
  const loadDefaults = useCallback(async () => {
    updateState({ showSpinner: true });
    try {
      const [hsCompany, hsUser] = await Promise.all([
        useTopCompanyRow(),
        useTopUserRow(user?.USER_CODE),
      ]);

      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);




      const firstDayStr = useFormatToDate(firstDay);
      const todayStr = useFormatToDate(today);
      const lastDayStr = useFormatToDate(lastDay);

      updateState({
        startDate: firstDayStr,
        endDate: todayStr,
        recvFromDate: firstDayStr,
        recvToDate: todayStr,
        jvDate:lastDayStr
      });

      if (hsUser) {
        const hsBranch = await useTopBranchRow(hsUser.branchCode);
        updateState({
          branchCode: hsUser.branchCode,
          branchName: hsBranch?.branchName || hsUser.branchName,
        });
      }
    } catch (err) {
      console.error("Error loading defaults:", err);
    } finally {
      updateState({ showSpinner: false });
    }
  }, [user?.USER_CODE]);

  const handleReset = useCallback(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const firstDayStr = useFormatToDate(firstDay);
    const todayStr = useFormatToDate(today);
    const lastDayStr = useFormatToDate(lastDay);



    updateState({
      custCode: "",
      custName: "",
      rows: [],
      baseAmount: "0.00",
      atcAmount: "0.00",
      status: "",
      jvNo: "",
      jvDate: lastDayStr,
      recvFromDate: firstDayStr,
      recvToDate: todayStr,
      startDate: firstDayStr,
      endDate: todayStr,
    });
    tableRef.current?.clearAllState();
  }, []);

  // Compute summary totals (still computed, not displayed)
  const computeTotals = useCallback((list = []) => {
    if (!Array.isArray(list) || list.length === 0) {
      updateState({
        atcAmount: "0.00",
        baseAmount: "0.00",
      });
      return;
    }
    const acc = list.reduce(
      (a, r) => {
        a.atcAmount += parseFormattedNumber(r.atcAmt) || 0;
        a.baseAmount += parseFormattedNumber(r.baseAmt) || 0;
        return a;
      },
      { atcAmount: 0, baseAmount: 0 }
    );
    updateState({
      atcAmount: formatNumber(acc.atcAmount),
      baseAmount: formatNumber(acc.baseAmount),
    });
  }, []);

  // Find: load rows + decorate status
  const doFind = useCallback(async (stat=status) => {
    updateState({ isLoading: true });
    try {
      const resp = await fetchData(ENDPOINT, {
        json_data: {
          json_data: {
            branchCode,
            custCode,
            startDate,
            endDate,
            status: stat,
          },
        },
      });

      const parsed = resp?.data?.[0]?.result
        ? JSON.parse(resp.data[0].result)
        : [];
      const dt1 = parsed ?? [];

      const decorated = (Array.isArray(dt1) ? dt1 : []).map((r) => {
        const rawStatus = (r.docStatus || r.doc_status || "").toString();
        return {
          ...r,
          originalDocStatus: rawStatus, // keep original
          docStatusView: buildStatusDisplay(rawStatus), // icon + text
        };
      });

      updateState({
        rows: decorated,
      });

      computeTotals(decorated);
    } catch (e) {
      console.error("Find failed:", e);
    } finally {
      updateState({ isLoading: false });
    }
  }, [branchCode, custCode, startDate, endDate, status, computeTotals]);

  // Initial defaults
  useEffect(() => {
    if (!user?.USER_CODE) return;
    (async () => {
      await loadDefaults();
      await handleReset();
    })();
  }, [user?.USER_CODE, loadDefaults, handleReset]);

  // Export (single "Export" button)
  const doExport = useCallback(async () => {
    if (!Array.isArray(rows) || rows.length === 0) return;
    try {
      updateState({ isLoading: true });

      const exportData = {
        Data: {
          "CWT Inquiry Detailed": rows,
        },
      };

      const columnConfigsMap = {
        "CWT Inquiry Detailed": cols,
      };

      const payload = {
        ReportName: "CWT Inquiry Report",
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


// NEW: Action handlers for Reversal
const doLoadCWTReversal = useCallback(
  async (openModalAfter = false) => {
    // Basic validations
    if (!recvFromDate || !recvToDate) {
      await Swal.fire({
        icon: "warning",
        title: "Missing dates",
        text: "Please provide Received From Date and Received To Date.",
      });
      return;
    }

    if (recvFromDate > recvToDate) {
      await Swal.fire({
        icon: "error",
        title: "Invalid date range",
        text: "Received From Date cannot be greater than Received To Date.",
      });
      return;
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      await Swal.fire({
        icon: "info",
        title: "No data",
        text: "There are no records to filter. Please run Find first.",
      });
      return;
    }

    // Helper: check if date string is within range (yyyy-mm-dd)
    const isInRange = (dateStr) => {
      if (!dateStr) return false;
      const d = dateStr.substring(0, 10); // in case full datetime is returned
      if (recvFromDate && d < recvFromDate) return false;
      if (recvToDate && d > recvToDate) return false;
      return true;
    };

    const filtered = rows.filter((r) => {
      // Status: use originalDocStatus then fallbacks
      const rawStatus = (
        r.originalDocStatus ||
        r.docStatus ||
        r.doc_status ||
        ""
      )
        .toString()
        .trim()
        .toUpperCase();

      // JV No on the row should be blank
      const rowJV = (r.jvNo || r.jv_no || r.jvno || "")
        .toString()
        .trim();

      // Received date on the row (adjust field name as needed)
      const rowReceivedDate =
        r.receivedDate || r.received_date || r.recvDate || "";

      return (
        rawStatus === "R" &&
        rowJV === "" &&
        isInRange(rowReceivedDate)
      );
    });

    if (!filtered.length) {
      await Swal.fire({
        icon: "info",
        title: "No matching records",
        text: "No records found with status RECEIVED, no JV No, and within the given Received date range.",
      });
      return;
    }

    // Update table + totals + (optionally) open modal
    updateState({
      rows: filtered,
      showGenerateMenu: false,
      showReversalModal: openModalAfter, // ➜ open modal if called from Generate
    });
    computeTotals(filtered);


    if(!openModalAfter) {
       await Swal.fire({
      icon: "success",
      title: "CWT loaded for reversal",
      text: `${filtered.length} record(s) found and loaded based on the criteria.`,
      timer: 2000,
      showConfirmButton: false,
    });

    }
   

  },
  [rows, recvFromDate, recvToDate, computeTotals]
);



// NEW: Function to open the Global Posting Modal with the filtered data
const doGenerateCWTReversal = useCallback(
  async () => {
    // Must have base data (from Find)
    if (!Array.isArray(rows) || rows.length === 0) {
      await Swal.fire({
        icon: "info",
        title: "No data to generate",
        text: "Please run Find first to load records.",
      });
      return;
    }

    // Reuse same filter logic as 'Load CWT for Reversal'
    // but also open the modal afterwards
    await doLoadCWTReversal(true);
  },
  [rows, doLoadCWTReversal]
);



  // // NEW: Action handlers for Reversal
  // const doLoadCWTReversal = useCallback(async () => {
  //   // Basic validations
  //   if (!recvFromDate || !recvToDate) {
  //     await Swal.fire({
  //       icon: "warning",
  //       title: "Missing dates",
  //       text: "Please provide Received From Date and Received To Date.",
  //     });
  //     return;
  //   }

  //   if (recvFromDate > recvToDate) {
  //     await Swal.fire({
  //       icon: "error",
  //       title: "Invalid date range",
  //       text: "Received From Date cannot be greater than Received To Date.",
  //     });
  //     return;
  //   }

  //   if (!Array.isArray(rows) || rows.length === 0) {
  //     await Swal.fire({
  //       icon: "info",
  //       title: "No data",
  //       text: "There are no records to filter. Please run Find first.",
  //     });
  //     return;
  //   }

  //   // Helper: check if date string is within range (yyyy-mm-dd)
  //   const isInRange = (dateStr) => {
  //     if (!dateStr) return false;
  //     const d = dateStr.substring(0, 10); // in case full datetime is returned
  //     if (recvFromDate && d < recvFromDate) return false;
  //     if (recvToDate && d > recvToDate) return false;
  //     return true;
  //   };

  //   const filtered = rows.filter((r) => {
  //     // Status: use originalDocStatus then fallbacks
  //     const rawStatus = (
  //       r.originalDocStatus ||
  //       r.docStatus ||
  //       r.doc_status ||
  //       ""
  //     )
  //       .toString()
  //       .trim()
  //       .toUpperCase();

  //     // JV No on the row should be blank
  //     const rowJV = (r.jvNo || r.jv_no || r.jvno || "")
  //       .toString()
  //       .trim();

  //     // Received date on the row (adjust field name as needed)
  //     const rowReceivedDate =
  //       r.receivedDate || r.received_date || r.recvDate || "";

  //     return (
  //       rawStatus === "R" &&
  //       rowJV === "" &&
  //       isInRange(rowReceivedDate)
  //     );
  //   });

  //   if (!filtered.length) {
  //     await Swal.fire({
  //       icon: "info",
  //       title: "No matching records",
  //       text: "No records found with status RECEIVED, no JV No, and within the given Received date range.",
  //     });
  //     return;
  //   }

  //   // Update table + totals
  //   updateState({ rows: filtered }); // <--- Filtered data is stored here
  //   computeTotals(filtered);

  //   await Swal.fire({
  //     icon: "success",
  //     title: "CWT loaded for reversal",
  //     text: `${filtered.length} record(s) found and loaded based on the criteria.`,
  //     timer: 2000,
  //     showConfirmButton: false,
  //   });
  // }, [rows, recvFromDate, recvToDate, computeTotals]);




  // // NEW: Function to open the Global Posting Modal with the filtered data
  // const doGenerateCWTReversal = useCallback(async () => {
  //   // 🔹 Check if data is loaded and filtered
  //   if (!Array.isArray(rows) || rows.length === 0) {
  //     await Swal.fire({
  //       icon: "info",
  //       title: "No data to generate",
  //       text: "Please run 'Load CWT for Reversal' first to fetch and filter records.",
  //     });
  //     return;
  //   }

  //   // 🔹 Open the modal and close the dropdown menu
  //   updateState({
  //     showReversalModal: true,
  //     showGenerateMenu: false,
  //   });
  // }, [rows]);

  // ----- Action handlers (inline ActionBar) -----
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
      case "load-cwt-reversal":
        return doLoadCWTReversal();
      case "gen-cwt-reversal":
        return doGenerateCWTReversal();
      case "guide":
        return updateState({
          guideOpen: !guideOpen,
          showGenerateMenu: false,
        });
      case "pdf":
        return window.open("/public/NAYSA CWT Inquiry.pdf", "_blank");
      default:
        return;
    }
  };

  // 🔹 When gear/actions button is clicked in table → OPEN MODAL
  const handleRowActionsClick = useCallback(
    (row) => {
      const defaultUserName = user?.userName || currentUserRow?.userName || "";

      const rawStatus = (
        row?.originalDocStatus ||
        row?.docStatus ||
        row?.doc_status ||
        ""
      )
        .toString()
        .trim()
        .toUpperCase();

      const formattedDate = row?.receivedDate
        ? useFormatToDate(row.receivedDate)
        : useGetCurrentDay();

      // Initial status behavior:
      // - If original status is 'O' or blank → default to 'R'
      // - Else keep whatever the row has (R or H)
      const initialStatus =
        rawStatus === "O" || !rawStatus ? "R" : rawStatus;

      setActionModal({
        open: true,
        row,
        status: initialStatus,
        originalStatus: rawStatus || "",
        receivedBy: row?.receivedBy || defaultUserName,
        receivedDate: initialStatus === "H" ? "" : formattedDate,
        remarks: row?.extRemarks || "",
      });
    },
    [user?.userName, currentUserRow?.userName]
  );

  const handleActionModalCancel = () => {
    setActionModal((prev) => ({ ...prev, open: false, row: null }));
  };

  

  const handlePost = async (selectedData, userPw) => {
   
            updateState({ isLoading: true });
           
            try {

              const payload = {
                userCode : currentUserRow.userCode,
                userPassword: userPw,
                json_data: {
                 userCode : currentUserRow.userCode,
                 jvDate: jvDate,
                 branchCode:branchCode,
                  dt1: selectedData.map((groupId, idx) => ({
                    lnNo: idx + 1, // number (safer for SQL)
                    groupId,
                  })),
                },
                };
 
                const { data: res } = await apiClient.post("generateJVARCWLCL", payload);        
                if (res?.success) {

                 Swal.fire({
                      title: 'Success!',
                      text: 'Generate JV Completed',
                      icon: 'success',
                      timer: 2000, 
                      timerProgressBar: true,
                      showConfirmButton: false, 
                      didClose: () => {
                         updateState({ status: "O" });
                         doFind("O");
                      }
                  });             
                }
                    
              updateState({ showReversalModal: false });
          
           } catch (err) {
               const status = err?.response?.status;
               const data   = err?.response?.data || {};
               const code   = data.error || "";
               const msg    = data.message || "Something went wrong.";

                console.log(err)
           
               // --- Soft/business validation (do NOT logout) ---
               if (status === 422) {
                 if (code === "INVALID_CREDENTIALS") {
                   Swal.fire("Invalid password", msg || "Please try again.", "warning");
                   return { success: false, code, message: msg };
                 }
                 if (code === "MISSING_CREDENTIALS" || code === "VALIDATION_ERROR" || !data?.error) {
                   Swal.fire("Missing credentials", msg, "info");
                   return { success: false, code: code || "MISSING_CREDENTIALS", message: msg };
                 }
               }
           
               // --- True permission issues (still no auto-logout here; interceptor handles that globally) ---
               if (status === 403 && (code === "USER_INACTIVE" || code === "USER_MISMATCH")) {
                 const title = code === "USER_INACTIVE" ? "Blocked" : "Blocked";
                 const text  = code === "USER_INACTIVE" ? (msg || "User is inactive.") : "Authenticated user does not match userCode.";
                 Swal.fire(title, text, "warning");
                 return { success: false, code, message: text };
               }
           
               // Unknown errors
               Swal.fire("Error", msg, "error");
               return { success: false, code: code || "UNKNOWN", message: msg };

            } finally {
              updateState({ isLoading: false });
            }
  };



  const handleActionModalApply = async () => {
    if (!actionModal.row) {
      handleActionModalCancel();
      return;
    }

    const { row, status: newStatus, receivedBy, receivedDate, remarks } =
      actionModal;

    // Remarks mandatory when status = 'H'
    if (newStatus === "H" && !String(remarks || "").trim()) {
      await Swal.fire({
        icon: "warning",
        title: "Remarks required",
        text: "Remarks is required when status is set to HOLD.",
      });
      return;
    }

    try {
      updateState({ isLoading: true });

      const payload = {
        json_data: {
          tranId: row.tran_id, // <-- make sure this matches your key
          status: newStatus,
          receivedDate,
          receivedBy,
          remarks,
        },
      };

      console.log("updateARCWLCL payload:", JSON.stringify(payload, null, 2));

      const { data: res } = await apiClient.post("updateARCWLCL", payload);

      if (res?.status !== "success") {
        await Swal.fire(
          "CWT Receiving failed",
          res?.message ?? "CWT Receiving failed.",
          "error"
        );
        return;
      }

      // 🔹 Reload table (same as clicking Find)
      await doFind();

      // 🔹 Toaster
      await Swal.fire({
        icon: "success",
        title: "Receiving completed",
        text: "Document status has been updated successfully.",
        timer: 1800,
        showConfirmButton: false,
      });

      handleActionModalCancel();
    } catch (error) {
      console.error("Error updating CWT receiving:", error);
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
  const isLocked = actionModal.originalStatus === "R";
  const isRemarksRequired =
    actionModal.status === "H" && !String(actionModal.remarks || "").trim();

  return (
    <div className="global-tran-main-div-ui">
      {showSpinner && <LoadingSpinner />}

      {/* spacer below fixed bar */}
      <div style={{ height: barH }} />

      {/* Fixed header bar */}
      <div
        ref={barRef}
        className="fixed left-0 right-0 z-40 bg-white/95 backdrop-blur supports-backdrop-blur:bg-white/80 border-b shadow-sm"
        style={{ top: headerH }}
      >
        <div className="flex justify-between items-center px-6 py-2">
          {/* Single "tab" label */}
          <div className="flex flex-row gap-2">
            <span className="flex items-center px-3 py-2 rounded-md text-xs md:text-sm font-bold bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
              <FontAwesomeIcon icon={faDatabase} className="w-4 h-4 mr-2" />
              Creditable Witholding Tax Monitoring
            </span>
          </div>

          {/* Inline ActionBar */}
          <div className="flex flex-wrap items-center justify-end gap-1 lg:gap-2">
            <button
              onClick={() => onAction("find")}
              className="px-3 py-2 text-xs font-medium rounded-md text-white bg-blue-600 hover:opacity-90"
            >
              <FontAwesomeIcon icon={faMagnifyingGlass} />{" "}
              <span className="hidden lg:inline ml-2">Find</span>
            </button>

            <button
              onClick={() => onAction("reset")}
              className="px-3 py-2 text-xs font-medium rounded-md text-white bg-blue-600 hover:opacity-90"
            >
              <FontAwesomeIcon icon={faUndo} />{" "}
              <span className="hidden lg:inline ml-2">Reset</span>
            </button>

            {/* <button
              onClick={() => onAction("print")}
              className="px-3 py-2 text-xs font-medium rounded-md text-white bg-blue-600 hover:opacity-90"
            >
              <FontAwesomeIcon icon={faPrint} />{" "}
              <span className="hidden lg:inline ml-2">Print</span>
            </button> */}

            {/* EXPORT: simple button (no dropdown) */}
            {/* <button
              onClick={() => onAction("export-query")}
              className="px-3 py-2 text-xs font-medium rounded-md text-white bg-blue-600 hover:opacity-90 flex items-center"
            >
              <FontAwesomeIcon icon={faFileExport} />
              <span className="hidden lg:inline ml-2">Export</span>
            </button> */}

            {/* ACTION: dropdown */}
            <div className="relative" ref={generateMenuRef}>
              <button
                onClick={() =>
                  updateState({
                    showGenerateMenu: !showGenerateMenu,
                    guideOpen: false,
                  })
                }
                className="px-3 py-2 text-xs font-medium rounded-md text-white bg-blue-600 hover:opacity-90 flex items-center"
              >
                <FontAwesomeIcon icon={faFileLines} />
                <span className="hidden lg:inline ml-2">Action</span>
                <FontAwesomeIcon
                  icon={faChevronDown}
                  className="ml-2 text-[10px]"
                />
              </button>

              {showGenerateMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 dark:bg-gray-700 dark:ring-gray-600 z-50">
                  <button
                    onClick={() => onAction("load-cwt-reversal")}
                    className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600 flex items-center gap-2"
                  >
                    <FontAwesomeIcon
                      icon={faNoteSticky}
                      className="text-yellow-600"
                    />
                    <span>Load CWT for Reversal</span>
                  </button>
                  <button
                    onClick={() => onAction("gen-cwt-reversal")}
                    className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600 flex items-center gap-2"
                  >
                    <FontAwesomeIcon
                      icon={faNoteSticky}
                      className="text-yellow-600"
                    />
                    <span>Generate CWT Reversal</span>
                  </button>
                </div>
              )}
            </div>

            {/* Guide dropdown */}
            <div className="relative">
              <button
                onClick={() => onAction("guide")}
                className="px-3 py-2 text-xs font-medium rounded-md text-white bg-blue-600 hover:opacity-90"
              >
                <FontAwesomeIcon icon={faInfoCircle} />{" "}
                <span className="hidden lg:inline ml-2">Guide</span>
              </button>
              {guideOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 dark:bg-gray-700 dark:ring-gray-600">
                  <button
                    onClick={() => onAction("pdf")}
                    className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600"
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

      {/* Filters + JV Header */}
      <div id="summary" className="global-tran-tab-div-ui">
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-gray-200">
            {/* Customer Details */}
            <section className="p-5">
              <h3 className="flex items-center gap-2 text-gray-800 font-semibold mb-4">
                <FontAwesomeIcon className="text-blue-600" icon={faUser} />
                Customer Details
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
                  id="custCode"
                  name="custCode"
                  label="Customer Code"
                  value={custCode}
                  disabled={isLoading}
                  allowLookupInput
                  onChange={(value) =>
                    updateState({
                      custCode: value,
                      custName: "",
                    })
                  }
                  onLookup={() => updateState({ showCustomerModal: true })}
                />

                <FieldRenderer
                  type="text"
                  id="custName"
                  name="custName"
                  label="Customer Name"
                  value={custName}
                  readOnly
                  disabled
                />
              </div>
            </section>

            {/* Date Range + Status */}
            <section className="p-5">
              <h3 className="flex items-center gap-2 text-gray-800 font-semibold mb-4">
                <FontAwesomeIcon
                  className="text-blue-600"
                  icon={faCalendarAlt}
                />
                Date Range
              </h3>

              <div className="space-y-3">
                <FieldRenderer
                  type="date"
                  id="startDate"
                  name="startDate"
                  label="Starting Date"
                  value={startDate}
                  onChange={(value) => updateState({ startDate: value })}
                  disabled={isLoading}
                />

                <FieldRenderer
                  type="date"
                  id="endDate"
                  name="endDate"
                  label="Ending Date"
                  value={endDate}
                  onChange={(value) => updateState({ endDate: value })}
                  disabled={isLoading}
                />

                <FieldRenderer
                  type="select"
                  id="status"
                  name="status"
                  label="Check Status"
                  value={status}
                  onChange={(value) => updateState({ status: value })}
                  disabled={isLoading}
                  options={[
                    { value: "R", label: "R - Received" },
                    { value: "O", label: "O - Open" },
                    { value: "H", label: "H - Hold" },
                  ]}
                />
              </div>
            </section>

            {/* Journal Voucher */}
            <section className="p-5">
              <h3 className="flex items-center gap-2 text-gray-800 font-semibold mb-4">
                <FontAwesomeIcon
                  className="text-blue-600"
                  icon={faFileLines}
                />
                Journal Voucher
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FieldRenderer
                  type="text"
                  id="jvNo"
                  name="jvNo"
                  label="JV No."
                  value={jvNo}
                  onChange={(value) => updateState({ jvNo: value })}
                  disabled={isLoading}
                />

                <FieldRenderer
                  type="date"
                  id="jvDate"
                  name="jvDate"
                  label="JV Date"
                  value={jvDate}
                  onChange={(value) => updateState({ jvDate: value })}
                  disabled={isLoading}
                />

                <FieldRenderer
                  type="date"
                  id="recvFromDate"
                  name="recvFromDate"
                  label="Received from Date"
                  value={recvFromDate}
                  onChange={(value) => updateState({ recvFromDate: value })}
                  disabled={isLoading}
                />

                <FieldRenderer
                  type="date"
                  id="recvToDate"
                  name="recvToDate"
                  label="Received to Date"
                  value={recvToDate}
                  onChange={(value) => updateState({ recvToDate: value })}
                  disabled={isLoading}
                />
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Detailed Table ONLY */}
      <div className="global-tran-tab-div-ui">
        {/* <div className="global-tran-tab-nav-ui"> */}
          {/* <div className="flex flex-row sm:flex-row"> */}
            <button className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">
              Detailed
            </button>
          {/* </div> */}
        {/* </div> */}

      <div className="global-tran-table-main-div-ui mt-4">
          <div className="max-h-[600px] overflow-y-auto relative">
            <SearchGlobalReportTable
              docType={`CWT Monitoring`}
              ref={tableRef}
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
      </div>

      {/* NEW: Global Posting Modal for CWT Reversal */}
      {showReversalModal && (
        <GlobalGLPostingModalv1
          data={rows} // 👈 Passes the filtered data from the 'Load' step
          colConfigData={cols} // Passes the column configuration
        title="Finalize CWT Reversal"
          btnCaption="Generate & Post Reversal"
          userPassword={userPassword}
          onClose={() => updateState({ showReversalModal: false })}        
          onPost={handlePost}
          remoteLoading={isLoading}
          onViewDocument={(row) => {
            const url = `${window.location.origin}${row.pathUrl}`;
            window.open(url, "_blank", "noopener,noreferrer");
          }}
        />
      )}

      {/* Actions Modal (for single row status update) */}
      {actionModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-4">
            {/* Header with document info */}
            <div className="mb-3 border-b pb-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <FontAwesomeIcon
                      icon={faFileLines}
                      className="text-blue-600"
                    />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-800">
                      Update CWT Status
                    </p>
                    <p className="text-[11px] text-gray-500">
                      Apply status and remarks for this document.
                    </p>
                  </div>
                </div>

                {/* Status pill */}
                <span
                  className={`px-2 py-1 rounded-full text-[10px] font-semibold ${
                    actionModal.originalStatus === "R"
                      ? "bg-blue-100 text-blue-700"
                      : actionModal.originalStatus === "H"
                      ? "bg-red-100 text-red-700"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  {actionModal.originalStatus === "R"
                    ? "🔵 Received"
                    : actionModal.originalStatus === "H"
                    ? "🔴 Hold"
                    : "🟢 Open"}
                </span>
              </div>

              {/* Doc info row */}
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-gray-400">
                    Branch
                  </div>
                  <div className="font-mono text-gray-800">
                    {selectedRow.branchCode || "—"}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-gray-400">
                    Doc Code
                  </div>
                  <div className="font-mono text-gray-800">
                    {selectedRow.docCode || "—"}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-gray-400">
                    Document No.
                  </div>
                  <div className="font-mono text-gray-800">
                    {selectedRow.docNo || "—"}
                  </div>
                </div>
              </div>
            </div>

            {/* Body fields */}
            <div className="space-y-3 text-xs">
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
                        newStatus === "H"
                          ? ""
                          : prev.receivedDate || useGetCurrentDay(),
                    }));
                  }}
                  disabled={isLocked}
                  className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
                >
                  <option value="R">R - Received</option>
                  <option value="H">H - Hold</option>
                </select>
              </div>

              {/* Received By */}
              <div>
                <label className="block mb-1 text-gray-700">
                  Received By
                </label>
                <input
                  type="text"
                  value={actionModal.receivedBy}
                  onChange={(e) =>
                    setActionModal((prev) => ({
                      ...prev,
                      receivedBy: e.target.value,
                    }))
                  }
                  className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
                  readOnly={isLocked}
                />
              </div>

              {/* Received Date */}
              <div>
                <label className="block mb-1 text-gray-700">
                  Received Date
                </label>
                <input
                  type="date"
                  value={actionModal.receivedDate || ""}
                  onChange={(e) =>
                    setActionModal((prev) => ({
                      ...prev,
                      receivedDate: e.target.value,
                    }))
                  }
                  readOnly={isLocked}
                  className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Extended Remarks */}
              <div>
                <label className="block mb-1 text-gray-700">
                  Extended Remarks{" "}
                  {actionModal.status === "H" && (
                    <span className="text-red-500">*</span>
                  )}
                </label>
                <textarea
                  rows={4}
                  value={actionModal.remarks}
                  onChange={(e) =>
                    setActionModal((prev) => ({
                      ...prev,
                      remarks: e.target.value,
                    }))
                  }
                  readOnly={isLocked}
                  className={`w-full border rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500 resize-y ${
                    isRemarksRequired ? "border-red-500" : ""
                  }`}
                  placeholder="Enter remarks..."
                />
                {isRemarksRequired && (
                  <p className="mt-1 text-[10px] text-red-500">
                    Remarks is required when status is HOLD.
                  </p>
                )}
              </div>
            </div>

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
                disabled={isLoading || isLocked || isRemarksRequired}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lookup Modals */}
      {showBranchModal && (
        <BranchLookupModal
          isOpen={showBranchModal}
          onClose={(selectedBranch) => {
            if (selectedBranch) {
              updateState({
                branchCode: selectedBranch.branchCode,
                branchName: selectedBranch.branchName,
              });
            }
            updateState({ showBranchModal: false });
          }}
        />
      )}
      {showCustomerModal && (
        <CustomerMastLookupModal
          isOpen={showCustomerModal}
          onClose={(selectedCustomer) => {
            if (selectedCustomer) {
              updateState({
                custCode: selectedCustomer.custCode,
                custName: selectedCustomer.custName,
                baseAmount: "0.00",
                atcAmount: "0.00",
              });
            }
            updateState({ showCustomerModal: false });
          }}
        />
      )}
    </div>
  );
}
