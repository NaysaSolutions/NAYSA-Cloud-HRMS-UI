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

function parseBillTermResponse(payload) {
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
          "SearchBillTermRef: Unable to parse JSON response.",
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

function normalizeBillTerm(item = {}) {
  return {
    ...item,

    billtermCode: String(
      item.billtermCode ??
      item.billTermCode ??
      item.billterm_code ??
      item.bill_term_code ??
      item.BILLTERM_CODE ??
      item.BILL_TERM_CODE ??
      item.code ??
      ""
    ).trim(),

    billtermName: String(
      item.billtermName ??
      item.billTermName ??
      item.billterm_name ??
      item.bill_term_name ??
      item.BILLTERM_NAME ??
      item.BILL_TERM_NAME ??
      item.description ??
      item.name ??
      ""
    ).trim(),

    daysDue:
      item.daysDue ??
      item.dueDays ??
      item.days_due ??
      item.DAYS_DUE ??
      item.noOfDays ??
      item.numberOfDays ??
      0,
  };
}

const SearchBillTermRef = ({ isOpen, onClose }) => {
  const [filters, setFilters] = useState({
    billtermCode: "",
    billtermName: "",
    daysDue: "",
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
      billtermCode: "",
      billtermName: "",
      daysDue: "",
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
        billtermCode: "",
        billtermName: "",
        daysDue: "",
      });

      setCurrentPage(1);
    }
  }, [isOpen]);

  const {
    data: billterms = [],
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["lookupBillterm"],

    queryFn: async () => {
      const response = await apiClient.get("/lookupBillterm", {
        params: {
          PARAMS: "ActiveAll",
        },
      });

      console.log("SearchBillTermRef API response:", response?.data);

      const parsedData = parseBillTermResponse(response?.data);

      if (!Array.isArray(parsedData)) {
        console.error(
          "SearchBillTermRef: Parsed response is not an array.",
          parsedData
        );

        return [];
      }

      return parsedData
        .map(normalizeBillTerm)
        .filter((item) => item.billtermCode !== "");
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
    if (!Array.isArray(billterms) || billterms.length === 0) {
      return [];
    }

    const codeFilter = String(debouncedFilters.billtermCode ?? "")
      .trim()
      .toLowerCase();

    const nameFilter = String(debouncedFilters.billtermName ?? "")
      .trim()
      .toLowerCase();

    const daysFilter = String(debouncedFilters.daysDue ?? "")
      .trim()
      .toLowerCase();

    const result = billterms.filter((item) => {
      const code = String(item?.billtermCode ?? "").toLowerCase();
      const name = String(item?.billtermName ?? "").toLowerCase();
      const days = String(item?.daysDue ?? "").toLowerCase();

      return (
        code.includes(codeFilter) &&
        name.includes(nameFilter) &&
        days.includes(daysFilter)
      );
    });

    if (!sortConfig.key) {
      return result;
    }

    return [...result].sort((firstItem, secondItem) => {
      const firstValue = firstItem?.[sortConfig.key] ?? "";
      const secondValue = secondItem?.[sortConfig.key] ?? "";

      if (sortConfig.key === "daysDue") {
        const firstNumber = Number(firstValue) || 0;
        const secondNumber = Number(secondValue) || 0;

        return sortConfig.direction === "asc"
          ? firstNumber - secondNumber
          : secondNumber - firstNumber;
      }

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
  }, [billterms, debouncedFilters, sortConfig]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;

    return filteredAndSorted.slice(startIndex, startIndex + pageSize);
  }, [filteredAndSorted, currentPage]);

  const handleApply = (term) => {
    if (typeof onClose === "function") {
      onClose(term);
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

  const handleKeyDown = (event, term) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleApply(term);
    }
  };

  const getErrorMessage = () =>
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    "An unexpected error occurred while loading Billing Terms.";

  if (!isOpen) {
    return null;
  }

  const columns = [
    {
      label: "Term Code",
      key: "billtermCode",
      headerClassName: "w-[160px]",
    },
    {
      label: "Description",
      key: "billtermName",
      headerClassName: "w-[420px]",
    },
    {
      label: "Days Due",
      key: "daysDue",
      headerClassName: "w-[160px]",
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="billing-term-modal-title"
    >
      <div className="relative flex max-h-[75vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl transform animate-scale-in">
        <div className="flex items-center justify-between border-b bg-slate-100 p-2">
          <div className="flex items-center gap-3">
            <div className="relative">
              <h2
                id="billing-term-modal-title"
                className="pl-2 text-md font-bold tracking-tight text-blue-800 propercase"
              >
                Select Billing Term
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
              title="Refresh Billing Terms"
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

              <p className="text-sm">Loading Billing Terms...</p>
            </div>
          ) : isError ? (
            <div className="flex h-64 flex-col items-center justify-center px-6 text-center">
              <FontAwesomeIcon
                icon={faExclamationTriangle}
                size="2x"
                className="mb-4 text-red-500"
              />

              <p className="text-sm font-bold text-red-600">
                Unable to load Billing Terms
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
                          className={`text-[9px] ${sortConfig.key === column.key
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
                            handleFilterChange(
                              column.key,
                              event.target.value
                            )
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
                  paginatedData.map((term, index) => (
                    <tr
                      key={`${term.billtermCode}-${index}`}
                      tabIndex={0}
                      onClick={() => handleApply(term)}
                      onKeyDown={(event) => handleKeyDown(event, term)}
                      className="group cursor-pointer transition-colors hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
                    >
                      <td className="w-[160px] px-4 py-2 text-xs font-bold text-slate-600">
                        {term.billtermCode}
                      </td>

                      <td className="w-[420px] px-4 py-2 text-xs font-medium text-slate-600">
                        {term.billtermName}
                      </td>

                      <td className="w-[160px] px-4 py-2 text-right text-xs text-slate-500">
                        {term.daysDue}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-20 text-center text-sm italic text-slate-400"
                    >
                      No matching Billing Terms found.
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
                Syncing Terms...
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchBillTermRef;