import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faSave, faUndo, faTrashAlt, faInfoCircle, faChevronDown, faFilePdf, faVideo, faDownload, faUpload } from "@fortawesome/free-solid-svg-icons";

import { apiClient, getTenant } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import ButtonBar from "@/NAYSA Cloud/Global/ButtonBar.jsx";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable";
import { Input } from "@/components/ui/input";
import { handleDownloadSingleUploadTemplate, handleSingleUploadExcelFile } from "@/NAYSA Cloud/Global/datatable.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import { reftables, reftablesPDFGuide, reftablesVideoGuide } from "@/NAYSA Cloud/Global/reftable";
import {
  useSwalErrorAlert as showError,
  useSwalSuccessAlert as showSuccess,
  useSwalDeleteConfirm as confirmDelete,
  useSwalConfirmAlert as confirmAction,
} from "@/NAYSA Cloud/Global/behavior.jsx";

// Government table helpers
const phFields = [
  { key: "lwLimit", label: "Lower Limit" },
  { key: "upLimit", label: "Upper Limit" },
  { key: "employer", label: "Employer (ER)" },
  { key: "employee", label: "Employee (EE)" },
  { key: "totalCont", label: "Total Contribution" },
];




const normalizePhAmount = (value) => {
  const text = String(value ?? "").trim();
  if (!text || !/^\d{0,16}(?:\.\d{0,2})?$/.test(text) || text === ".") return text;
  const [whole, fraction = ""] = text.split(".");
  return `${(whole || "0").replace(/^0+(?=\d)/, "")}.${fraction.padEnd(2, "0")}`;
};

const formatPhAmount = (value) => {
  const text = normalizePhAmount(value);
  const [whole, fraction] = text.split(".");
  return fraction?.length === 2 ? `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${fraction}` : text;
};

const isPhAmountInput = (value) => /^\d{0,16}(?:\.\d{0,2})?$/.test(value);




const createPhRow = (rows) => {
  const usedCodes = new Set(rows.map((row) => String(row.orderNo).trim().toUpperCase()));
  let orderNo = "";
  for (let number = 1; number <= 999; number += 1) {
    const candidate = String(number).padStart(2, "0");
    if (!usedCodes.has(candidate)) {
      orderNo = candidate;
      break;
    }
  }
  return {
    __idx: crypto.randomUUID(),
    orderNo,
    calcType: "A",
    ...Object.fromEntries(phFields.map(({ key }) => [key, ""])),
  };
};




const toCents = (value) => {
  const [whole, fraction = ""] = String(value).trim().split(".");
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
};




const validatePhRows = (rows) => {
  if (!rows.length) return "At least one bracket is required. An empty schedule cannot be saved.";
  const codes = new Set();
  const ranges = [];
  for (const row of rows) {
    const code = String(row.orderNo ?? "").trim();
    if (!code || code.length > 3) return "Each order number is required and must not exceed 3 characters.";
    if (codes.has(code.toUpperCase())) return `Duplicate order number: ${code}.`;
    codes.add(code.toUpperCase());
    for (const { key, label } of phFields) {
      if (!/^\d{1,16}(?:\.\d{1,2})?$/.test(String(row[key] ?? "").trim())) {
        return `Row ${code}: ${label} requires a nonnegative amount with up to two decimal places.`;
      }
    }
    if (!["A", "P"].includes(String(row.calcType ?? "").trim().toUpperCase())) {
      return `Row ${code}: Calculation Type must be A (Amount) or P (Percentage).`;
    }
    const lower = toCents(row.lwLimit);
    const upper = toCents(row.upLimit);
    if (lower >= upper) return `Row ${code}: the lower limit must be less than the upper limit.`;
    ranges.push({ code, lower, upper });
  }
  ranges.sort((first, next) => first.lower < next.lower ? -1 : first.lower > next.lower ? 1 : 0);
  for (let index = 1; index < ranges.length; index += 1) {
    if (ranges[index].lower <= ranges[index - 1].upper) {
      return `Rows ${ranges[index - 1].code} and ${ranges[index].code} have overlapping ranges.`;
    }
  }
  return "";
};




const getPhPayload = (rows, userCode) => ({
  jsonData: JSON.stringify({
    jsonData: {
      userCode,
      rows: rows.map((row) => ({
        orderNo: String(row.orderNo).trim(),
        calcType: String(row.calcType).trim().toUpperCase(),
        ...Object.fromEntries(phFields.map(({ key }) => [key, String(row[key]).trim()])),
      })),
    },
  }),
});



// Page configuration
const docType = "GovtPH";
const emptyRows = [];
const templateColumns = [{ key: "orderNo", label: "Number" }, ...phFields, { key: "calcType", label: "Calculation Type (A/P)" }];
const toolbarClass = "flex items-center justify-center gap-2 h-8 px-4 text-[11px] font-medium rounded-md bg-blue-600 text-white shadow-sm hover:bg-blue-700 active:scale-95 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed";
const cellClass = "global-ref-textbox-enabled !h-7 !min-h-0 !px-2 !py-1 !text-[11px] !rounded-md !bg-white !text-slate-900 dark:!bg-slate-700 dark:!text-slate-100 dark:!border-slate-600 focus:!border-blue-500 tabular-nums";
const calcTypeStyles = {
  A: "bg-indigo-100 text-indigo-800 ring-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:ring-indigo-700",
  P: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:ring-sky-700",
};




const PhSchedule = () => {
  // State and reference data
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const guideRef = useRef(null);
  const optionsRef = useRef(null);
  const uploadRef = useRef(null);
  const [isOpenOptions, setOpenOptions] = useState(false);
  const [isTemplateBusy, setTemplateBusy] = useState(false);
  const [isTemplatePromptOpen, setTemplatePromptOpen] = useState(false);
  const tableRef = useRef(null);
  const savingRef = useRef(false);
  const [activeCell, setActiveCell] = useState(null);
  const [draftRows, setDraftRows] = useState(null);
  const [isOpenGuide, setOpenGuide] = useState(false);
  const userCode = user?.USER_CODE;
  const tenantCode = getTenant();
  const queryKey = useMemo(() => ["govPhList", tenantCode, userCode], [tenantCode, userCode]);
  const pdfLink = reftablesPDFGuide[docType];
  const videoLink = reftablesVideoGuide[docType];

  const { data: savedRows = emptyRows, isPending: isListLoading, isFetching, error: loadError, refetch } = useQuery({
    queryKey,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryFn: async () => {
      const { data } = await apiClient.get("/govPh");
      const result = data?.data?.[0];
      if (data?.success === false || result?.errorCount > 0 || typeof result?.result !== "string") {
        throw new Error(result?.errorMsg || data?.message || "Unable to load the PH schedule.");
      }
      const rows = JSON.parse(result.result);
      if (!Array.isArray(rows)) throw new Error("The PH schedule response is invalid.");
      return rows.map((row) => ({ ...row, __idx: crypto.randomUUID() }));
    },
  });

  const rows = draftRows ?? savedRows;
  const isDirty = draftRows !== null;




  // Save the complete schedule
  const { mutateAsync: saveSchedule, isPending: isSaving } = useMutation({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post("/upsertGovPh", payload);
      const result = data?.data?.[0];
      if (data?.status !== "success" || !result || Number(result.errorCount) !== 0) {
        throw new Error(result?.errorMsg || data?.message || "Unable to save the PH schedule.");
      }
      return data;
    },
  });

  const isBusy = isListLoading || isFetching || isSaving || isTemplateBusy;
  const canEdit = !isBusy && !loadError;

  const handleSave = useCallback(async () => {
    if (!isDirty || !canEdit || savingRef.current) return;
    const validation = validatePhRows(rows);
    if (validation) return showError("Unable to save", validation);
    if (!userCode) return showError("Unable to save", "Sign in before saving the schedule.");

    savingRef.current = true;
    try {
      await saveSchedule(getPhPayload(rows, userCode));
      queryClient.setQueryData(queryKey, rows);
      setDraftRows(null);
      await queryClient.invalidateQueries({ queryKey });
      showSuccess("Success!", "The complete PH schedule has been saved.");
    } catch (error) {
      showError("Unable to save", error?.response?.data?.message || error.message);
    } finally {
      savingRef.current = false;
    }
  }, [canEdit, isDirty, queryClient, queryKey, rows, saveSchedule, userCode]);




  // Local row actions
  const updateCell = useCallback((rowId, key, value) => {
    if (!canEdit || savingRef.current) return;
    setDraftRows((current) => (current ?? savedRows).map((row) =>
      row.__idx === rowId ? { ...row, [key]: value } : row,
    ));
  }, [canEdit, savedRows]);

  const insertRow = useCallback((afterId = null) => {
    if (!canEdit || savingRef.current) return;
    setDraftRows((current) => {
      const next = [...(current ?? savedRows)];
      const position = afterId === null ? next.length : next.findIndex((row) => row.__idx === afterId) + 1;
      next.splice(position, 0, createPhRow(next));
      return next;
    });
  }, [canEdit, savedRows]);

  const deleteRow = useCallback(async (row) => {
    if (!canEdit || savingRef.current) return;
    const result = await confirmDelete("Remove bracket", `Remove row ${row.orderNo || "(new)"}? This takes effect when you save the complete schedule.`);
    if (!result.isConfirmed || savingRef.current) return;
    setDraftRows((current) => (current ?? savedRows).filter((item) => item.__idx !== row.__idx));
  }, [canEdit, savedRows]);

  const resetRows = async () => {
    if (isBusy || savingRef.current || !isDirty) return;
    const result = await confirmAction("Discard changes?", "Restore the last loaded PH schedule?");
    if (result.isConfirmed && !savingRef.current) setDraftRows(null);
  };

  const refreshRows = async () => {
    if (isBusy || savingRef.current) return;
    if (isDirty) {
      const result = await confirmAction("Reload schedule?", "Reloading will discard your unsaved changes.");
      if (!result.isConfirmed || savingRef.current) return;
    }
    const result = await refetch();
    if (result.isError) {
      showError("Unable to reload", result.error.message);
      return;
    }
    setDraftRows(null);
  };




  // Excel template actions
  const downloadTemplate = async () => {
    setOpenOptions(false);
    setTemplateBusy(true);
    try {
      await handleDownloadSingleUploadTemplate({
        columns: templateColumns,
        rows,
        fileName: "PH Contribution Template.xlsx",
        sheetName: "PH",
        decimalColumnFormats: Object.fromEntries(phFields.map(({ key }) => [key, 2])),
        rightAlignedColumns: phFields.map(({ key }) => key),
      });
    } catch (error) {
      showError("Download failed", error.message);
    } finally {
      setTemplateBusy(false);
    }
  };

  const uploadTemplate = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !canEdit || savingRef.current) return;
    setTemplateBusy(true);
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error("The template must not exceed 5 MB.");
      const result = await handleSingleUploadExcelFile({
        file,
        columns: templateColumns,
        parseRow: ({ excelRow, rowNumber, rawValuesByKey }) => {
          if (excelRow.worksheet.name !== "PH") throw new Error("Upload the PH template downloaded from this page.");
          const row = { __idx: crypto.randomUUID() };
          for (const { key } of templateColumns) {
            const { cell, value } = rawValuesByKey[key];
            if (cell.formula || (cell.value !== null && typeof cell.value === "object")) {
              throw new Error(`Excel row ${rowNumber}: formulas and non-text/non-number cells are not allowed.`);
            }
            row[key] = String(value ?? "").trim();
          }
          row.calcType = row.calcType.toUpperCase();
          return row;
        },
      });
      if (!result.ok) throw new Error(result.errors.join("\n"));
      if (result.rows.length > 999) throw new Error("The template must not contain more than 999 brackets.");
      const validation = validatePhRows(result.rows);
      if (validation) throw new Error(validation);
      setTemplatePromptOpen(true);
      const confirmation = await confirmAction("Replace PH schedule?", `Use the ${result.rows.length} validated rows from this template? This replaces the current draft. Click Save afterward to update the database.`);
      if (!confirmation.isConfirmed) return;
      setDraftRows(result.rows);
      tableRef.current?.clearAllState();
      showSuccess("Template uploaded", "Rows are ready for review. Click Save to save the complete schedule.");
    } catch (error) {
      showError("Invalid template", error.message || "The workbook could not be read.");
    } finally {
      setTemplateBusy(false);
      setTemplatePromptOpen(false);
    }
  };




  // Keyboard and unsaved-change protection
  useEffect(() => {
    const handleKey = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        handleSave();
      }
    };
    const handleUnload = (event) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    const handleOutside = (event) => {
      if (guideRef.current && !guideRef.current.contains(event.target)) setOpenGuide(false);
      if (optionsRef.current && !optionsRef.current.contains(event.target)) setOpenOptions(false);
    };
    window.addEventListener("keydown", handleKey);
    window.addEventListener("beforeunload", handleUnload);
    document.addEventListener("mousedown", handleOutside);
    return () => {
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("beforeunload", handleUnload);
      document.removeEventListener("mousedown", handleOutside);
    };
  }, [handleSave, isDirty]);




  // Global reference table columns
  const moveToNextRow = useCallback((event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const input = event.currentTarget;
    const table = input.closest("table") || input.closest(".global-tran-table-main-div-ui");
    const cells = Array.from(table?.querySelectorAll("[data-ph-column]") || [])
      .filter((cell) => cell.dataset.phColumn === input.dataset.phColumn && !cell.disabled);
    const next = cells[cells.indexOf(input) + 1];
    input.blur();
    if (next) {
      next.focus();
      next.select?.();
    }
  }, []);




  const columns = useMemo(() => [
    {
      key: "__actions", label: "Actions", width: 100, minWidth: 100,
      sortable: false, filterable: false, requiredVisible: true,
      render: (row) => (
        <div className="flex gap-2 justify-center">
          <button type="button" disabled={!canEdit} onClick={() => insertRow(row.__idx)}
            title="Insert below" aria-label={`Insert below row ${row.orderNo}`}
            className="h-7 px-2 bg-blue-50 border border-blue-100 text-blue-600 rounded-md hover:bg-blue-600 hover:text-white text-xs disabled:opacity-50 dark:bg-blue-900/30 dark:text-blue-300">
            <FontAwesomeIcon icon={faPlus} />
          </button>
          <button type="button" disabled={!canEdit} onClick={() => deleteRow(row)}
            title="Delete row" aria-label={`Delete row ${row.orderNo}`}
            className="h-7 px-2 bg-red-50 border border-red-100 text-red-600 rounded-md hover:bg-red-600 hover:text-white text-xs disabled:opacity-50 dark:bg-red-900/30 dark:text-red-300">
            <FontAwesomeIcon icon={faTrashAlt} />
          </button>
        </div>
      ),
    },
    {
      key: "orderNo", label: "Number", width: 85, minWidth: 75,
      sortable: true, requiredVisible: true,
      render: (row) => (
        <Input aria-label={`Order number ${row.orderNo}`} value={row.orderNo ?? ""}
          maxLength={3} disabled={!canEdit} className={cellClass}
          data-ph-column="orderNo" onKeyDown={moveToNextRow}
          onChange={(event) => updateCell(row.__idx, "orderNo", event.target.value)} />
      ),
    },
    {
      key: "calcType", label: "Calculation Type", width: 145, minWidth: 130,
      sortable: true, className: "!px-2",
      render: (row) => {
        const value = String(row.calcType || "A").toUpperCase() === "P" ? "P" : "A";
        return (
          <button type="button" disabled={!canEdit} data-ph-column="calcType"
            aria-label={`Row ${row.orderNo}: Calculation Type ${value === "A" ? "Amount" : "Percentage"}`}
            title="Click to toggle Amount or Percentage"
            onClick={() => updateCell(row.__idx, "calcType", value === "A" ? "P" : "A")}
            onKeyDown={(event) => {
              if (event.key === "Enter") moveToNextRow(event);
            }}
            className={`flex min-h-[28px] w-full items-center justify-center rounded-full px-2 py-1 text-center text-[11px] font-medium whitespace-nowrap ring-1 ring-inset transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${calcTypeStyles[value]}`}>
            {value === "A" ? "Amount" : "Percentage"}
          </button>
        );
      },
    },
    ...phFields.map(({ key, label }) => ({
      key, label, width: ["lwLimit", "upLimit", "salCredit", "mpfSc", "total"].includes(key) ? 125 : 105,
      minWidth: 95, sortable: true,
      renderType: "number", decimals: 2,
      render: (row) => (
        <Input aria-label={`Row ${row.orderNo}: ${label}`} inputMode="decimal"
          value={activeCell === `${row.__idx}:${key}` ? (row[key] ?? "") : formatPhAmount(row[key])}
          disabled={!canEdit} className={`${cellClass} text-right`} data-ph-column={key}
          onFocus={() => setActiveCell(`${row.__idx}:${key}`)}
          onBlur={() => {
            setActiveCell(null);
            const normalized = normalizePhAmount(row[key]);
            if (String(row[key] ?? "") !== normalized) updateCell(row.__idx, key, normalized);
          }}
          onKeyDown={moveToNextRow}
          onChange={(event) => {
            const value = event.target.value;
            if (isPhAmountInput(value)) updateCell(row.__idx, key, value);
          }} />
      ),
    })),
  ], [activeCell, canEdit, deleteRow, insertRow, moveToNextRow, updateCell]);




  return (
    <div className="global-ref-main-div-ui">
      {isBusy && !isTemplatePromptOpen && <LoadingSpinner />}

      <div className="global-ref-header-ui mb-2">
        <div className="w-full flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <h1 className="global-ref-headertext-ui w-full md:w-auto flex items-center justify-center md:justify-start gap-2 truncate text-center md:text-left">
            {reftables[docType]}
          </h1>
          <div className="w-full md:w-auto flex items-center justify-center md:justify-end gap-1 flex-wrap shrink-0">
            <ButtonBar buttons={[
              ...(rows.length === 0 ? [{ key: "add", label: "Add Row", icon: faPlus, onClick: () => insertRow(), disabled: !canEdit, className: toolbarClass }] : []),
              { key: "save", label: "Save", icon: faSave, onClick: handleSave, disabled: !canEdit || !isDirty, className: toolbarClass },
              { key: "reset", label: "Reset", icon: faUndo, onClick: resetRows, disabled: isBusy || !isDirty, className: toolbarClass },
            ]} />
            <div ref={optionsRef} className="relative">
              <button type="button" className={toolbarClass} disabled={isBusy || !!loadError}
                aria-expanded={isOpenOptions} onClick={() => setOpenOptions((open) => !open)}>
                Options <FontAwesomeIcon icon={faChevronDown} />
              </button>
              {isOpenOptions && (
                <div className="absolute right-0 mt-2 w-52 rounded-md shadow-xl bg-white ring-1 ring-black/10 z-[60] dark:bg-gray-800 overflow-hidden">
                  <button type="button" onClick={downloadTemplate}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs hover:bg-blue-50 dark:hover:bg-blue-900">
                    <FontAwesomeIcon icon={faDownload} className="text-emerald-600" />
                    Download Template
                  </button>
                  <button type="button" onClick={() => { setOpenOptions(false); uploadRef.current?.click(); }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs hover:bg-blue-50 dark:hover:bg-blue-900">
                    <FontAwesomeIcon icon={faUpload} className="text-blue-600" />
                    Upload Template
                  </button>
                </div>
              )}
              <input ref={uploadRef} type="file" accept=".xlsx" className="hidden" aria-label="Upload PH template" onChange={uploadTemplate} />
            </div>
            <div ref={guideRef} className="relative">
              <button type="button" className={toolbarClass} onClick={() => setOpenGuide((open) => !open)} aria-expanded={isOpenGuide}>
                <FontAwesomeIcon icon={faInfoCircle} /> Info <FontAwesomeIcon icon={faChevronDown} />
              </button>
              {isOpenGuide && (
                <div className="absolute right-0 mt-2 w-52 rounded-md shadow-xl bg-white ring-1 ring-black/10 z-[60] dark:bg-gray-800 overflow-hidden">
                  {[{ label: "PDF Guide", link: pdfLink, icon: faFilePdf }, { label: "Video Guide", link: videoLink, icon: faVideo }].map((guide) => (
                    <button key={guide.label} type="button" disabled={!guide.link}
                      onClick={() => { window.open(guide.link, "_blank", "noopener,noreferrer"); setOpenGuide(false); }}
                      className="block w-full text-left px-4 py-2 text-xs hover:bg-blue-50 dark:hover:bg-blue-900 disabled:opacity-50 disabled:cursor-not-allowed">
                      <FontAwesomeIcon icon={guide.icon} className="mr-2" />{guide.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="global-tran-table-main-div-ui mt-24">
        {loadError && <p role="alert" className="mb-2 text-xs text-red-600 dark:text-red-400">{loadError.message} Use the table refresh button to retry.</p>}
        <SearchGlobalReferenceTable ref={tableRef} docType={docType} columns={columns} data={rows}
          isLoading={isListLoading} isFetching={isFetching} onRefresh={refreshRows}
          itemsPerPage={50}
          autoFillGrid="True" />
      </div>
    </div>
  );
};

const RefGovtPH = () => {
  const { user } = useAuth();
  return <PhSchedule key={`${getTenant()}:${user?.USER_CODE ?? ""}`} />;
};

export default RefGovtPH;
