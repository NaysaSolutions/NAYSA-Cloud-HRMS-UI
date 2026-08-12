

import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
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
  ChevronLeft,
  ChevronRight,
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

const DEFAULT_VALIDATION_MESSAGE =
  "Select a cut off, then click Check Transactions.";

const MonthendGLProcessingModal = ({
  isOpen,
  onClose,
  defaultCutOff = "",
  onProcessed,
}) => {
  const [mounted, setMounted] = useState(false);
  const { companyInfo, currentUserRow } = useAuth();

  const swalError = useSwalErrorAlert;
  const swalSuccess = useSwalSuccessAlert;
  const swalWarning = useSwalWarningAlert;
  const swalInfo = useSwalInfoAlert;
  const swalConfirm = useSwalConfirmAlert;

  const [selectedCutOff, setSelectedCutOff] = useState(defaultCutOff || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [excelGenerated, setExcelGenerated] = useState(false);
  const [mobileStep, setMobileStep] = useState("validation");

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    setPassword("");
    setShowPassword(false);
    setExcelGenerated(false);
    setMobileStep("validation");
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

    return () => {
      observer.disconnect();
    };
  }, [isOpen]);

  const parseApiResult = (response) => {
    const rawResult = response?.data?.data?.[0]?.result;

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

  const resetValidationState = () => {
    setPassword("");
    setShowPassword(false);
    setExcelGenerated(false);
    setMobileStep("validation");
    countOpenTransactionsMutation.reset();
  };

  const handleCutOffChange = (e) => {
    setSelectedCutOff(e.target.value);
    resetValidationState();
  };

  // =========================================================
  // API 1: LOAD CUT OFF
  // =========================================================
  const {
    data: cutOffData = [],
    isLoading: isLoadingCutOff,
    refetch: refetchCutOff,
  } = useQuery({
    queryKey: ["monthend-gl-cutoff-list"],
    enabled: isOpen,
    queryFn: async () => {
      const { data: response } = await apiClient.get("/lookupCutOff", {
        params: { PARAMS: "MonthendStat" },
      });

      const rawResult =
        response?.data?.[0]?.result ||
        response?.data?.data?.[0]?.result ||
        null;

      const parsedRows = rawResult ? JSON.parse(rawResult) : [];

      return Array.isArray(parsedRows)
        ? parsedRows.map((item) => ({
            value: item.cutoffCode ?? "",
            label: item.cutoffName ?? "",
          }))
        : [];
    },
    onSuccess: (rows) => {
      if (!selectedCutOff && defaultCutOff) {
        setSelectedCutOff(defaultCutOff);
        return;
      }

      if (!selectedCutOff && rows.length > 0) {
        setSelectedCutOff(rows[0].value);
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

  const selectedCutOffLabel = useMemo(() => {
    const found = cutOffData.find((item) => item.value === selectedCutOff);
    return found?.label || selectedCutOff || "";
  }, [cutOffData, selectedCutOff]);

  // =========================================================
  // API 2: COUNT OPEN / UNPOSTED TRANSACTIONS
  // =========================================================
  const countOpenTransactionsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.get("/getUnpostedperMonth", {
        params: {
          json_data: {
            json_data: {
              cutoffCode: selectedCutOff,
              unpostedMode:"ME"
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
            ? `${count} open/unposted transaction(s) found for the selected cut off.`
            : "No open or unposted transactions were found. Password is now enabled.",
        fileName: `Open_Unposted_Transactions_${selectedCutOff || "CutOff"}.xlsx`,
      };
    },

    onSuccess: async (data) => {
      setExcelGenerated(false);

      if ((data?.count ?? 0) > 0) {
        setMobileStep("validation");
        await swalInfo(
          "Transactions Found",
          `${data.count} open/unposted transaction(s) found. Please generate the Excel file.`
        );
      } else {
        setMobileStep("password");
        await swalSuccess(
          "Validation Passed",
          "No open or unposted transactions found. Password is now enabled."
        );
      }
    },

    onError: async (error) => {
      setPassword("");
      setExcelGenerated(false);
      setMobileStep("validation");

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

  const validationMessage = countOpenTransactionsMutation.isPending
    ? "Checking transactions for the selected cut off..."
    : countOpenTransactionsMutation.isError
    ? countOpenTransactionsMutation.error?.response?.data?.message ||
      countOpenTransactionsMutation.error?.message ||
      "Unable to count open transactions."
    : excelGenerated
    ? `${unpostedData.length} open/unposted transaction(s) exported successfully.`
    : validationResult?.message || DEFAULT_VALIDATION_MESSAGE;

  const issueCount = validationResult?.count ?? 0;
  const downloadReady = !validationPassed && issueCount > 0 && !excelGenerated;

  const excelFileName =
    validationResult?.fileName ||
    `Open_Unposted_Transactions_${selectedCutOff || "CutOff"}.xlsx`;

  // =========================================================
  // API 3: GENERATE EXCEL FILE
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

      const dynamicColumns = await useSelectedHSColConfig("getUnpostedperMonth");

      const exportData = {
        Data: {
          "Unposted Transactions": rows,
        },
      };

      const columnConfigsMap = {
        "Unposted Transactions": dynamicColumns,
      };

      const payload = {
        ReportName: `Monthend GL Open Transactions - ${
          selectedCutOffLabel || selectedCutOff || ""
        }`,
        UserCode:
          currentUserRow?.userName ||
          currentUserRow?.userCode ||
          currentUserRow?.USER_CODE ||
          "",
        Branch: "",
        JsonData: exportData,
        companyName: companyInfo?.compName || "",
        companyAddress: companyInfo?.compAddr || "",
        companyTelNo: companyInfo?.telNo || "",
        FileName:
          excelFileName ||
          `Open_Unposted_Transactions_${selectedCutOff || "CutOff"}.xlsx`,
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
  // API 4: MONTHEND PROCESSING
  // =========================================================
  const processMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post("/processGLMonthEnd", {
        userCode: currentUserRow?.userCode || "",
        userPassword: password,
        PARAMS: JSON.stringify({
          mode: "ProcessGlMonthEnd",
          cutoffCode: selectedCutOff,
          userCode: currentUserRow?.userCode || "",
        }),
      });

      return response?.data;
    },

    onSuccess: async () => {
      await swalSuccess("Success", "Month-end processing completed successfully.");

      setPassword("");
      setShowPassword(false);
      setExcelGenerated(false);
      setMobileStep("validation");
      countOpenTransactionsMutation.reset();
      await refetchCutOff();
      onProcessed?.();
    },

    onError: async (error) => {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Unable to process month-end.";

      await swalError("Processing Failed", message);
    },
  });

  const handleCheckTransactions = async () => {
    if (!selectedCutOff) {
      await swalWarning("Missing Cut Off", "Please select a cut off first.");
      return;
    }

    setPassword("");
    setShowPassword(false);
    setExcelGenerated(false);
    setMobileStep("validation");
    countOpenTransactionsMutation.reset();
    countOpenTransactionsMutation.mutate();
  };

  const handleGenerateExcel = async () => {
    if (!selectedCutOff || excelGenerated) return;
    generateExcelMutation.mutate();
  };

  const handleFinalOk = async () => {
    if (!selectedCutOff) {
      await swalWarning("Missing Cut Off", "Please select a cut off first.");
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
        "Month-end processing cannot continue because open/unposted transactions still exist."
      );
      return;
    }

    if (!password.trim()) {
      await swalWarning("Missing Password", "Please enter your password.");
      return;
    }

    const result = await swalConfirm(
      "Confirm Month-End GL Processing",
      `Cut Off: ${
        selectedCutOffLabel || "-"
      }\n\nThis action will proceed with Monthend GL Processing for the selected period.`
    );

    if (!result?.isConfirmed) return;

    processMutation.mutate();
  };

  const isChecking = countOpenTransactionsMutation.isPending;
  const isGeneratingExcel = generateExcelMutation.isPending;
  const isProcessing = processMutation.isPending;

  const canCheck =
    !!selectedCutOff &&
    !isChecking &&
    !isGeneratingExcel &&
    !isProcessing &&
    !isLoadingCutOff;

  const passwordEnabled =
    validationPassed &&
    validationDone &&
    !isChecking &&
    !isGeneratingExcel &&
    !isProcessing;

  const canFinalOk =
    passwordEnabled && password.trim() !== "" && !isProcessing;

  const currentUserName = currentUserRow?.userName || "";

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
        <div className="w-full max-w-[96vw] sm:max-w-5xl lg:max-w-6xl bg-white rounded-t-2xl sm:rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-0 sm:my-0 max-h-[92vh] sm:max-h-[90vh]">
          <div className="bg-blue-200 text-slate-800 px-3 sm:px-5 py-2.5 sm:py-3 border-b border-blue-300">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="sm:w-[18px] sm:h-[18px]" />
                  <h2 className="text-sm sm:text-lg font-semibold">
                    Monthend GL Processing
                  </h2>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-700 mt-0.5">
                  Validate first before allowing password entry and final processing.
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
                  Validate first if the selected period still has open or unposted
                  transactions. If transactions are found, Excel generation will be
                  required and password entry must remain disabled.
                </div>
              </div>
            </div>
          </div>

            {/* MOBILE STEP INDICATOR */}
            <div className="sm:hidden">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMobileStep("validation")}
                  className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
                    mobileStep === "validation"
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white text-slate-500"
                  }`}
                >
                  1. Validation
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (passwordEnabled) setMobileStep("password");
                  }}
                  disabled={!passwordEnabled}
                  className={`rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-50 ${
                    mobileStep === "password"
                      ? "border-violet-500 bg-violet-50 text-violet-700"
                      : "border-slate-200 bg-white text-slate-500"
                  }`}
                >
                  2. Password
                </button>
              </div>
            </div>

            {/* DESKTOP VIEW */}
            <div className="hidden sm:grid grid-cols-1 lg:grid-cols-[1.55fr_.95fr] gap-3">
              <div className="space-y-3">
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-3 py-2 border-b bg-slate-50">
                    <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs sm:text-sm">
                      <CalendarRange size={16} className="text-blue-600" />
                      Period Details
                    </div>
                  </div>

                  <div className="p-3">
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">
                      Cut Off
                    </label>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <select
                        value={selectedCutOff}
                        onChange={handleCutOffChange}
                        disabled={isLoadingCutOff}
                        className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-slate-100"
                      >
                        <option value="">
                          {isLoadingCutOff
                            ? "Loading Cut Off..."
                            : "Select Cut Off"}
                        </option>
                        {cutOffData.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>

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
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-3 py-2 border-b bg-slate-50">
                    <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs sm:text-sm">
                      <CheckCircle2 size={16} className="text-emerald-600" />
                      Validation Result
                    </div>
                  </div>

                  <div className="p-3 space-y-3">
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[11px] sm:text-xs text-slate-700">
                    {validationMessage}
                  </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div className="rounded-lg border bg-slate-50 px-3 py-2.5">
                        <div className="text-[10px] sm:text-[11px] text-slate-500">
                          Selected Cut Off
                        </div>
                        <div className="mt-0.5 text-xs sm:text-sm font-semibold text-slate-800 break-words">
                          {selectedCutOffLabel || "-"}
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

                      <div className="rounded-lg border bg-slate-50 px-3 py-2.5">
                        <div className="text-[10px] sm:text-[11px] text-slate-500">
                          Excel Action
                        </div>
                        <div className="mt-0.5 text-xs sm:text-sm font-semibold text-slate-800">
                          {isGeneratingExcel
                            ? "Generating..."
                            : excelGenerated
                            ? "Generated"
                            : downloadReady
                            ? "Ready"
                            : "None"}
                        </div>
                      </div>
                    </div>

                   {(downloadReady || excelGenerated) && (
                        <div className="flex justify-stretch sm:justify-end">
                          <button
                            type="button"
                            onClick={handleGenerateExcel}
                            disabled={isGeneratingExcel || excelGenerated}
                            className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-xs sm:text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                              excelGenerated
                                ? "border border-slate-300 bg-slate-100 text-slate-500"
                                : "border border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
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
                        </div>
                      )}

                    {!validationPassed && validationDone && (
                     <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-[11px] text-slate-700 sm:text-xs">
                      Password remains disabled until no open or unposted
                      transactions are found for the selected cut off.
                    </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
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
                        Password is enabled only after the selected period is
                        confirmed to have no open or unposted transactions.
                      </div>
                    </div>
                  </div>
                </div>

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
                        <span>Select the cut off period to process.</span>
                      </li>
                      <li className="flex gap-2.5">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
                          2
                        </span>
                        <span>
                          Click Check Transactions to count open/unposted entries.
                        </span>
                      </li>
                      <li className="flex gap-2.5">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
                          3
                        </span>
                        <span>
                          If transactions exist, generate the Excel file first.
                        </span>
                      </li>
                      <li className="flex gap-2.5">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
                          4
                        </span>
                        <span>
                          If none are found, enter your password and click Process.
                        </span>
                      </li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>

            {/* MOBILE VIEW */}
            <div className="sm:hidden">
              {mobileStep === "validation" && (
                <div className="space-y-3">
                  <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-3 py-2 border-b bg-slate-50">
                      <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs">
                        <CalendarRange size={15} className="text-blue-600" />
                        Validation
                      </div>
                    </div>

                    <div className="p-3 space-y-3">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 mb-1">
                          Cut Off
                        </label>

                        <select
                          value={selectedCutOff}
                          onChange={handleCutOffChange}
                          disabled={isLoadingCutOff}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-slate-100"
                        >
                          <option value="">
                            {isLoadingCutOff
                              ? "Loading Cut Off..."
                              : "Select Cut Off"}
                          </option>
                          {cutOffData.map((item) => (
                            <option key={item.value} value={item.value}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={handleCheckTransactions}
                        disabled={!canCheck}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
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

                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[11px] text-slate-700">
                      {validationMessage}
                    </div>

                      <div className="grid grid-cols-1 gap-2">
                        <div className="rounded-lg border bg-slate-50 px-3 py-2.5">
                          <div className="text-[10px] text-slate-500">
                            Selected Cut Off
                          </div>
                          <div className="mt-0.5 text-xs font-semibold text-slate-800 break-words">
                            {selectedCutOffLabel || "-"}
                          </div>
                        </div>

                        <div className="rounded-lg border bg-slate-50 px-3 py-2.5">
                          <div className="text-[10px] text-slate-500">
                            Issue Count
                          </div>
                          <div className="mt-0.5 text-xs font-semibold text-slate-800">
                            {validationDone ? issueCount : "-"}
                          </div>
                        </div>

                        <div className="rounded-lg border bg-slate-50 px-3 py-2.5">
                          <div className="text-[10px] text-slate-500">
                            Excel Action
                          </div>
                          <div className="mt-0.5 text-xs font-semibold text-slate-800">
                            {isGeneratingExcel
                              ? "Generating..."
                              : excelGenerated
                              ? "Generated"
                              : downloadReady
                              ? "Ready"
                              : "None"}
                          </div>
                        </div>
                      </div>

                      {(downloadReady || excelGenerated) && (
                        <button
                          type="button"
                          onClick={handleGenerateExcel}
                          disabled={isGeneratingExcel || excelGenerated}
                          className={`w-full inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2.5 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                            excelGenerated
                              ? "border border-slate-300 bg-slate-100 text-slate-500"
                              : "border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
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
                      )}

                      {!validationPassed && validationDone && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] text-amber-800">
                          Password remains disabled until no open or unposted
                          transactions are found.
                        </div>
                      )}

                      {passwordEnabled && (
                        <button
                          type="button"
                          onClick={() => setMobileStep("password")}
                          className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-violet-300 bg-violet-50 px-3.5 py-2.5 text-xs font-semibold text-violet-700 hover:bg-violet-100"
                        >
                          Continue to Password
                          <ChevronRight size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {mobileStep === "password" && (
                <div className="space-y-3">
                  <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-3 py-2 border-b bg-slate-50">
                      <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs">
                        <LockKeyhole size={15} className="text-violet-600" />
                        Password Authorization
                      </div>
                    </div>

                    <div className="p-3 space-y-3">
                      <button
                        type="button"
                        onClick={() => setMobileStep("validation")}
                        className="inline-flex items-center gap-2 text-[11px] font-medium text-slate-600 hover:text-slate-800"
                      >
                        <ChevronLeft size={14} />
                        Back to Validation
                      </button>

                      <div className="rounded-lg border bg-slate-50 px-3 py-2.5">
                        <div className="text-[10px] text-slate-500">Cut Off</div>
                        <div className="mt-0.5 text-xs font-semibold text-slate-800">
                          {selectedCutOffLabel || "-"}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-500 mb-1">
                          User
                        </label>
                        <input
                          value={currentUserName}
                          readOnly
                          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700"
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
                            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-700 disabled:bg-slate-100 disabled:text-slate-400"
                          />

                          <button
                            type="button"
                            onClick={() => setShowPassword((prev) => !prev)}
                            disabled={!passwordEnabled}
                            className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                          >
                            {showPassword ? (
                              <EyeOff size={14} />
                            ) : (
                              <Eye size={14} />
                            )}
                          </button>
                        </div>

                        <div className="mt-1.5 text-[10px] text-slate-500 leading-4">
                          Password is enabled only after validation passes.
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleFinalOk}
                        disabled={!canFinalOk}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
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

                  <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-3 py-2 border-b bg-slate-50">
                      <div className="text-slate-800 font-semibold text-xs">
                        Processing Guide
                      </div>
                    </div>

                    <div className="p-3">
                      <ol className="space-y-2.5 text-[11px] text-slate-700">
                        <li className="flex gap-2.5">
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
                            1
                          </span>
                          <span>Validate the selected cut off first.</span>
                        </li>
                        <li className="flex gap-2.5">
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
                            2
                          </span>
                          <span>Password becomes available only when validation passes.</span>
                        </li>
                        <li className="flex gap-2.5">
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
                            3
                          </span>
                          <span>After successful processing, the screen returns to validation.</span>
                        </li>
                      </ol>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="border-t bg-white px-2.5 sm:px-4 py-2.5 sm:py-3 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2.5">
            <div className="text-[10px] sm:text-[11px] text-slate-500">
              Only authorized users should perform Monthend GL Processing.
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
                className="hidden sm:inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
    </>,
    document.body
  );
};

export default MonthendGLProcessingModal;