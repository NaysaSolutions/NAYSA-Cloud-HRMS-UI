import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Barcode from "react-barcode";
import QRCode from "react-qr-code";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faDatabase,
  faHistory,
  faIdCard,
  faRotateLeft,
  faCamera,
  faExpand,
  faCompress,
  faTimes,
  faTag,
  faEye,
  faSearch,
} from "@fortawesome/free-solid-svg-icons";

import { postRequest } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { useSelectedHSColConfig as getSelectedHSColConfig } from "@/NAYSA Cloud/Global/selectedData";
import SearchGlobalReportTable from "@/NAYSA Cloud/Lookup/SearchGlobalReportTable.jsx";
import GlobalLookupModalv1 from "@/NAYSA Cloud/Lookup/SearchGlobalLookupv1.jsx";
import BarcodeQrReaderModal from "@/NAYSA Cloud/Lookup/SearchGlobalQRBarCodeReader.jsx";
import SearchPPETag from "@/NAYSA Cloud/Lookup/SearchPPETag.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

const AMOUNT_KEYS = new Set([
  "acqCost",
  "deprMonth",
  "accumDepr",
  "nbValue",
  "salvageValue",
  "acqCostFx1",
  "acqCostFx2",
  "deprMonthFx1",
  "deprMonthFx2",
  "accumDeprFx1",
  "accumDeprFx2",
  "nbValueFx1",
  "nbValueFx2",
  "salvageValueFx1",
  "salvageValueFx2",
  "deprAmount",
  "accumDeprBefore",
  "accumDeprAfter",
  "nbValueBefore",
  "nbValueAfter",
]);

const firstValue = (...values) =>
  values.find((value) => value !== undefined && value !== null && String(value).trim() !== "") || "";

const formatAmount = (value, decimals = 2) => {
  const parsed = Number(String(value ?? 0).replace(/,/g, ""));
  if (!Number.isFinite(parsed)) return Number(0).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return parsed.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

const openPathUrlDocument = (row) => {
  if (!row?.pathUrl) return;
  const url = `${window.location.origin}${row.pathUrl}`;
  window.open(url, "_blank", "noopener,noreferrer");
};

const normalizeApiRows = (response) => {
  const result =
    response?.data?.[0]?.result ??
    response?.data?.[0]?.RESULT ??
    response?.data?.result ??
    response?.data?.RESULT ??
    response?.result ??
    response?.RESULT ??
    response?.data ??
    response;

  if (!result) return [];

  if (typeof result === "string") {
    try {
      const parsed = JSON.parse(result);
      if (Array.isArray(parsed)) return parsed;
      if (Array.isArray(parsed?.data)) return parsed.data;
      return parsed && typeof parsed === "object" ? [parsed] : [];
    } catch {
      return [];
    }
  }

  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.data)) return result.data;
  return result && typeof result === "object" ? [result] : [];
};

const getStatusLabel = (asset = {}) => {
  if (asset.faStatusName) return asset.faStatusName;

  switch (String(asset.faStatus || "").toUpperCase()) {
    case "A":
      return "Active";
    case "I":
      return "Inactive";
    case "D":
      return "Disposed";
    case "F":
      return "Fully Depreciated";
    case "X":
      return "Cancelled";
    default:
      return asset.faStatus || "Unknown";
  }
};

const DetailSection = ({ title, children, className = "" }) => (
  <section className={`rounded-lg border border-slate-200 bg-slate-50/60 p-3 ${className}`}>
    <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-blue-700">
      {title}
    </div>
    {children}
  </section>
);

const ReadOnlyField = ({ id, label, value, type = "text", className = "" }) => (
  <div className={className}>
    <FieldRenderer
      id={id}
      label={label}
      type={type}
      value={value || ""}
      disabled
      readOnly
      labelClassName="!text-[10px]"
    />
  </div>
);

const FinancialMetricCard = ({ label, value, accent = false }) => (
  <div
    className={`min-w-0 rounded-lg border px-3 py-2 shadow-sm ${
      accent ? "border-blue-100 bg-blue-50" : "border-gray-200 bg-white"
    }`}
  >
    <div
      className={`truncate text-[10px] font-medium uppercase ${
        accent ? "text-blue-700" : "text-gray-500"
      }`}
      title={label}
    >
      {label}
    </div>
    <div
      className={`mt-1 truncate text-right text-[11px] font-semibold tabular-nums sm:text-xs ${
        accent ? "text-blue-900" : "text-gray-800"
      }`}
      title={value}
    >
      {value}
    </div>
  </div>
);

const AssetTagPreviewCard = ({ tagInfo, onOpenPreview }) => {
  const tagNo = tagInfo?.serialRow?.assetTag || "System-Generated";

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 text-xs font-bold text-blue-700">
          <FontAwesomeIcon icon={faTag} />
          <span className="truncate">Property Tag Preview</span>
        </div>

        <button
          type="button"
          className="inline-flex min-w-[84px] items-center justify-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
          onClick={onOpenPreview}
        >
          <FontAwesomeIcon icon={faEye} />
          Preview
        </button>
      </div>

      <div className="mx-auto w-full max-w-[320px] rounded-md border-2 border-slate-900 bg-white p-2 text-slate-900">
        <div className="grid grid-cols-[minmax(0,1fr)_74px] gap-2">
          <div className="min-w-0">
            <div className="text-lg font-black leading-none text-blue-700">NAYSA</div>
            <div className="text-[9px] font-black uppercase text-slate-600">Property Tag</div>
            <div className="mt-1 truncate text-[10px] font-extrabold" title={tagInfo.companyInfo.companyName}>
              {tagInfo.companyInfo.companyName}
            </div>
            <div className="truncate text-[9px] font-semibold text-slate-500" title={tagInfo.documentInfo.branchName}>
              {tagInfo.documentInfo.branchName}
            </div>
            <div className="mt-2 max-h-[30px] min-h-[28px] overflow-hidden text-[11px] font-extrabold leading-tight" title={tagInfo.detailRow.assetDescription}>
              {tagInfo.detailRow.assetDescription}
            </div>
          </div>

          <div className="flex flex-col items-center justify-start gap-1">
            <div className="border border-slate-900 bg-white p-1">
              <QRCode value={tagNo} size={56} bgColor="#ffffff" fgColor="#111827" level="M" />
            </div>
          </div>
        </div>

        <div className="mt-2 flex justify-center overflow-hidden bg-white [&_svg]:mx-auto">
          <Barcode
            value={tagNo}
            format="CODE128"
            height={24}
            width={1.1}
            margin={0}
            displayValue={false}
            background="#ffffff"
            lineColor="#111827"
          />
        </div>
        <div className="mt-1 truncate text-center text-[11px] font-black" title={tagNo}>
          {tagNo}
        </div>
      </div>
    </div>
  );
};


const HistoryTableLoader = () => (
  <div className="relative flex min-h-[240px] items-center justify-center overflow-hidden bg-slate-50/60 animate-in fade-in duration-200">
    <div className="absolute inset-0 bg-slate-950/5" />

    <div className="relative flex min-w-[168px] flex-col items-center justify-center gap-3 rounded-2xl border border-white/70 bg-white/90 px-6 py-5 shadow-[0_18px_55px_rgba(15,23,42,0.18)] backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-white/40 blur-xl" />
      <div className="pointer-events-none absolute -top-px left-5 right-5 h-px bg-white/90" />

      <div className="relative flex h-[72px] w-[72px] items-center justify-center sm:h-20 sm:w-20">
        <div className="absolute inset-0 rounded-full bg-blue-50" />
        <div className="absolute inset-1 rounded-full border border-slate-200" />
        <div className="absolute inset-1 animate-spin" style={{ animationDuration: "1.35s" }}>
          <div className="absolute inset-0 rounded-full border-[3px] border-blue-600 border-r-transparent border-t-transparent" />
        </div>
        <div className="absolute inset-3 rounded-full bg-white shadow-inner" />

        <img
          src="/naysa_logo.png"
          alt="Loading"
          className="relative h-14 w-14 object-contain sm:h-16 sm:w-16"
          draggable={false}
        />
      </div>

      <div className="relative flex flex-col items-center justify-center leading-tight" aria-label="Loading asset history">
        {["N A Y S A", "Financials", "Cloud"].map((line, lineIndex) => (
          <div key={line} className="flex items-center justify-center gap-x-1">
            {line.split("").map((letter, index) => (
              <span
                key={`${line}-${letter}-${index}`}
                className="text-[10px] font-extrabold tracking-wide text-blue-700 animate-pulse"
                style={{ animationDelay: `${(lineIndex * 6 + index) * 45}ms`, animationDuration: "1s" }}
              >
                {letter === " " ? "\u00A0" : letter}
              </span>
            ))}
          </div>
        ))}
      </div>

      <div className="relative text-[11px] font-medium text-slate-500">
        Loading asset history...
      </div>
    </div>
  </div>
);

const SmartAssetSearchField = ({
  value,
  onChange,
  onSearch,
  onLookup,
  onClear,
  onQr,
  disabled = false,
  suggestions = [],
  showSuggestions = false,
  isSuggestLoading = false,
  selectedSuggestionIndex = -1,
  onHighlightSuggestion,
  onHideSuggestions,
  onSelectSuggestion,
}) => (
  <div className="rounded-xl border border-blue-100 bg-gradient-to-b from-blue-50/70 to-white px-4 py-4 shadow-sm">
    <div className="relative mx-auto w-full max-w-[780px]">
      <div className="mb-3 text-center">
        <div className="text-[12px] font-bold uppercase tracking-wide text-blue-700">
          Find Asset
        </div>
        <div className="mt-0.5 text-[11px] text-slate-500">
          Search by Asset Code or Property Tag No.
        </div>
      </div>

      <div className="flex h-12 w-full items-center rounded-lg border border-slate-300 bg-white shadow-sm transition focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
        <FontAwesomeIcon
          icon={faSearch}
          className="ml-4 shrink-0 text-[16px] text-slate-400"
        />

        <input
          id="fa_find_smart_search"
          type="text"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            const hasSelectableSuggestions =
              showSuggestions && !isSuggestLoading && suggestions.length > 0;

            if (e.key === "ArrowDown" && hasSelectableSuggestions) {
              e.preventDefault();
              onHighlightSuggestion?.(
                selectedSuggestionIndex < 0
                  ? 0
                  : (selectedSuggestionIndex + 1) % suggestions.length
              );
              return;
            }

            if (e.key === "ArrowUp" && hasSelectableSuggestions) {
              e.preventDefault();
              onHighlightSuggestion?.(
                selectedSuggestionIndex <= 0
                  ? suggestions.length - 1
                  : selectedSuggestionIndex - 1
              );
              return;
            }

            if (e.key === "Enter") {
              e.preventDefault();

              if (hasSelectableSuggestions && selectedSuggestionIndex >= 0) {
                onSelectSuggestion?.(suggestions[selectedSuggestionIndex]);
                return;
              }

              onSearch(value);
              return;
            }

            if (e.key === "Escape") {
              e.preventDefault();
              onHideSuggestions?.();
            }
          }}
          disabled={disabled}
          placeholder="Enter Asset Code or Property Tag No."
          className="h-full min-w-0 flex-1 border-0 bg-transparent px-3 text-xs font-semibold text-slate-800 outline-none placeholder:font-medium placeholder:text-slate-400 disabled:text-slate-500"
          autoComplete="off"
        />

        {String(value || "").trim() && (
          <button
            type="button"
            className="mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-50 hover:text-red-600 disabled:opacity-50"
            onClick={onClear}
            disabled={disabled}
            title="Clear"
          >
            <FontAwesomeIcon icon={faTimes} className="text-[13px]" />
          </button>
        )}

        <div className="flex h-full shrink-0 items-center gap-1.5 border-l border-slate-200 px-1.5">
          <button
            type="button"
            className="inline-flex h-8 min-w-[84px] items-center justify-center gap-2 rounded-md bg-blue-600 px-3 text-xs font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
            onClick={() => onSearch(value)}
            disabled={disabled}
            title="Find Asset"
          >
            <FontAwesomeIcon icon={faSearch} />
            <span>Find</span>
          </button>

          <button
            type="button"
            className="inline-flex h-8 min-w-[84px] items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 transition hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50"
            onClick={onLookup}
            disabled={disabled}
            title="Lookup Fixed Asset Master"
          >
            <FontAwesomeIcon icon={faDatabase} />
            <span>Search</span>
          </button>

          <button
            type="button"
            className="inline-flex h-8 min-w-[84px] items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-blue-600 transition hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50"
            onClick={onQr}
            disabled={disabled}
            title="Scan Property Tag"
          >
            <FontAwesomeIcon icon={faCamera} />
            <span>Scan</span>
          </button>
        </div>
      </div>

      {(showSuggestions || isSuggestLoading) && (
        <div className="absolute left-0 right-0 top-full z-[130] mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
          {isSuggestLoading ? (
            <div className="flex items-center gap-2 px-3 py-3 text-xs font-medium text-slate-500">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-r-transparent border-t-transparent" />
              Loading suggestions...
            </div>
          ) : suggestions.length === 0 ? (
            <div className="px-3 py-3 text-xs text-slate-500">No suggestions found.</div>
          ) : (
            <div className="max-h-[260px] overflow-y-auto py-1">
              {suggestions.map((row, index) => {
                const suggestedFaCode = row?.faCode || "";
                const suggestedTagNo = row?.tagNo || "";
                const suggestedFaName = row?.faName || "";

                return (
                  <button
                    type="button"
                    key={`${suggestedFaCode}-${suggestedTagNo}-${index}`}
                    id={`fa_find_suggestion_${index}`}
                    aria-selected={selectedSuggestionIndex === index}
                    className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition ${
                      selectedSuggestionIndex === index
                        ? "bg-blue-50 ring-1 ring-inset ring-blue-100"
                        : "hover:bg-blue-50"
                    }`}
                    onMouseEnter={() => onHighlightSuggestion?.(index)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onSelectSuggestion?.(row);
                    }}
                  >
                    <div className="min-w-0">
                      <div className="truncate text-xs font-bold text-slate-800">
                        {suggestedTagNo || suggestedFaCode}
                      </div>
                      <div className="mt-0.5 truncate text-[11px] text-slate-500">
                        Asset Code: {suggestedFaCode || "-"}
                      </div>
                      {suggestedFaName && (
                        <div className="mt-0.5 truncate text-[11px] text-slate-500">
                          {suggestedFaName}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold uppercase text-blue-700">
                      {suggestedTagNo ? "Property Tag No." : "Asset Code"}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  </div>
);

const SearchFAFind = ({
  isOpen,
  onClose,
  initialBranchCode = "",
  initialBranchName = "",
  initialAssetCode = "",
  initialTagNo = "",
  endingCutoff = "",
}) => {
  const { currentUserRow, companyInfo } = useAuth();
  const withCostAmount = currentUserRow?.viewCostamt !== "N";

  const [branchCode, setBranchCode] = useState(initialBranchCode || currentUserRow?.branchCode || "");
  const [branchName, setBranchName] = useState(initialBranchName || currentUserRow?.branchName || "");
  const [assetSearchText, setAssetSearchText] = useState(firstValue(initialAssetCode, initialTagNo));
  const [assetCode, setAssetCode] = useState(initialAssetCode || "");
  const [tagNo, setTagNo] = useState(initialTagNo || "");
  const [asset, setAsset] = useState(null);
  const [historyRows, setHistoryRows] = useState([]);
  const [historyCols, setHistoryCols] = useState([]);
  const [showFAMastLookup, setShowFAMastLookup] = useState(false);
  const [faLookupRows, setFaLookupRows] = useState([]);
  const [faLookupColumns, setFaLookupColumns] = useState([]);
  const [faLookupSource, setFaLookupSource] = useState("");
  const [showQrReader, setShowQrReader] = useState(false);
  const [showPpeTagPreview, setShowPpeTagPreview] = useState(false);
  const [isAssetLoading, setIsAssetLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isLookupLoading, setIsLookupLoading] = useState(false);
  const [isSuggestLoading, setIsSuggestLoading] = useState(false);
  const [suggestionRows, setSuggestionRows] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [isMaximized, setIsMaximized] = useState(false);
  const [message, setMessage] = useState("");

  const historyColsCacheRef = useRef([]);
  const lookupColsCacheRef = useRef([]);
  const suggestionRowsCacheRef = useRef({});
  const assetInfoRef = useRef(null);

  const isLoading = isAssetLoading || isLookupLoading;
  const currentCutoff = firstValue(endingCutoff, companyInfo?.cutoffCode, companyInfo?.CUTOFF_CODE);

  const scrollAssetInformationToTop = useCallback(() => {
    window.setTimeout(() => {
      assetInfoRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 120);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    setBranchCode(initialBranchCode || currentUserRow?.branchCode || "");
    setBranchName(initialBranchName || currentUserRow?.branchName || "");
    setAssetSearchText(firstValue(initialAssetCode, initialTagNo));
    setAssetCode(initialAssetCode || "");
    setTagNo(initialTagNo || "");
    setAsset(null);
    setHistoryRows([]);
    setHistoryCols([]);
    setFaLookupRows([]);
    setFaLookupColumns([]);
    setFaLookupSource("");
    setShowFAMastLookup(false);
    setShowQrReader(false);
    setShowPpeTagPreview(false);
    setIsAssetLoading(false);
    setIsHistoryLoading(false);
    setIsLookupLoading(false);
    setIsSuggestLoading(false);
    setSuggestionRows([]);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    suggestionRowsCacheRef.current = {};
    setMessage("");
    setIsMaximized(false);

    if (initialAssetCode || initialTagNo) {
      setTimeout(() => {
        loadAsset({
          faCode: initialAssetCode || "",
          tagNo: initialTagNo || "",
        });
      }, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialAssetCode, initialTagNo]);

  useEffect(() => {
    if (!isOpen || !isMaximized) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isOpen, isMaximized]);

  const loadAssetSuggestions = useCallback(async (searchText = "") => {
    const cleanSearchText = String(searchText || "").trim();
    const lowerSearchText = cleanSearchText.toLowerCase();

    if (cleanSearchText.length < 2 || isAssetLoading || isLookupLoading || showFAMastLookup) {
      setSuggestionRows([]);
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
      return;
    }

    setIsSuggestLoading(true);

    try {
      const cacheKey = `${branchCode || ""}|${lowerSearchText}`;
      let rawLookupRows = suggestionRowsCacheRef.current?.[cacheKey];

      if (!Array.isArray(rawLookupRows)) {
        const response = await postRequest("lookupFAMast", {
          PARAMS: JSON.stringify({
            json_data: {
              branchCode: branchCode || "",
              filter: "AutoSuggest",
              search: cleanSearchText,
              searchText: cleanSearchText,
              searchMode: "start",
              faCode: "",
              tagNo: "",
            },
          }),
        });

        rawLookupRows = normalizeApiRows(response);
        suggestionRowsCacheRef.current = {
          ...(suggestionRowsCacheRef.current || {}),
          [cacheKey]: rawLookupRows,
        };
      }

      const filteredRows = rawLookupRows
        .filter((row) => {
          return [
            row?.faCode,
            row?.tagNo,
          ].some((value) =>
            String(value || "").toLowerCase().includes(lowerSearchText)
          );
        })
        .slice(0, 10)
        .map((row) => ({
          faCode: row?.faCode || "",
          tagNo: row?.tagNo || "",
          faName: row?.faName || "",
        }));

      setSuggestionRows(filteredRows);
      setShowSuggestions(filteredRows.length > 0);
      setSelectedSuggestionIndex(filteredRows.length > 0 ? 0 : -1);
    } catch (error) {
      console.error("Fixed Asset suggestions error:", error);
      setSuggestionRows([]);
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    } finally {
      setIsSuggestLoading(false);
    }
  }, [branchCode, isAssetLoading, isLookupLoading, showFAMastLookup]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const cleanSearchText = String(assetSearchText || "").trim();

    if (cleanSearchText.length < 2 || isAssetLoading || isLookupLoading) {
      setSuggestionRows([]);
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
      setIsSuggestLoading(false);
      return undefined;
    }

    const timer = setTimeout(() => {
      loadAssetSuggestions(cleanSearchText);
    }, 300);

    return () => clearTimeout(timer);
  }, [assetSearchText, isAssetLoading, isLookupLoading, isOpen, loadAssetSuggestions]);

  const visibleHistoryCols = useMemo(() => {
    const source = Array.isArray(historyCols) ? historyCols : [];
    if (withCostAmount) return source;
    return source.filter((column) => !AMOUNT_KEYS.has(column?.key));
  }, [historyCols, withCostAmount]);

  const historyReportDocType = useMemo(() => {
    const selectedTagNo = firstValue(asset?.tagNo, asset?.assetTag, tagNo);
    return selectedTagNo ? `${selectedTagNo} Historical Data` : "Historical Data";
  }, [asset, tagNo]);

  const assetTagPreviewInfo = useMemo(() => {
    if (!asset) return null;

    const assetTag = firstValue(asset.assetTag, asset.tagNo, asset.barCode, asset.faCode, "System-Generated");
    const assetDescription = firstValue(asset.faName, asset.faDesc, asset.faSpecs, asset.faCode, "-");
    const branchCodeValue = firstValue(asset.branchCode, branchCode, "");
    const branchNameValue = firstValue(asset.branchName, branchName, branchCodeValue, "-");
    const location = firstValue(asset.flocName, asset.flocCode, "-");
    const assignedTo = firstValue(asset.empName, asset.empNo, "-");
    const department = firstValue(asset.rcName, asset.rcCode, "-");
    const brandModel = firstValue(asset.brandModel, asset.modelNo, "-");

    return {
      companyInfo: {
        ...companyInfo,
        companyName: firstValue(companyInfo?.companyName, companyInfo?.compName, companyInfo?.name, "NAYSA Financials"),
      },
      documentInfo: {
        documentDate: firstValue(asset.acqDate, asset.documentDate, "-"),
        branchCode: branchCodeValue,
        branchName: branchNameValue,
      },
      detailRow: {
        assetDescription,
        categName: firstValue(asset.categName, asset.categCode, "-"),
        className: firstValue(asset.className, asset.classCode, "-"),
        location,
        brandModel,
        acqCost: asset.acqCost,
      },
      serialRow: {
        assetTag,
        serialNo: firstValue(asset.serialNo, "-"),
        location,
        assignedTo,
        empName: assignedTo,
        rcCode: department,
        brandModel,
        acqCost: asset.acqCost,
      },
    };
  }, [asset, branchCode, branchName, companyInfo]);

  const loadHistory = useCallback(async (assetRow) => {
    const faCode = assetRow?.faCode || "";
    if (!faCode) {
      setHistoryRows([]);
      return;
    }

    const endCutoff = firstValue(currentCutoff, assetRow?.dcutoffCode, assetRow?.cutoffCode);

    setIsHistoryLoading(true);
    setHistoryRows([]);

    try {
      const historyColsPromise = historyColsCacheRef.current.length > 0
        ? Promise.resolve(historyColsCacheRef.current)
        : getSelectedHSColConfig("getFAAssetHistory");

      const [cols, response] = await Promise.all([
        historyColsPromise,
        postRequest("getFAAssetHistory", {
          json_data: {
            mode: "data",
            branchCode: assetRow?.branchCode || branchCode || "",
            flocCode: assetRow?.flocCode || "",
            rcCode: assetRow?.rcCode || "",
            categCode: assetRow?.categCode || "",
            classCode: assetRow?.classCode || "",
            faCode,
            startingCutoff: "190001",
            endingCutoff: endCutoff,
          },
        }),
      ]);

      const normalizedCols = Array.isArray(cols) ? cols : [];
      historyColsCacheRef.current = normalizedCols;
      setHistoryCols(normalizedCols);
      setHistoryRows(normalizeApiRows(response));
    } catch (error) {
      console.error("Search FA Find history error:", error);
      setHistoryRows([]);
      setMessage("Asset information loaded, but unable to load asset history.");
    } finally {
      setIsHistoryLoading(false);
      setAssetSearchText("");
      setSuggestionRows([]);
      setShowSuggestions(false);
      setIsSuggestLoading(false);
    }
  }, [branchCode, currentCutoff]);

  const loadAsset = useCallback(async ({ faCode = "", tagNo: searchTagNo = "", searchSource = "", silentNotFound = false } = {}) => {
    const cleanFaCode = String(faCode || "").trim();
    const cleanTagNo = String(searchTagNo || "").trim();

    if (!cleanFaCode && !cleanTagNo) {
      if (!silentNotFound) setMessage("Please enter Asset Code or Property Tag No.");
      return false;
    }

    setIsAssetLoading(true);
    setMessage("");
    setAssetSearchText("");
    setSuggestionRows([]);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    setIsSuggestLoading(false);
    scrollAssetInformationToTop();

    try {
      const response = await postRequest("getFAAssetQuery", {
        json_data: {
          mode: "data",
          branchCode: branchCode || "",
          faCode: cleanFaCode,
          tagNo: cleanTagNo,
        },
      });

      const rows = normalizeApiRows(response);
      const selectedAsset =
        rows.find((row) =>
          cleanFaCode
            ? String(row?.faCode || "").toUpperCase() === cleanFaCode.toUpperCase()
            : String(row?.tagNo || "").toUpperCase() === cleanTagNo.toUpperCase()
        ) || rows[0] || null;

      if (!selectedAsset) {
        if (!silentNotFound) {
          setAsset(null);
          setHistoryRows([]);
          setHistoryCols([]);
          setMessage("No asset found.");
        }
        return false;
      }

      setAsset(selectedAsset);

      if (searchSource === "assetCode") {
        setAssetCode(selectedAsset.faCode || cleanFaCode);
      } else if (searchSource === "tagNo") {
        setTagNo(selectedAsset.tagNo || cleanTagNo);
      } else {
        setAssetCode(selectedAsset.faCode || cleanFaCode);
        setTagNo(selectedAsset.tagNo || cleanTagNo);
      }

      setBranchCode(selectedAsset.branchCode || branchCode || "");
      setBranchName(selectedAsset.branchName || branchName || "");

      scrollAssetInformationToTop();
      loadHistory(selectedAsset);
      return true;
    } catch (error) {
      console.error("Search FA Find error:", error);
      if (!silentNotFound) setMessage(error?.message || "Unable to load asset information.");
      return false;
    } finally {
      setIsAssetLoading(false);
    }
  }, [branchCode, branchName, loadHistory, scrollAssetInformationToTop]);

  const buildFaLookupParams = (source = "") => ({
    branchCode: branchCode || "",
    faCode: source === "assetCode" ? assetCode || "" : "",
    tagNo: source === "tagNo" ? tagNo || "" : "",
  });

  const openFAMastLookup = async (source = "") => {
    setIsLookupLoading(true);
    setMessage("");
    setFaLookupSource(source);

    try {
      const lookupColsPromise = lookupColsCacheRef.current.length > 0
        ? Promise.resolve(lookupColsCacheRef.current)
        : getSelectedHSColConfig("lookupFAMast", currentUserRow?.userCode || currentUserRow?.USER_CODE || "");

      const [response, colConfig] = await Promise.all([
        postRequest("lookupFAMast", {
          PARAMS: JSON.stringify({
            json_data: buildFaLookupParams(source),
          }),
        }),
        lookupColsPromise,
      ]);

      const searchText = String(
        source === "assetCode" ? assetCode : source === "tagNo" ? tagNo : assetSearchText
      )
        .trim()
        .toLowerCase();
      const rawLookupRows = normalizeApiRows(response);
      const filteredLookupRows = searchText
        ? rawLookupRows.filter((row) => {
            const searchableValues = source === "tagNo"
              ? [row?.tagNo, row?.assetTag, row?.TAG_NO]
              : source === "assetCode"
                ? [row?.faCode, row?.assetNo, row?.FA_CODE]
                : [row?.faCode, row?.tagNo];

            return searchableValues.some((value) =>
              String(value || "").toLowerCase().includes(searchText)
            );
          })
        : rawLookupRows;

      const lookupRows = filteredLookupRows.map((row, index) => ({
        ...row,
        groupId: row?.groupId || row?.faCode || row?.FA_CODE || String(index + 1),
      }));

      if (lookupRows.length === 0) {
        setMessage("No fixed assets found for the selected lookup filters.");
        return;
      }

      const normalizedLookupCols = Array.isArray(colConfig) ? colConfig : [];
      lookupColsCacheRef.current = normalizedLookupCols;
      setFaLookupRows(lookupRows);
      setFaLookupColumns(normalizedLookupCols);
      setShowFAMastLookup(true);
    } catch (error) {
      console.error("Fixed Asset Master lookup error:", error);
      setMessage(error?.message || "Unable to load fixed asset records.");
    } finally {
      setIsLookupLoading(false);
    }
  };

  const handleCloseFAMastLookup = (selectedItems) => {
    setShowFAMastLookup(false);

    if (!selectedItems?.records) return;

    const selectedRecords = Array.isArray(selectedItems.records)
      ? selectedItems.records
      : [selectedItems.records];

    const row = selectedRecords[0];
    if (!row) return;

    const faCode = firstValue(row.faCode, row.assetNo, row.FA_CODE);
    const selectedTagNo = firstValue(row.tagNo, row.assetTag, row.TAG_NO);

    if (faLookupSource === "tagNo") {
      setTagNo(selectedTagNo);
      setAssetSearchText("");
      setSuggestionRows([]);
      setShowSuggestions(false);
      loadAsset({ tagNo: selectedTagNo, searchSource: "tagNo" });
      return;
    }

    if (faLookupSource === "smart") {
      setAssetSearchText("");
      setSuggestionRows([]);
      setShowSuggestions(false);
      setIsSuggestLoading(false);
      if (selectedTagNo) {
        loadAsset({ tagNo: selectedTagNo, searchSource: "smart" });
      } else {
        loadAsset({ faCode, searchSource: "smart" });
      }
      return;
    }

    setAssetCode(faCode);
    setAssetSearchText("");
    setSuggestionRows([]);
    setShowSuggestions(false);
    loadAsset({ faCode, searchSource: "assetCode" });
  };

  const handleSmartAssetSearch = useCallback(async (value = assetSearchText) => {
    const cleanValue = String(value || "").trim();

    if (!cleanValue) {
      setMessage("Please enter Asset Code or Property Tag No.");
      return;
    }

    setAssetSearchText("");
    setMessage("");
    setSuggestionRows([]);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    setIsSuggestLoading(false);
    scrollAssetInformationToTop();

    // Property Tag No. is the most common search value, so try it first.
    // If no asset is found, fallback to Asset Code without changing the API.
    const searchAttempts = [
      { faCode: "", tagNo: cleanValue, searchSource: "smart", silentNotFound: true },
      { faCode: cleanValue, tagNo: "", searchSource: "smart", silentNotFound: true },
    ];

    for (const searchParams of searchAttempts) {
      const foundAsset = await loadAsset(searchParams);
      if (foundAsset) return;
    }

    setAsset(null);
    setHistoryRows([]);
    setHistoryCols([]);
    setAssetCode("");
    setTagNo("");
    setMessage("No asset found.");
  }, [assetSearchText, loadAsset, scrollAssetInformationToTop]);

  const handleHideAssetSuggestions = () => {
    setSuggestionRows([]);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    setIsSuggestLoading(false);
  };

  const handleClearAssetSearch = () => {
    setAssetSearchText("");
    setAssetCode("");
    setTagNo("");
    setAsset(null);
    setHistoryRows([]);
    setHistoryCols([]);
    setShowPpeTagPreview(false);
    setIsAssetLoading(false);
    setIsHistoryLoading(false);
    setIsLookupLoading(false);
    setIsSuggestLoading(false);
    setSuggestionRows([]);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    setMessage("");
  };

  const handleQrScan = (value) => {
    const scannedValue = String(value || "").trim();
    if (!scannedValue) return;

    setAssetSearchText("");
    setTagNo(scannedValue);
    setSuggestionRows([]);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    setIsSuggestLoading(false);
    setShowQrReader(false);
    scrollAssetInformationToTop();
    loadAsset({ tagNo: scannedValue, searchSource: "tagNo" });
  };

  const handleSelectSuggestion = (row) => {
    const selectedTagNo = row?.tagNo || "";
    const selectedFaCode = row?.faCode || "";
    const selectedSearchText = firstValue(selectedTagNo, selectedFaCode);

    if (!selectedSearchText) return;

    setAssetSearchText("");
    setSuggestionRows([]);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    setIsSuggestLoading(false);
    scrollAssetInformationToTop();

    if (selectedTagNo) {
      setTagNo(selectedTagNo);
      loadAsset({ tagNo: selectedTagNo, searchSource: "smart" });
    } else {
      setAssetCode(selectedFaCode);
      loadAsset({ faCode: selectedFaCode, searchSource: "smart" });
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className={`fixed inset-0 flex items-center justify-center bg-black/45 backdrop-blur-[1px] ${
          isMaximized ? "z-[9999] h-[100dvh] w-screen overflow-hidden p-0" : "z-[80] p-2 sm:p-4"
        }`}
        onClick={onClose}
      >
        <div
          className={`flex w-full flex-col overflow-hidden bg-white shadow-2xl ${
            isMaximized
              ? "h-[100dvh] max-h-[100dvh] max-w-none rounded-none"
              : "max-h-[88vh] max-w-6xl rounded-xl"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100 py-1">
            <div className="flex min-w-0 items-center gap-2 pl-2 sm:pl-3">
              <FontAwesomeIcon icon={faIdCard} className="text-slate-500" />
              <div className="global-lookup-headertext-ui">
                Asset Finder
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                className="p-2 text-slate-400 transition-colors hover:text-slate-700"
                onClick={() => setIsMaximized((value) => !value)}
                title={isMaximized ? "Restore" : "Maximize"}
              >
                <FontAwesomeIcon
                  icon={isMaximized ? faCompress : faExpand}
                />
              </button>

              <button
                type="button"
                className="p-2 mr-2 text-slate-400 transition-colors hover:text-red-600"
                onClick={onClose}
                title="Close"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 sm:p-4">
            <SmartAssetSearchField
              value={assetSearchText}
              onChange={setAssetSearchText}
              onSearch={handleSmartAssetSearch}
              onLookup={() => openFAMastLookup("smart")}
              onClear={handleClearAssetSearch}
              onQr={() => setShowQrReader(true)}
              disabled={isLoading}
              suggestions={suggestionRows}
              showSuggestions={showSuggestions}
              isSuggestLoading={isSuggestLoading}
              selectedSuggestionIndex={selectedSuggestionIndex}
              onHighlightSuggestion={setSelectedSuggestionIndex}
              onHideSuggestions={handleHideAssetSuggestions}
              onSelectSuggestion={handleSelectSuggestion}
            />

            {message && (
              <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                {message}
              </div>
            )}

            <div ref={assetInfoRef} className="mt-4 scroll-mt-3 rounded-xl border bg-white shadow-sm">
              <div className="border-b bg-gradient-to-r from-blue-50 to-white px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-blue-700">
                    <FontAwesomeIcon icon={faIdCard} />
                    Asset Information
                  </div>

                  <button
                    type="button"
                    className="inline-flex min-w-[84px] items-center justify-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    onClick={() => {
                      setAsset(null);
                      setHistoryRows([]);
                      setHistoryCols([]);
                      setAssetSearchText("");
                      setAssetCode("");
                      setTagNo("");
                      setShowPpeTagPreview(false);
                      setSuggestionRows([]);
                      setShowSuggestions(false);
                      setIsSuggestLoading(false);
                      setMessage("");
                    }}
                    disabled={isLoading}
                  >
                    <FontAwesomeIcon icon={faRotateLeft} />
                    Reset
                  </button>
                </div>
              </div>

              {!asset ? (
                <div className="flex items-center gap-2 p-8 text-sm text-gray-500">
                  <FontAwesomeIcon icon={faDatabase} className="text-blue-300" />
                  Find by Asset Code, Property Tag No., Search, or Scan to display asset details.
                </div>
              ) : (
                <div className="p-3">
                  <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.75fr)]">
                    <div className="grid grid-cols-1 gap-3">
                      <DetailSection title="Asset Identity">
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
                          <ReadOnlyField id="fa_find_code" label="Asset Code" value={asset.faCode} />
                          <ReadOnlyField id="fa_find_tag" label="Property Tag No." value={asset.tagNo} />
                          <ReadOnlyField id="fa_find_barcode" label="Bar Code" value={asset.barCode} />
                          <ReadOnlyField id="fa_find_status" label="Status" value={getStatusLabel(asset)} />
                          <ReadOnlyField id="fa_find_name" label="Asset Name" value={asset.faName} className="md:col-span-2" />
                          <ReadOnlyField id="fa_find_specs" label="Specifications" value={asset.faSpecs} className="md:col-span-2" />
                          <ReadOnlyField id="fa_find_serial" label="Serial No." value={asset.serialNo} />
                          <ReadOnlyField id="fa_find_model" label="Model No." value={asset.modelNo} />
                          <ReadOnlyField id="fa_find_old_code" label="Old Code" value={asset.oldCode} />
                          <ReadOnlyField id="fa_find_acq_date" label="Acq Date" value={asset.acqDate} />
                        </div>
                      </DetailSection>

                      <DetailSection title="Assignment">
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                          <ReadOnlyField id="fa_find_branch" label="Branch" value={asset.branchCode} />
                          <ReadOnlyField
                            id="fa_find_location"
                            label="Location"
                            value={asset.flocName ? `${asset.flocCode || ""} - ${asset.flocName}` : asset.flocCode}
                          />
                          <ReadOnlyField
                            id="fa_find_department"
                            label="Department"
                            value={asset.rcName ? `${asset.rcCode || ""} - ${asset.rcName}` : asset.rcCode}
                          />
                          <ReadOnlyField
                            id="fa_find_employee"
                            label="Employee"
                            value={asset.empName ? `${asset.empNo || ""} - ${asset.empName}` : asset.empNo}
                          />
                          <ReadOnlyField
                            id="fa_find_category"
                            label="Category"
                            value={asset.categName ? `${asset.categCode || ""} - ${asset.categName}` : asset.categCode}
                          />
                          <ReadOnlyField
                            id="fa_find_class"
                            label="Classification"
                            value={asset.className ? `${asset.classCode || ""} - ${asset.className}` : asset.classCode}
                          />
                        </div>
                      </DetailSection>

                      <DetailSection title="Source References">
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
                          <ReadOnlyField
                            id="fa_find_vendor"
                            label="Vendor"
                            value={asset.vendName ? `${asset.vendCode || ""} - ${asset.vendName}` : asset.vendCode}
                            className="md:col-span-2"
                          />
                          <ReadOnlyField id="fa_find_farr" label="FARR No." value={asset.farrNo} />
                          <ReadOnlyField id="fa_find_po" label="PO No." value={asset.poNo} />
                          <ReadOnlyField id="fa_find_cutoff" label="Acquisition Month" value={asset.cutoffCode} />
                          <ReadOnlyField id="fa_find_depr_cutoff" label="Depreciation Start" value={asset.dcutoffCode} />
                        </div>
                      </DetailSection>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      <DetailSection title="Financial Summary" className="h-fit">
                        {withCostAmount ? (
                          <div className="grid grid-cols-2 gap-2">
                            <FinancialMetricCard
                              label="Acq. Cost"
                              value={formatAmount(asset.acqCost)}
                            />
                             <FinancialMetricCard
                              label="Depr. Month"
                              value={formatAmount(asset.deprMonth)}
                            />
                              <FinancialMetricCard
                              label="Accum. Depr."
                              value={formatAmount(asset.accumDepr)}
                            />
                              <FinancialMetricCard
                              label="Salvage Value"
                              value={formatAmount(asset.salvageValue)}
                            />

                            <FinancialMetricCard
                              label="NB Value"
                              value={formatAmount(asset.nbValue)}
                              accent
                            />                                              
                          </div>
                        ) : (
                          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-center text-xs text-slate-500">
                            Amount fields are hidden for your user access.
                          </div>
                        )}
                      </DetailSection>

                      {assetTagPreviewInfo && (
                        <AssetTagPreviewCard
                          tagInfo={assetTagPreviewInfo}
                          onOpenPreview={() => setShowPpeTagPreview(true)}
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 rounded-xl border bg-white shadow-sm">
              <div className="border-b bg-gradient-to-r from-blue-50 to-white px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-blue-700">
                    <FontAwesomeIcon icon={faHistory} />
                    Historical Data / Asset Move History
                  </div>
                </div>
              </div>

              <div className="global-tran-table-main-div-ui max-h-[420px] overflow-auto">
                {isHistoryLoading ? (
                  <HistoryTableLoader />
                ) : !asset ? (
                  <div className="p-8 text-sm text-gray-500">No asset selected.</div>
                ) : historyRows.length === 0 ? (
                  <div className="p-8 text-sm text-gray-500">No asset history found.</div>
                ) : (
                  <SearchGlobalReportTable
                    key={`${asset?.faCode || "asset"}-${historyRows.length}`}
                    columns={visibleHistoryCols}
                    data={historyRows}
                    itemsPerPage={10}
                    docType={historyReportDocType}
                    rightActionLabel="View"
                    onRowAction={openPathUrlDocument}
                  />
                )}
              </div>
            </div>
          </div>

        </div>
      </div>

      {isLoading && <LoadingSpinner />}

      {showFAMastLookup && (
        <GlobalLookupModalv1
          isOpen={showFAMastLookup}
          title="Fixed Asset Master"
          data={faLookupRows}
          endpoint={faLookupColumns}
          btnCaption="Get Selected Assets"
          idKey="groupId"
          onClose={handleCloseFAMastLookup}
          onCancel={() => setShowFAMastLookup(false)}
          singleSelect={true}
          overlayZIndexClass={isMaximized ? "z-[10050]" : "z-[120]"}
        />
      )}

      {showQrReader && (
        <BarcodeQrReaderModal
          isOpen={showQrReader}
          title="Scan Property Tag QR Code"
          scanOnce={true}
          onScan={handleQrScan}
          onClose={() => setShowQrReader(false)}
        />
      )}

      {showPpeTagPreview && assetTagPreviewInfo && (
        <SearchPPETag
          isOpen={showPpeTagPreview}
          companyInfo={assetTagPreviewInfo.companyInfo}
          documentInfo={assetTagPreviewInfo.documentInfo}
          detailRow={assetTagPreviewInfo.detailRow}
          serialRow={assetTagPreviewInfo.serialRow}
          viewMode={true}
          onClose={() => setShowPpeTagPreview(false)}
        />
      )}
    </>
  );
};

export default SearchFAFind;
