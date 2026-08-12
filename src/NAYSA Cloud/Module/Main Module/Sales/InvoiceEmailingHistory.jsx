import { useCallback, useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCalendarAlt,
  faMagnifyingGlass,
  faUndo,
  faUser,
} from "@fortawesome/free-solid-svg-icons";
import Swal from "sweetalert2";

import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import { useSelectedHSColConfig } from "@/NAYSA Cloud/Global/selectedData";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import SearchGlobalReportTable from "@/NAYSA Cloud/Lookup/SearchGlobalReportTable.jsx";
import BranchLookupModal from "@/NAYSA Cloud/Lookup/SearchBranchRef";
import CustomerMastLookupModal from "@/NAYSA Cloud/Lookup/SearchCustMast";

const API_ENDPOINT = "iesHistory";
const COLUMN_CONFIG_ENDPOINT = "iesHistory";

const formatDateInput = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getDefaultDates = () => {
  const today = new Date();
  return {
    startDate: formatDateInput(
      new Date(today.getFullYear(), today.getMonth(), 1)
    ),
    endDate: formatDateInput(today),
  };
};

export default function InvoiceQueuingHistory() {
  const defaults = getDefaultDates();
  const tableRef = useRef(null);
  const loadedColumnsRef = useRef(false);

  const [state, setState] = useState({
    startDate: defaults.startDate,
    endDate: defaults.endDate,
    branchCode: "",
    branchName: "",
    custCode: "",
    custName: "",
    rows: [],
    columns: [],
    showBranchModal: false,
    showCustomerModal: false,
    isLoading: false,
    showSpinner: false,
  });

  const updateState = useCallback(
    (patch) => setState((previous) => ({ ...previous, ...patch })),
    []
  );

  const {
    startDate,
    endDate,
    branchCode,
    branchName,
    custCode,
    custName,
    rows,
    columns,
    showBranchModal,
    showCustomerModal,
    isLoading,
    showSpinner,
  } = state;

  useEffect(() => {
    let timer;

    if (isLoading) {
      timer = window.setTimeout(() => updateState({ showSpinner: true }), 200);
    } else {
      updateState({ showSpinner: false });
    }

    return () => window.clearTimeout(timer);
  }, [isLoading, updateState]);

  useEffect(() => {
    if (loadedColumnsRef.current) return undefined;

    let active = true;

    const loadColumns = async () => {
      try {
        const result = await useSelectedHSColConfig(COLUMN_CONFIG_ENDPOINT);
        if (!active) return;

        updateState({
          columns: Array.isArray(result)
            ? result.map((column) => ({ ...column }))
            : [],
        });
        loadedColumnsRef.current = true;
      } catch (error) {
        console.error("Unable to load invoice queuing history columns:", error);
        if (active) {
          Swal.fire(
            "Column setup unavailable",
            "Unable to load the invoice queuing history column configuration.",
            "error"
          );
        }
      }
    };

    loadColumns();

    return () => {
      active = false;
    };
  }, [updateState]);

  const handleFind = useCallback(async () => {
    if (!startDate || !endDate) {
      await Swal.fire(
        "Date range required",
        "Please enter both a start date and an end date.",
        "warning"
      );
      return;
    }

    if (startDate > endDate) {
      await Swal.fire(
        "Invalid date range",
        "Start Date must not be later than End Date.",
        "warning"
      );
      return;
    }

    updateState({ isLoading: true });

    try {
      const response = await apiClient.get(API_ENDPOINT, {
        params: {
          json_data: JSON.stringify({
            json_data: {
              startDate: startDate || "",
              endDate: endDate || "",
              branchCode: branchCode || "",
              custCode: custCode || "",
            },
          }),
        },
      });

      const payload = response?.data;

      if (payload?.success === false) {
        throw new Error(
          payload?.message || "Unable to retrieve the history."
        );
      }

      const rawResult =
        payload?.data?.[0]?.result ??
        payload?.data?.result ??
        "[]";

      let historyRows = [];

      if (Array.isArray(rawResult)) {
        historyRows = rawResult;
      } else if (
        typeof rawResult === "string" &&
        rawResult.trim() !== ""
      ) {
        historyRows = JSON.parse(rawResult);
      }

      updateState({
        rows: Array.isArray(historyRows) ? historyRows : [],
      });
    } catch (error) {
      console.error("Unable to load invoice queuing history:", error);
      updateState({ rows: [] });

      await Swal.fire(
        "Invoice Queuing History",
        error?.response?.data?.message ||
          error?.message ||
          "Unable to retrieve the invoice queuing history.",
        "error"
      );
    } finally {
      updateState({ isLoading: false });
    }
  }, [branchCode, custCode, endDate, startDate, updateState]);

  const handleReset = useCallback(() => {
    updateState({
      ...getDefaultDates(),
      branchCode: "",
      branchName: "",
      custCode: "",
      custName: "",
      rows: [],
    });
  }, [updateState]);

  const handleViewDocument = useCallback((row) => {
    if (!row?.pathUrl) return;

    try {
      const url = new URL(row.pathUrl, window.location.origin);
      window.open(url.href, "_blank", "noopener,noreferrer");
    } catch {
      Swal.fire(
        "Document unavailable",
        "The document URL is invalid.",
        "warning"
      );
    }
  }, []);

  return (
    <div className="global-ref-main-div-ui">
      {showSpinner && <LoadingSpinner />}

      <div className="global-ref-header-ui">
        <div className="w-full flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h1 className="global-ref-headertext-ui w-full md:w-auto truncate text-center md:text-left">
            Invoice Queuing History
          </h1>

          <div className="flex flex-nowrap items-center justify-center gap-2 md:justify-end">
            <button
              type="button"
              onClick={handleFind}
              disabled={isLoading}
              className="shrink-0 px-3 py-2 text-xs font-medium rounded-md text-white bg-blue-600 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FontAwesomeIcon icon={faMagnifyingGlass} />
              <span className="hidden lg:inline ml-2">Find</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              disabled={isLoading}
              className="shrink-0 px-3 py-2 text-xs font-medium rounded-md text-white bg-blue-600 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FontAwesomeIcon icon={faUndo} />
              <span className="hidden lg:inline ml-2">Reset</span>
            </button>
          </div>
        </div>
      </div>

      <div className="mt-32 sm:mt-24 px-1">
        <div className="global-tran-tab-div-ui">
          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
            <div className="grid grid-cols-1 divide-y divide-gray-200 lg:grid-cols-[3fr_2fr] lg:divide-x lg:divide-y-0">
              <section className="p-5">
                <h3 className="flex items-center gap-2 text-gray-800 font-semibold mb-4">
                  <FontAwesomeIcon className="text-blue-600" icon={faUser} />
                  Reference Filters
                </h3>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <FieldRenderer
                    type="lookup"
                    id="branchCode"
                    name="branchCode"
                    label="Branch"
                    value={branchName}
                    editableLookup
                    disabled={isLoading}
                    onClear={() =>
                      updateState({
                        branchCode: "",
                        branchName: "",
                        rows: [],
                      })
                    }
                    onLookup={() =>
                      updateState({ showBranchModal: true })
                    }
                  />

                  <FieldRenderer
                    type="lookup"
                    id="custCode"
                    name="custCode"
                    label="Customer Code"
                    value={custCode}
                    editableLookup
                    disabled={isLoading}
                    onClear={() =>
                      updateState({
                        custCode: "",
                        custName: "",
                        rows: [],
                      })
                    }
                    onLookup={() =>
                      updateState({ showCustomerModal: true })
                    }
                  />

                  <FieldRenderer
                    type="text"
                    id="custName"
                    name="custName"
                    label="Customer Name"
                    value={custName}
                    disabled
                  />
                </div>
              </section>

              <section className="p-5">
                <h3 className="flex items-center gap-2 text-gray-800 font-semibold mb-4">
                  <FontAwesomeIcon
                    className="text-blue-600"
                    icon={faCalendarAlt}
                  />
                  Date Range
                </h3>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <FieldRenderer
                    type="date"
                    id="startDate"
                    name="startDate"
                    label="Start Date"
                    value={startDate}
                    disabled={isLoading}
                    onChange={(value) =>
                      updateState({ startDate: value, rows: [] })
                    }
                  />

                  <FieldRenderer
                    type="date"
                    id="endDate"
                    name="endDate"
                    label="End Date"
                    value={endDate}
                    disabled={isLoading}
                    onChange={(value) =>
                      updateState({ endDate: value, rows: [] })
                    }
                  />
                </div>
              </section>
            </div>
          </div>
        </div>

        <div className="global-tran-tab-div-ui">
          <div className="global-tran-tab-nav-ui">
            <div className="flex flex-row">
              <button className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">
                History
              </button>
            </div>
          </div>

          <div className="global-tran-table-main-div-ui">
            <SearchGlobalReportTable
              ref={tableRef}
              columns={columns}
              data={rows}
              itemsPerPage={50}
              docType="Invoice Queuing History"
              rightActionLabel="View"
              onRowAction={handleViewDocument}
            />
          </div>
        </div>
      </div>

      {showBranchModal && (
        <BranchLookupModal
          isOpen={showBranchModal}
          onClose={(selectedBranch) => {
            if (selectedBranch) {
              updateState({
                branchCode: selectedBranch.branchCode,
                branchName: selectedBranch.branchName,
                rows: [],
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
                rows: [],
              });
            }
            updateState({ showCustomerModal: false });
          }}
        />
      )}
    </div>
  );
}
