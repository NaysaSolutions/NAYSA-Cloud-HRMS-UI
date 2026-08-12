
import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  X,
  ShieldCheck,
  CalendarRange,
  LockKeyhole,
  Eye,
  EyeOff,
  FileSpreadsheet,
  TriangleAlert,
  CheckCircle2,
  Loader2,
  Building2,
  ChevronsRight,
  FileText,
} from "lucide-react";

import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import {
  useSwalErrorAlert,
  useSwalSuccessAlert,
  useSwalWarningAlert,
  useSwalInfoAlert,
  useSwalConfirmAlert,
} from "@/NAYSA Cloud/Global/behavior.jsx";
import { useSelectedHSColConfig } from "@/NAYSA Cloud/Global/selectedData";
import { exportGenericHistoryExcel } from "@/NAYSA Cloud/Global/report";
import BranchSelectionModal from "@/NAYSA Cloud/Lookup/SearchMBranchRef.jsx";

const DEFAULT_VALIDATION_MESSAGE =
  "Select branch(es) and cut off range, then click Check Transactions.";

const compareCutOffValues = (left, right) =>
  String(left || "").localeCompare(String(right || ""), undefined, {
    numeric: true,
    sensitivity: "base",
  });

const YearendGLProcessingModal = ({
  isOpen,
  onClose,
  defaultStartCutOff = "",
  defaultEndCutOff = "",
  onProcessed,
}) => {
  const [mounted, setMounted] = useState(false);
  const { companyInfo, currentUserRow } = useAuth();

  const swalError = useSwalErrorAlert;
  const swalSuccess = useSwalSuccessAlert;
  const swalWarning = useSwalWarningAlert;
  const swalInfo = useSwalInfoAlert;
  const swalConfirm = useSwalConfirmAlert;

  const [selectedBranches, setSelectedBranches] = useState([]);
  const [startCutOff, setStartCutOff] = useState(defaultStartCutOff || "");
  const [endCutOff, setEndCutOff] = useState(defaultEndCutOff || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [excelGenerated, setExcelGenerated] = useState(false);
  const [proformaGenerated, setProformaGenerated] = useState(false);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [showAllBranches, setShowAllBranches] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    setPassword("");
    setShowPassword(false);
    setExcelGenerated(false);
    setProformaGenerated(false);
    setShowAllBranches(false);
  }, [isOpen, currentUserRow]);

  useEffect(() => {
    if (!isOpen) return;

    const applySwalFix = () => {
      const containers = document.querySelectorAll(".swal2-container");
      containers.forEach((el) => {
        el.style.zIndex = "20000";
        el.style.background = "transparent";
      });

      const backdrops = document.querySelectorAll(".swal2-backdrop-show");
      backdrops.forEach((el) => {
        el.style.background = "transparent";
      });

      const shown = document.querySelectorAll(".swal2-shown");
      shown.forEach((el) => {
        if (el instanceof HTMLElement) {
          el.style.paddingRight = "";
        }
      });
    };

    applySwalFix();

    const observer = new MutationObserver(() => {
      applySwalFix();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style"],
    });

    return () => observer.disconnect();
  }, [isOpen]);

  const parseApiResult = (response) => {
    const rawResult =
      response?.data?.data?.[0]?.result ??
      response?.data?.data?.result ??
      response?.data?.result ??
      null;

    if (!rawResult) return [];

    if (Array.isArray(rawResult)) return rawResult;

    if (typeof rawResult === "string") {
      try {
        const parsed = JSON.parse(rawResult);
        return Array.isArray(parsed) ? parsed : parsed ? [parsed] : [];
      } catch (error) {
        console.error("Failed to parse API result:", error);
        return [];
      }
    }

    if (typeof rawResult === "object") {
      return Array.isArray(rawResult) ? rawResult : [rawResult];
    }

    return [];
  };

  // =========================================================
  // LOAD CUT OFF
  // =========================================================
  const {
    data: cutOffData = [],
    isLoading: isLoadingCutOff,
    refetch: refetchCutOff,
  } = useQuery({
    queryKey: ["yearend-gl-cutoff-list"],
    enabled: isOpen,
    queryFn: async () => {
      const { data: response } = await apiClient.get("/lookupCutOff", {
        params: { PARAMS: "YearendStat" },
      });

      const rawResult =
        response?.data?.[0]?.result ||
        response?.data?.data?.[0]?.result ||
        null;

      const parsedRows = rawResult ? JSON.parse(rawResult) : [];

      return Array.isArray(parsedRows)
        ? parsedRows
            .map((item) => ({
              value: item.cutoffCode ?? "",
              label: item.cutoffName ?? "",
            }))
            .sort((left, right) =>
              compareCutOffValues(left.value, right.value)
            )
        : [];
    },
    onSuccess: (rows) => {
      if (!startCutOff && defaultStartCutOff) {
        setStartCutOff(defaultStartCutOff);
      } else if (!startCutOff && rows.length > 0) {
        setStartCutOff(rows[0].value);
      }

      if (!endCutOff && defaultEndCutOff) {
        setEndCutOff(defaultEndCutOff);
      } else if (!endCutOff && rows.length > 0) {
        setEndCutOff(rows[rows.length - 1].value);
      }
    },
    onError: async (error) => {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Unable to load cut off list.";

      await swalError("Load Cut Off Failed", message);
    },
  });

  // =========================================================
  // LOAD BRANCHES
  // =========================================================
  const {
    data: branchData = [],
    isLoading: isLoadingBranch,
  } = useQuery({
    queryKey: ["yearend-gl-branch-list"],
    enabled: isOpen,
    queryFn: async () => {
      const { data: result } = await apiClient.get("/lookupBranch", {
        params: {
          PARAMS: JSON.stringify({
            search: "",
            page: 1,
            pageSize: 9999,
          }),
        },
      });

      let parsedRows = [];

      try {
        parsedRows =
          Array.isArray(result?.data) && result.data[0]?.result
            ? JSON.parse(result.data[0].result)
            : [];
      } catch (err) {
        console.error("Failed to parse branch lookup result:", err);
        parsedRows = [];
      }

      return Array.isArray(parsedRows)
        ? parsedRows.map((item) => ({
            value: item.branchCode ?? "",
            label: item.branchName ?? "",
            raw: item,
          }))
        : [];
    },
    onError: async (error) => {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Unable to load branch list.";

      await swalError("Load Branch Failed", message);
    },
  });

  // =========================================================
  // COMPUTED VALUES
  // =========================================================
  const selectedBranchItems = useMemo(() => {
    const map = new Map(branchData.map((item) => [item.value, item]));
    return selectedBranches.map(
      (code) => map.get(code) || { value: code, label: code }
    );
  }, [selectedBranches, branchData]);

  const selectedBranchLabels = useMemo(() => {
    return selectedBranchItems.map((item) => item.label || item.value);
  }, [selectedBranchItems]);

  const selectedBranchSummary = useMemo(() => {
    if (selectedBranchItems.length === 0) return "No branches selected";
    return selectedBranchItems
      .slice(0, 3)
      .map((item) => item.label)
      .join(", ");
  }, [selectedBranchItems]);

  const startCutOffLabel = useMemo(() => {
    const found = cutOffData.find((item) => item.value === startCutOff);
    return found?.label || startCutOff || "";
  }, [cutOffData, startCutOff]);

  const endCutOffLabel = useMemo(() => {
    const found = cutOffData.find((item) => item.value === endCutOff);
    return found?.label || endCutOff || "";
  }, [cutOffData, endCutOff]);

  const authorizationBranchText = useMemo(() => {
    if (selectedBranchItems.length === 0) return "-";

    if (selectedBranchItems.length <= 2) {
      return selectedBranchItems.map((item) => item.label).join(", ");
    }

    if (showAllBranches) {
      return selectedBranchItems.map((item) => item.label).join(", ");
    }

    return `${selectedBranchItems
      .slice(0, 2)
      .map((item) => item.label)
      .join(", ")} + more branches...`;
  }, [selectedBranchItems, showAllBranches]);

  const hasMoreThanTwoBranches = selectedBranchItems.length > 2;

  const resetValidationState = () => {
    setPassword("");
    setShowPassword(false);
    setExcelGenerated(false);
    setProformaGenerated(false);
    setShowAllBranches(false);
    countOpenTransactionsMutation.reset();
  };

  const handleApplyBranches = (branches) => {
    setSelectedBranches(branches);
    resetValidationState();
  };

  const handleStartCutOffChange = (e) => {
    setStartCutOff(e.target.value);
    resetValidationState();
  };

  const handleEndCutOffChange = (e) => {
    setEndCutOff(e.target.value);
    resetValidationState();
  };

  // =========================================================
  // CHECK TRANSACTIONS
  // =========================================================
  const countOpenTransactionsMutation = useMutation({
    mutationFn: async () => {

    const branches = Array.isArray(selectedBranches)
            ? selectedBranches.join(",")
            : selectedBranches || "";

      const response = await apiClient.get("/getUnpostedperMonth", {
        params: {
          json_data: {
            json_data: {
              branchCodes: selectedBranches,
              startCutOff,
              endCutOff,
              branches,
              unpostedMode:"YE"
            },
          },
        },
      });

      const rows = parseApiResult(response);
      const count = rows.length;

      return {
        rows,
        count,
        passed: count === 0,
        message:
          count > 0
            ? `${count} open/unposted transaction(s) found for the selected branch(es) and cut off range.`
            : "No open or unposted transactions were found. You may now generate Proforma and proceed to authorization.",
        fileName: `Open_Unposted_Transactions_${startCutOff || "Start"}_${endCutOff || "End"}.xlsx`,
      };
    },

    onSuccess: async (data) => {
      setExcelGenerated(false);
      setProformaGenerated(false);

      if ((data?.count ?? 0) > 0) {
        await swalInfo(
          "Transactions Found",
          `${data.count} open/unposted transaction(s) found. Please generate the Excel file.`
        );
      } else {
        await swalSuccess(
          "Validation Passed",
          "No open or unposted transactions found. You may now generate Proforma."
        );
      }
    },

    onError: async (error) => {
      setPassword("");
      setShowPassword(false);
      setExcelGenerated(false);
      setProformaGenerated(false);

      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Unable to count open transactions.";

      await swalError("Validation Failed", message);
    },
  });

  const validationResult = countOpenTransactionsMutation.data;
  const unpostedData = validationResult?.rows ?? [];
  const validationDone =
    countOpenTransactionsMutation.isSuccess ||
    countOpenTransactionsMutation.isError;
  const validationPassed = validationResult?.passed ?? false;
  const issueCount = validationResult?.count ?? 0;

  const validationMessage = countOpenTransactionsMutation.isPending
    ? "Checking transactions for the selected branch(es) and cut off range..."
    : countOpenTransactionsMutation.isError
    ? countOpenTransactionsMutation.error?.response?.data?.message ||
      countOpenTransactionsMutation.error?.message ||
      "Unable to count open transactions."
    : excelGenerated
    ? `${unpostedData.length} open/unposted transaction(s) exported successfully.`
    : proformaGenerated
    ? "Proforma generated successfully."
    : validationResult?.message || DEFAULT_VALIDATION_MESSAGE;

  const showGenerateExcel = validationDone && issueCount > 0;
  const showGenerateProforma = validationDone && issueCount === 0;
  const excelFileName =
    validationResult?.fileName ||
    `Open_Unposted_Transactions_${startCutOff || "Start"}_${endCutOff || "End"}.xlsx`;

  // =========================================================
  // EXPORT EXCEL
  // =========================================================
  const generateExcelMutation = useMutation({
    mutationFn: async (rowsFromMutation) => {
      const rows = Array.isArray(rowsFromMutation)
        ? rowsFromMutation
        : Array.isArray(unpostedData)
        ? unpostedData
        : [];

      if (!rows.length) {
        throw new Error("No open/unposted transactions found to export.");
      }


      const dynamicColumns = await useSelectedHSColConfig(
        "getUnpostedperBranchCutoffRange"
      );

      const exportData = {
        Data: {
          "Unposted Transactions": rows,
        },
      };

      const columnConfigsMap = {
        "Unposted Transactions": dynamicColumns,
      };

      const payload = {
        ReportName: `Year-End GL Open Transactions - ${
          startCutOffLabel || startCutOff || ""
        } to ${endCutOffLabel || endCutOff || ""}`,
        UserCode:currentUserRow?.userCode || "",
        Branch: selectedBranchLabels.join(", "),
        JsonData: exportData,
        companyName: companyInfo?.compName || "",
        companyAddress: companyInfo?.compAddr || "",
        companyTelNo: companyInfo?.telNo || "",
        FileName: excelFileName,
      };

      await exportGenericHistoryExcel(payload, columnConfigsMap);

      return {
        rowCount: rows.length,
      };
    },

    onSuccess: async (result) => {
      setExcelGenerated(true);

      await swalSuccess(
        "Excel Generated",
        `${result?.rowCount || 0} open/unposted transaction(s) exported successfully.`
      );
    },

    onError: async (error) => {
      setExcelGenerated(false);

      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Unable to generate Excel file.";

      await swalError("Excel Generation Failed", message);
    },
  });

  // =========================================================
  // GENERATE PROFORMA
  // =========================================================
 
  const generateProformaMutation = useMutation({
  mutationFn: async () => {

    const branches = Array.isArray(selectedBranches)
    ? selectedBranches.join(",")
    : selectedBranches || "";

    const response = await apiClient.get("/getYearEndProforma", {
      params: {
        json_data: {
          json_data: {
            branches,
            startCutOff,
            endCutOff,
            userCode: currentUserRow?.userCode || "",
          },
        },
      },
    });

  
    const result = response?.data.data;
    let rows = [];

    try {
      rows = JSON.parse(result?.[0]?.result || "[]");
    } catch (error) {
      console.error("Failed to parse Year-End Proforma result:", error);
      rows = [];
    }



    if (!Array.isArray(rows) || !rows.length) {
      throw new Error("No data found to export for Year-End Proforma.");
    }

   

    const dynamicColumns = await useSelectedHSColConfig("getYearEndProforma");
    const exportData = {
      Data: {
        "Year-End Proforma": rows,
      },
    };

    const columnConfigsMap = {
      "Year-End Proforma": dynamicColumns,
    };

    const payload = {
      ReportName: `Year-End Proforma - ${
        startCutOffLabel || startCutOff || ""
      } to ${endCutOffLabel || endCutOff || ""}`,
      UserCode: currentUserRow?.userCode || "",
      Branch: selectedBranchLabels.join(", "),
      JsonData: exportData,
      companyName: companyInfo?.compName || "",
      companyAddress: companyInfo?.compAddr || "",
      companyTelNo: companyInfo?.telNo || "",
      FileName: excelFileName,
    };

    await exportGenericHistoryExcel(payload, columnConfigsMap);

    return {
      rowCount: rows.length,
    };
  },

  onSuccess: async (result) => {
    setProformaGenerated(true);

    await swalSuccess(
      "Proforma Generated",
      `${result?.rowCount || 0} proforma record(s) exported successfully.`
    );
  },

  onError: async (error) => {
    setProformaGenerated(false);

    const message =
      error?.response?.data?.message ||
      error?.message ||
      "Unable to generate Proforma file.";

    await swalError("Proforma Generation Failed", message);
  },
});



  // =========================================================
  // FINAL PROCESSING
  // =========================================================
  const processMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post("/processGLYearEnd", {
        userCode: currentUserRow?.userCode || "",
        userPassword: password,
        json_data: {
          branchCodes: selectedBranches,
          startCutOff,
          endCutOff,
          userCode: currentUserRow?.userCode || "",
        },
      });

      return response?.data;
    },

    onSuccess: async () => {
      await swalSuccess(
        "Success",
        "Year-End GL processing completed successfully."
      );

      setPassword("");
      setShowPassword(false);
      setExcelGenerated(false);
      setProformaGenerated(false);
      setShowAllBranches(false);
      countOpenTransactionsMutation.reset();
      await refetchCutOff();
      onProcessed?.();
    },

    onError: async (error) => {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Unable to process yearend GL.";

      await swalError("Processing Failed", message);
    },
  });

  // =========================================================
  // FLAGS
  // =========================================================
  const isChecking = countOpenTransactionsMutation.isPending;
  const isGeneratingExcel = generateExcelMutation.isPending;
  const isGeneratingProforma = generateProformaMutation.isPending;
  const isProcessing = processMutation.isPending;
  const hasValidCutOffRange =
    !!startCutOff &&
    !!endCutOff &&
    compareCutOffValues(startCutOff, endCutOff) < 0;

  const canCheck =
    selectedBranches.length > 0 &&
    hasValidCutOffRange &&
    !isChecking &&
    !isGeneratingExcel &&
    !isGeneratingProforma &&
    !isProcessing &&
    !isLoadingCutOff;

  const passwordEnabled =
    validationPassed &&
    validationDone &&
    !isChecking &&
    !isGeneratingExcel &&
    !isGeneratingProforma &&
    !isProcessing;

  const canFinalOk =
    passwordEnabled &&
    proformaGenerated &&
    password.trim() !== "" &&
    !isProcessing;

  const currentUserName =
    currentUserRow?.userName ||
    currentUserRow?.userCode ||
    currentUserRow?.USER_NAME ||
    "";

  const handleCheckTransactions = async () => {
    if (!selectedBranches.length) {
      await swalWarning(
        "Missing Branch",
        "Please select at least one branch first."
      );
      return;
    }

    if (!startCutOff || !endCutOff) {
      await swalWarning(
        "Missing Cut Off",
        "Please select starting and ending cut off first."
      );
      return;
    }

    if (compareCutOffValues(startCutOff, endCutOff) >= 0) {
      await swalWarning(
        "Invalid Cut Off Range",
        "Starting cut off must be earlier than ending cut off. The two values cannot be the same."
      );
      return;
    }

    setPassword("");
    setShowPassword(false);
    setExcelGenerated(false);
    setProformaGenerated(false);
    countOpenTransactionsMutation.reset();
    countOpenTransactionsMutation.mutate();
  };

  const handleGenerateExcel = async () => {
    if (!showGenerateExcel || excelGenerated) return;
    generateExcelMutation.mutate();
  };

  const handleGenerateProforma = async () => {
    if (!showGenerateProforma || proformaGenerated) return;
    generateProformaMutation.mutate();
  };

  const handleFinalOk = async () => {
    if (!selectedBranches.length) {
      await swalWarning(
        "Missing Branch",
        "Please select at least one branch first."
      );
      return;
    }

    if (!startCutOff || !endCutOff) {
      await swalWarning(
        "Missing Cut Off",
        "Please select starting and ending cut off first."
      );
      return;
    }

    if (compareCutOffValues(startCutOff, endCutOff) >= 0) {
      await swalWarning(
        "Invalid Cut Off Range",
        "Starting cut off must be earlier than ending cut off. The two values cannot be the same."
      );
      return;
    }

    if (!validationDone) {
      await swalWarning(
        "Validation Required",
        "Please click Check Transactions first before proceeding."
      );
      return;
    }

    if (!validationPassed) {
      await swalWarning(
        "Validation Failed",
        "Processing cannot continue because open/unposted transactions still exist."
      );
      return;
    }

    if (!proformaGenerated) {
      await swalWarning(
        "Proforma Required",
        "Please generate and review the Year-End Proforma Excel file before processing."
      );
      return;
    }

    if (!password.trim()) {
      await swalWarning("Missing Password", "Please enter your password.");
      return;
    }

    const result = await swalConfirm(
      "Confirm Year-End GL Processing",
      `Branches: ${selectedBranchLabels.join(", ") || "-"}\nStarting Cut Off: ${
        startCutOffLabel || "-"
      }\nEnding Cut Off: ${
        endCutOffLabel || "-"
      }\n\nThis action will proceed with GL processing for the selected branch(es) and cut off range.`
    );

    if (!result?.isConfirmed) return;

    processMutation.mutate();
  };

  if (!mounted || !isOpen) return null;

  return ReactDOM.createPortal(
    <>
      <style>
        {`
          .swal2-container {
            z-index: 20000 !important;
            background: transparent !important;
          }

          .swal2-backdrop-show {
            background: transparent !important;
          }

          body.swal2-shown,
          html.swal2-shown {
            overflow: auto !important;
            padding-right: 0 !important;
          }
        `}
      </style>

      <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/20 p-2 sm:p-4 overflow-y-auto">
        <div className="w-full max-w-[96vw] sm:max-w-6xl bg-white rounded-t-2xl sm:rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh]">
          <div className="bg-blue-200 text-slate-800 px-3 sm:px-5 py-2.5 sm:py-3 border-b border-blue-300">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="sm:w-[18px] sm:h-[18px]" />
                  <h2 className="text-sm sm:text-lg font-semibold">
                    Year-End GL Processing
                  </h2>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-700 mt-0.5">
                  Select branches, validate cut off range, generate required files, then authorize processing.
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-md p-1 hover:bg-white/40 transition"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="px-2.5 sm:px-4 py-2.5 sm:py-3 space-y-3 bg-slate-50 overflow-y-auto">
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
            <div className="flex items-start gap-2.5">
                <TriangleAlert
                className="text-slate-500 mt-0.5 shrink-0"
                size={16}
                />
                <div>
                <div className="text-xs sm:text-sm font-semibold text-slate-800">
                    Reminder
                </div>
                <div className="text-[11px] sm:text-xs text-slate-600 mt-0.5 leading-5">
                    Select branch(es), choose the starting and ending cut off,
                    validate open or unposted transactions, generate the required file,
                    and then enter your password to proceed.
                </div>
                </div>
            </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1.65fr_.95fr] gap-3">
              <div className="space-y-3">
                {/* Branch Summary */}
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-3 py-2 border-b bg-slate-50">
                    <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs sm:text-sm">
                      <Building2 size={16} className="text-blue-600" />
                      Branch Selection
                    </div>
                  </div>

                  <div className="p-3 space-y-3">
                    <div className="rounded-lg border bg-slate-50 px-3 py-2.5">
                      <div className="text-[10px] sm:text-[11px] text-slate-500">
                        Selected Branches
                      </div>
                      <div className="mt-1 text-xs sm:text-sm text-slate-700">
                        {selectedBranchItems.length > 0 ? (
                          <>
                            <span className="font-semibold text-slate-800">
                              {selectedBranchItems.length}
                            </span>{" "}
                            branch(es) selected
                          </>
                        ) : (
                          "No branches selected"
                        )}
                      </div>
                      {selectedBranchItems.length > 0 && (
                        <div className="mt-1 text-[11px] text-slate-500 break-words">
                          {selectedBranchSummary}
                          {selectedBranchItems.length > 3
                            ? ` + ${selectedBranchItems.length - 3} more`
                            : ""}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-stretch sm:justify-end">
                    <button
                        type="button"
                        onClick={() => setShowBranchModal(true)}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-xs sm:text-sm font-medium text-white hover:bg-blue-700"
                    >
                        <ChevronsRight size={14} />
                        Select Branches
                    </button>
                    </div>

                  </div>
                </div>

                {/* Cutoff & Validation */}
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-3 py-2 border-b bg-slate-50">
                    <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs sm:text-sm">
                      <CalendarRange size={16} className="text-blue-600" />
                      Cut Off & Validation
                    </div>
                  </div>

                  <div className="p-3 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 mb-1">
                          Starting Cut Off
                        </label>
                        <select
                          value={startCutOff}
                          onChange={handleStartCutOffChange}
                          disabled={isLoadingCutOff}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-slate-100"
                        >
                          <option value="">
                            {isLoadingCutOff
                              ? "Loading Cut Off..."
                              : "Select Starting Cut Off"}
                          </option>
                          {cutOffData.map((item) => (
                            <option
                              key={item.value}
                              value={item.value}
                              disabled={
                                !!endCutOff &&
                                compareCutOffValues(item.value, endCutOff) >= 0
                              }
                            >
                              {item.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 mb-1">
                          Ending Cut Off
                        </label>
                        <select
                          value={endCutOff}
                          onChange={handleEndCutOffChange}
                          disabled={isLoadingCutOff}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-slate-100"
                        >
                          <option value="">
                            {isLoadingCutOff
                              ? "Loading Cut Off..."
                              : "Select Ending Cut Off"}
                          </option>
                          {cutOffData.map((item) => (
                            <option
                              key={item.value}
                              value={item.value}
                              disabled={
                                !!startCutOff &&
                                compareCutOffValues(item.value, startCutOff) <= 0
                              }
                            >
                              {item.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleCheckTransactions}
                        disabled={!canCheck}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-xs sm:text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isChecking ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            Checking...
                          </>
                        ) : (
                          <>
                            <FileSpreadsheet size={14} />
                            Check Transactions
                          </>
                        )}
                      </button>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[11px] sm:text-xs text-slate-700">
                    {validationMessage}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                      <div className="rounded-lg border bg-slate-50 px-3 py-2.5">
                        <div className="text-[10px] sm:text-[11px] text-slate-500">
                          Branch Count
                        </div>
                        <div className="mt-0.5 text-xs sm:text-sm font-semibold text-slate-800">
                          {selectedBranches.length}
                        </div>
                      </div>

                      <div className="rounded-lg border bg-slate-50 px-3 py-2.5">
                        <div className="text-[10px] sm:text-[11px] text-slate-500">
                          Start Cut Off
                        </div>
                        <div className="mt-0.5 text-xs sm:text-sm font-semibold text-slate-800 break-words">
                          {startCutOffLabel || "-"}
                        </div>
                      </div>

                      <div className="rounded-lg border bg-slate-50 px-3 py-2.5">
                        <div className="text-[10px] sm:text-[11px] text-slate-500">
                          End Cut Off
                        </div>
                        <div className="mt-0.5 text-xs sm:text-sm font-semibold text-slate-800 break-words">
                          {endCutOffLabel || "-"}
                        </div>
                      </div>

                      <div className="rounded-lg border bg-slate-50 px-3 py-2.5">
                        <div className="text-[10px] sm:text-[11px] text-slate-500">
                          Issue Count
                        </div>
                        <div className="mt-0.5 text-xs sm:text-sm font-semibold text-slate-800">
                          {validationDone ? issueCount : "-"}
                        </div>
                      </div>
                    </div>

                  {(showGenerateExcel || showGenerateProforma) && (
                        <div className="flex justify-stretch sm:justify-end">
                            {showGenerateExcel ? (
                            <button
                                type="button"
                                onClick={handleGenerateExcel}
                                disabled={isGeneratingExcel || excelGenerated}
                                className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-xs sm:text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                                excelGenerated
                                    ? "border border-slate-300 bg-slate-100 text-slate-500"
                                    : "bg-blue-600 text-white hover:bg-blue-700"
                                }`}
                            >
                                {isGeneratingExcel ? (
                                <>
                                    <Loader2 size={14} className="animate-spin" />
                                    Generating Excel...
                                </>
                                ) : excelGenerated ? (
                                <>
                                    <CheckCircle2 size={14} />
                                    Excel Generated
                                </>
                                ) : (
                                <>
                                    <FileSpreadsheet size={14} />
                                    Generate Excel File
                                </>
                                )}
                            </button>
                            ) : (
                            <button
                                type="button"
                                onClick={handleGenerateProforma}
                                disabled={isGeneratingProforma || proformaGenerated}
                                className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-xs sm:text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                                proformaGenerated
                                    ? "border border-slate-300 bg-slate-100 text-slate-500"
                                    : "bg-blue-600 text-white hover:bg-blue-700"
                                }`}
                            >
                                {isGeneratingProforma ? (
                                <>
                                    <Loader2 size={14} className="animate-spin" />
                                    Generating Proforma...
                                </>
                                ) : proformaGenerated ? (
                                <>
                                    <CheckCircle2 size={14} />
                                    Proforma Generated
                                </>
                                ) : (
                                <>
                                    <FileText size={14} />
                                    Generate Proforma
                                </>
                                )}
                            </button>
                            )}
                        </div>
                        )}

                    {!validationPassed && validationDone && (
                     <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-[11px] sm:text-xs text-slate-700">
                      Password remains disabled until no open or unposted
                      transactions are found for the selected branches and cut off range.
                    </div>
                    )}
                  </div>
                </div>
              </div>

              {/* RIGHT SIDE */}
              <div className="space-y-3">
                {/* Authorization */}
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-3 py-2 border-b bg-slate-50">
                    <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs sm:text-sm">
                      <LockKeyhole size={16} className="text-violet-600" />
                      Authorization
                    </div>
                  </div>

                  <div className="p-3 space-y-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">
                        Branches
                      </label>
                      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs sm:text-sm text-slate-700">
                        {authorizationBranchText}
                        {hasMoreThanTwoBranches && (
                          <button
                            type="button"
                            onClick={() => setShowAllBranches((prev) => !prev)}
                            className="ml-2 text-[11px] font-medium text-blue-600 hover:text-blue-700"
                          >
                            {showAllBranches ? "Hide" : "Show All"}
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">
                        User
                      </label>
                      <input
                        value={currentUserName}
                        readOnly
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs sm:text-sm text-slate-700"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">
                        Password
                      </label>

                      <div className="flex gap-2">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          disabled={!passwordEnabled}
                          placeholder={
                            passwordEnabled
                              ? "Enter your password"
                              : "Password disabled until validation passes"
                          }
                          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm text-slate-700 disabled:bg-slate-100 disabled:text-slate-400"
                        />

                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          disabled={!passwordEnabled}
                          className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                        >
                          {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>

                      <div className="mt-1.5 text-[10px] sm:text-[11px] text-slate-500 leading-4">
                        Password is enabled only after successful validation.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Processing Guide */}
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-3 py-2 border-b bg-slate-50">
                    <div className="text-slate-800 font-semibold text-xs sm:text-sm">
                      Processing Guide
                    </div>
                  </div>

                  <div className="p-3">
                    <ol className="space-y-2.5 text-[11px] sm:text-xs text-slate-700">
                      <li className="flex gap-2.5">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
                          1
                        </span>
                        <span>Select one or more branches.</span>
                      </li>
                      <li className="flex gap-2.5">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
                          2
                        </span>
                        <span>Select starting and ending cut off.</span>
                      </li>
                      <li className="flex gap-2.5">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
                          3
                        </span>
                        <span>Click Check Transactions to validate the range.</span>
                      </li>
                      <li className="flex gap-2.5">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
                          4
                        </span>
                        <span>
                          If Issue Count is zero, generate Proforma. If issues exist,
                          generate the Excel file.
                        </span>
                      </li>
                      <li className="flex gap-2.5">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
                          5
                        </span>
                        <span>Enter password and click Process</span>
                      </li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t bg-white px-2.5 sm:px-4 py-2.5 sm:py-3 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2.5">
            <div className="text-[10px] sm:text-[11px] text-slate-500">
              Only authorized users should perform Year-End GL Processing.
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  resetValidationState();
                  onClose?.();
                }}
                className="w-full sm:w-auto rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleFinalOk}
                disabled={!canFinalOk}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>Process</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <BranchSelectionModal
        isOpen={showBranchModal}
        onClose={() => setShowBranchModal(false)}
        branchData={branchData}
        selectedBranches={selectedBranches}
        onApply={handleApplyBranches}
        isLoading={isLoadingBranch}
      />
    </>,
    document.body
  );
};

export default YearendGLProcessingModal;
