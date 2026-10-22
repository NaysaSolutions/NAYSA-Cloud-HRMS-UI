/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes, faSpinner, faSearch } from "@fortawesome/free-solid-svg-icons";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { formatDateToMMDDYYYY } from "@/NAYSA Cloud/Global/DateFormatInput.jsx";
import { useSwalErrorAlertAPI as showErrorAlert } from "@/NAYSA Cloud/Global/behavior.jsx";

const columns = [
  { key: "code", label: "Cut-Off Code", width: "w-[16%]" },
  { key: "description", label: "Description", width: "w-[30%]" },
  { key: "cutoffFreq", label: "Freq", width: "w-[14%]" },
  { key: "cutoffStartDate", label: "Start Date", width: "w-[20%]" },
  { key: "cutoffEndDate", label: "End Date", width: "w-[20%]" },
];

const emptyFilters = Object.fromEntries(columns.map(({ key }) => [key, ""]));

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timeout);
  }, [value, delay]);
  return debouncedValue;
}

const toDisplayDate = (value) => {
  if (!value) return "";
  return /^\d{2}\/\d{2}\/\d{4}$/.test(String(value))
    ? String(value)
    : formatDateToMMDDYYYY(value);
};

const normalizeFrequency = (freq) => {
  const val = String(freq || "").trim().toUpperCase();
  if (val.startsWith("S")) return "S";
  if (val.startsWith("M")) return "M";
  if (val.startsWith("D") || val.startsWith("W")) return "D";
  return val;
};

const parseCutoffsResponse = (response) => {
  try {
    const rawData = response?.data?.data ?? response?.data ?? [];
    if (Array.isArray(rawData) && rawData[0]?.result) {
      const parsed = JSON.parse(rawData[0].result);
      if (Array.isArray(parsed)) return parsed;
      if (Array.isArray(parsed?.cutoffs)) return parsed.cutoffs;
    }
    if (typeof rawData === "string") {
      return JSON.parse(rawData);
    }
    if (Array.isArray(rawData)) return rawData;
    return [];
  } catch {
    return [];
  }
};

const SearchCutoffRef = ({ isOpen, payFrequency, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [cutoffs, setCutoffs] = useState([]);
  const [filters, setFilters] = useState(emptyFilters);
  const debouncedFilters = useDebounce(filters, 300);

  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();
    setFilters(emptyFilters);
    setCutoffs([]);

    const loadCutoffs = async () => {
      setLoading(true);
      try {
        let items = [];
        try {
          const response = await apiClient.get("/lookupCutOff", {
            signal: controller.signal,
            params: payFrequency
              ? { json_data: JSON.stringify({ cutoffFreq: payFrequency }) }
              : {},
          });
          items = parseCutoffsResponse(response);
        } catch {
          const fallback = await apiClient.get(
            "/overtimeTransactions/selectionReferences",
            { signal: controller.signal },
          );
          items = parseCutoffsResponse(fallback);
        }

        if (controller.signal.aborted) return;

        const normalized = items.map((item) => ({
          code: String(item.code || item.cutoffCode || item.CUTOFF_CODE || "").trim(),
          description: String(
            item.description || item.cutoffName || item.CUTOFF_NAME || "",
          ).trim(),
          cutoffFreq: normalizeFrequency(
            item.cutoffFreq || item.cutoffFrequency || item.CUTOFF_FREQ,
          ),
          cutoffStartDate: toDisplayDate(
            item.cutoffStartDate || item.startDate || item.CUTOFF_STARTDATE,
          ),
          cutoffEndDate: toDisplayDate(
            item.cutoffEndDate || item.endDate || item.CUTOFF_ENDDATE,
          ),
          cutoffDate: toDisplayDate(item.cutoffDate || item.CUTOFF_DATE),
          year: item.year || item.YEAR || "",
          cutoffGrp: item.cutoffGrp || item.CUTOFF_GRP || "",
          status: item.status || item.STATUS || "ACTIVE",
        }));

        setCutoffs(normalized.filter((c) => c.code));
      } catch (error) {
        if (!controller.signal.aborted) {
          showErrorAlert(
            "Payroll Cut-Off Load Error",
            error?.response?.data?.message || error.message,
          );
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    loadCutoffs();
    return () => controller.abort();
  }, [isOpen, payFrequency]);

  const filtered = useMemo(() => {
    const targetFreq = normalizeFrequency(payFrequency);
    const freqFiltered = targetFreq
      ? cutoffs.filter((c) => !c.cutoffFreq || c.cutoffFreq === targetFreq)
      : cutoffs;

    const baseList = freqFiltered.length > 0 ? freqFiltered : cutoffs;
    return baseList.filter((cutoff) =>
      columns.every(({ key }) =>
        String(cutoff[key] ?? "").toLowerCase().includes(debouncedFilters[key].trim().toLowerCase()),
      ),
    );
  }, [cutoffs, payFrequency, debouncedFilters]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 animate-fade-in">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cutoff-lookup-title"
        className="relative flex max-h-[75vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b bg-slate-100 p-2 dark:border-slate-700 dark:bg-slate-800">
          <h2 id="cutoff-lookup-title" className="text-md pl-2 font-bold text-blue-800 dark:text-white">
            Select Payroll Cut-Off
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onClose(null)}
              className="p-2 text-slate-400 hover:text-red-600"
              aria-label="Close payroll cut-off lookup"
            >
              <FontAwesomeIcon icon={faTimes} size="lg" />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="min-h-0 flex-grow overflow-auto bg-white dark:bg-slate-900">
          {loading ? (
            <div role="status" aria-label="Loading payroll cut-offs" className="flex h-64 flex-col items-center justify-center text-slate-400">
              <FontAwesomeIcon icon={faSpinner} spin size="2x" className="mb-4 text-blue-500" />
            </div>
          ) : (
            <table className="w-full min-w-[800px] table-fixed border-separate border-spacing-0">
              <colgroup>
                {columns.map((column) => (
                  <col key={column.key} className={column.width} />
                ))}
              </colgroup>
              <thead className="sticky top-0 z-10 bg-slate-200 dark:bg-slate-700">
                <tr>
                  {columns.map((column) => (
                    <th key={column.key} scope="col" className="border-b border-slate-200 px-4 py-2 text-left dark:border-slate-700">
                      <div className="mb-1.5 flex items-center gap-1">
                        <label htmlFor={`cutoff-filter-${column.key}`} className="mb-1 block text-[12px] font-bold text-slate-600 dark:text-slate-300">
                          {column.label}
                        </label>
                      </div>
                      <div className="relative">
                        <input
                          id={`cutoff-filter-${column.key}`}
                          type="text"
                          value={filters[column.key]}
                          onChange={(event) => setFilters((current) => ({ ...current, [column.key]: event.target.value }))}
                          placeholder="Filter..."
                          className="w-full rounded border border-slate-200 py-1.5 pl-7 pr-2 text-xs font-normal dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                        />
                        <FontAwesomeIcon icon={faSearch} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[9px] text-slate-300" />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filtered.length > 0 ? filtered.map((cutoff) => (
                  <tr
                    key={cutoff.code}
                    onClick={() => onClose(cutoff)}
                    className="group cursor-pointer hover:bg-blue-50 dark:hover:bg-slate-800"
                  >
                    <td className="break-words px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300">{cutoff.code}</td>
                    <td className="break-words px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300">{cutoff.description}</td>
                    <td className="px-4 py-2 text-center text-xs font-medium text-slate-600 dark:text-slate-300">{cutoff.cutoffFreq}</td>
                    <td className="whitespace-nowrap px-4 py-2 text-center text-xs font-medium text-slate-600 dark:text-slate-300">{cutoff.cutoffStartDate}</td>
                    <td className="whitespace-nowrap px-4 py-2 text-center text-xs font-medium text-slate-600 dark:text-slate-300">{cutoff.cutoffEndDate}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-8 text-center text-xs text-slate-400">
                      No payroll cut-off records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchCutoffRef;
