import React, { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTimes,
  faSpinner,
  faSyncAlt,
  faSort,
  faSearch,
  faEraser,
  faExclamationTriangle,
} from "@fortawesome/free-solid-svg-icons";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";

function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

function parseQStatResponse(payload) {
  let value = payload;

  for (let attempt = 0; attempt < 10; attempt += 1) {
    if (value === null || value === undefined || value === "") {
      return [];
    }

    if (typeof value === "string") {
      try {
        value = JSON.parse(value);
        continue;
      } catch (error) {
        console.error(
          "SearchQStatRef: Unable to parse JSON response.",
          value,
          error
        );
        return [];
      }
    }

    if (Array.isArray(value)) {
      if (
        value.length === 1 &&
        value[0] &&
        typeof value[0] === "object" &&
        !Array.isArray(value[0]) &&
        Object.prototype.hasOwnProperty.call(value[0], "result")
      ) {
        value = value[0].result;
        continue;
      }

      return value;
    }

    if (typeof value === "object") {
      if (Object.prototype.hasOwnProperty.call(value, "data")) {
        value = value.data;
        continue;
      }

      if (Object.prototype.hasOwnProperty.call(value, "result")) {
        value = value.result;
        continue;
      }
    }

    break;
  }

  return [];
}

function normalizeQStat(item = {}) {
  return {
    ...item,

    qstatCode: String(
      item.qstatCode ??
        item.qStatCode ??
        item.qstat_code ??
        item.q_stat_code ??
        item.QSTAT_CODE ??
        item.Q_STAT_CODE ??
        item.code ??
        ""
    ).trim(),

    qstatName: String(
      item.qstatName ??
        item.qStatName ??
        item.qstat_name ??
        item.q_stat_name ??
        item.QSTAT_NAME ??
        item.Q_STAT_NAME ??
        item.description ??
        item.name ??
        ""
    ).trim(),
  };
}

const QstatLookupModal = ({ isOpen, onClose, customParam }) => {
  const [filters, setFilters] = useState({
    qstatCode: "",
    qstatName: "",
  });

  const [sortConfig, setSortConfig] = useState({
    key: "",
    direction: "asc",
  });

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 1000;

  const debouncedFilters = useDebounce(filters, 300);

  const hasActiveFilters = Object.values(filters).some(
    (value) => String(value ?? "").trim() !== ""
  );

  const resetFilters = () => {
    setFilters({
      qstatCode: "",
      qstatName: "",
    });

    setCurrentPage(1);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedFilters]);

  useEffect(() => {
    if (!isOpen) {
      setSortConfig({
        key: "",
        direction: "asc",
      });

      setFilters({
        qstatCode: "",
        qstatName: "",
      });

      setCurrentPage(1);
    }
  }, [isOpen]);

  const {
    data: qstats = [],
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["lookupQStat", customParam],

    queryFn: async () => {
      const response = await apiClient.get("/lookupQStat", {
        params: {
          PARAMS: JSON.stringify({}),
        },
      });

      console.log("SearchQStatRef API response:", response?.data);

      const parsedData = parseQStatResponse(response?.data);

      if (!Array.isArray(parsedData)) {
        console.error(
          "SearchQStatRef: Parsed response is not an array.",
          parsedData
        );

        return [];
      }

      return parsedData
        .map(normalizeQStat)
        .filter((item) => item.qstatCode !== "");
    },

    enabled: Boolean(isOpen),
    staleTime: 0,
    gcTime: 1000 * 60 * 10,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    placeholderData: keepPreviousData,
  });

  const filteredAndSorted = useMemo(() => {
    if (!Array.isArray(qstats) || qstats.length === 0) {
      return [];
    }

    const codeFilter = String(debouncedFilters.qstatCode ?? "")
      .trim()
      .toLowerCase();

    const nameFilter = String(debouncedFilters.qstatName ?? "")
      .trim()
      .toLowerCase();

    const result = qstats.filter((item) => {
      const code = String(item?.qstatCode ?? "").toLowerCase();
      const name = String(item?.qstatName ?? "").toLowerCase();

      return code.includes(codeFilter) && name.includes(nameFilter);
    });

    if (!sortConfig.key) {
      return result;
    }

    return [...result].sort((firstItem, secondItem) => {
      const firstValue = firstItem?.[sortConfig.key] ?? "";
      const secondValue = secondItem?.[sortConfig.key] ?? "";

      const comparison = String(firstValue).localeCompare(
        String(secondValue),
        undefined,
        {
          numeric: true,
          sensitivity: "base",
        }
      );

      return sortConfig.direction === "asc" ? comparison : -comparison;
    });
  }, [qstats, debouncedFilters, sortConfig]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;

    return filteredAndSorted.slice(startIndex, startIndex + pageSize);
  }, [filteredAndSorted, currentPage]);

  const handleApply = (qstat) => {
    if (typeof onClose === "function") {
      onClose(qstat);
    }
  };

  const handleClose = () => {
    if (typeof onClose === "function") {
      onClose(null);
    }
  };

  const handleSort = (key) => {
    setSortConfig((previous) => ({
      key,
      direction:
        previous.key === key && previous.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleFilterChange = (key, value) => {
    setFilters((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const handleKeyDown = (event, qstat) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleApply(qstat);
    }
  };

  const getErrorMessage = () =>
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    "An unexpected error occurred while loading Quality Status records.";

  if (!isOpen) {
    return null;
  }

  const columns = [
    {
      label: "Quality Status Code",
      key: "qstatCode",
      headerClassName: "w-[220px]",
    },
    {
      label: "Quality Status Name",
      key: "qstatName",
      headerClassName: "w-[500px]",
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quality-status-modal-title"
    >
      <div className="relative flex max-h-[75vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl transform animate-scale-in">
        <div className="flex items-center justify-between border-b bg-slate-100 p-2">
          <div className="flex items-center gap-3">
            <div className="relative">
              <h2
                id="quality-status-modal-title"
                className="pl-2 text-md font-bold tracking-tight text-blue-800 propercase"
              >
                Select Quality Status
              </h2>

              {isFetching && (
                <div className="absolute -right-4 -top-1 flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="flex items-center gap-1.5 rounded bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-600 transition-all hover:bg-blue-100"
                title="Clear filters"
              >
                <FontAwesomeIcon icon={faEraser} />
                CLEAR
              </button>
            )}

            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="p-2 text-slate-400 transition-colors hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
              title="Refresh Quality Status"
            >
              <FontAwesomeIcon
                icon={faSyncAlt}
                size="sm"
                spin={isFetching}
              />
            </button>

            <button
              type="button"
              onClick={handleClose}
              className="p-2 text-slate-400 transition-colors hover:text-red-600"
              title="Close"
            >
              <FontAwesomeIcon icon={faTimes} size="lg" />
            </button>
          </div>
        </div>

        <div className="custom-scrollbar flex-grow overflow-auto bg-white">
          {isLoading ? (
            <div className="flex h-64 flex-col items-center justify-center text-slate-400">
              <FontAwesomeIcon
                icon={faSpinner}
                spin
                size="2x"
                className="mb-4 text-blue-500"
              />

              <p className="text-sm">Loading Quality Status...</p>
            </div>
          ) : isError ? (
            <div className="flex h-64 flex-col items-center justify-center px-6 text-center">
              <FontAwesomeIcon
                icon={faExclamationTriangle}
                size="2x"
                className="mb-4 text-red-500"
              />

              <p className="text-sm font-bold text-red-600">
                Unable to load Quality Status
              </p>

              <p className="mt-2 max-w-md text-xs text-slate-500">
                {getErrorMessage()}
              </p>

              <button
                type="button"
                onClick={() => refetch()}
                className="mt-4 rounded bg-blue-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-700"
              >
                Try Again
              </button>
            </div>
          ) : (
            <table className="min-w-full border-separate border-spacing-0">
              <thead className="sticky top-0 z-10 bg-slate-200">
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column.key}
                      className={`border-b border-slate-200 px-4 py-2 text-left ${column.headerClassName}`}
                    >
                      <button
                        type="button"
                        onClick={() => handleSort(column.key)}
                        className="group mb-1.5 flex w-full cursor-pointer items-center gap-1 text-left"
                      >
                        <span className="block text-[12px] font-bold text-slate-600 propercase">
                          {column.label}
                        </span>

                        <FontAwesomeIcon
                          icon={faSort}
                          className={`text-[9px] ${
                            sortConfig.key === column.key
                              ? "text-blue-500 opacity-100"
                              : "opacity-20"
                          }`}
                        />
                      </button>

                      <div className="relative">
                        <input
                          type="text"
                          value={filters[column.key]}
                          onChange={(event) =>
                            handleFilterChange(column.key, event.target.value)
                          }
                          placeholder="Filter..."
                          className="w-full rounded border border-slate-200 bg-white py-1.5 pl-7 pr-2 text-xs font-normal outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        />

                        <FontAwesomeIcon
                          icon={faSearch}
                          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[9px] text-slate-300"
                        />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {paginatedData.length > 0 ? (
                  paginatedData.map((qstat, index) => (
                    <tr
                      key={`${qstat.qstatCode}-${index}`}
                      tabIndex={0}
                      onClick={() => handleApply(qstat)}
                      onKeyDown={(event) => handleKeyDown(event, qstat)}
                      className="group cursor-pointer transition-colors hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
                    >
                      <td className="w-[220px] px-4 py-2 text-xs font-bold text-slate-600">
                        {qstat.qstatCode}
                      </td>

                      <td className="w-[500px] px-4 py-2 text-xs font-medium text-slate-600">
                        {qstat.qstatName}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={2}
                      className="px-4 py-20 text-center text-sm italic text-slate-400"
                    >
                      No matching Quality Status records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex items-center justify-between border-t bg-slate-50 p-3 px-4">
          <div className="flex flex-col">
            <span className="text-[12px] font-medium text-slate-500">
              Total Records: {filteredAndSorted.length}
            </span>

            {isFetching && !isLoading && (
              <span className="flex items-center gap-1 text-[9px] font-bold uppercase text-blue-500 animate-pulse">
                <span className="h-1 w-1 rounded-full bg-blue-500" />
                Syncing Quality Status...
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QstatLookupModal;