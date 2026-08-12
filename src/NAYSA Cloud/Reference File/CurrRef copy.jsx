// src/NAYSA Cloud/Reference File/CurrencyCode.jsx
import React, { useState, useEffect, useRef } from "react";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSpinner,
  faSearch,
  faVideo,
  faUndo,
  faFilter,
  faSave,
  faTrash,
  faPlus,
  faEdit,
  faTrashAlt,
  faInfoCircle,
  faChevronDown,
  faFilePdf,
  faFileExport,
} from "@fortawesome/free-solid-svg-icons";
import Swal from "sweetalert2";

// Global
import {
  reftables,
  reftablesPDFGuide,
  reftablesVideoGuide,
} from "@/NAYSA Cloud/Global/reftable";

// Helper to normalize ID key from API rows
const getId = (row) => {
  if (!row) return null;
  // Check all possible ID field names in order of likelihood
  return row.ID ?? row.id ?? row.curr_id ?? row.currId ?? null;
};

const CurrencyCode = ({ onSelect }) => {
  // Get user from auth context
  const { user } = useAuth();

  // Document Global Setup
  const docType = "Currency";
  const documentTitle = reftables[docType];
  const pdfLink = reftablesPDFGuide[docType];
  const videoLink = reftablesVideoGuide[docType];

  // Data
  const [currency, setCurr] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [filters, setFilters] = useState({ currCode: "", currName: "" });

  // UI state
  const [loading, setLoading] = useState(false);
  const [isOpenGuide, setOpenGuide] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState(null);

  // Form state
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currCode, setCurrCode] = useState("");
  const [currName, setCurrName] = useState("");
  const [editingId, setEditingId] = useState(null);

  // Refs
  const guideRef = useRef(null);

  // Table sorting state
  const [sortBy, setSortBy] = useState("currCode"); // Default sort column
  const [sortDir, setSortDir] = useState("asc"); // Default sort direction

  // New state variable for query (not used yet, reserved)
  const [query, setQuery] = useState("");

  // Initial load
  useEffect(() => {
    fetchCurrencies();
  }, []);

  // Close Help menu on click-away
  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedOutsideGuide =
        guideRef.current && !guideRef.current.contains(event.target);
      if (clickedOutsideGuide) setOpenGuide(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Ctrl+S to save when editing
  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!saving && isEditing) handleSaveCurrency();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saving, isEditing, currCode, currName]);

  // Fetch
  const fetchCurrencies = () => {
    setLoading(true);

    apiClient
      .get("/lookupCurr", {
        params: {
          PARAMS: JSON.stringify({
            search: "",
            page: 1,
            pageSize: 50,
          }),
        },
      })
      .then(({ data }) => {
        // Supports two shapes:
        // 1) [{ result: "[...]" }]
        // 2) direct array of rows
        if (data?.success) {
          if (Array.isArray(data.data) && data.data[0]?.result) {
            try {
              const parsed = JSON.parse(data.data[0].result || "[]");
              setCurr(parsed);
              setFiltered(parsed);
            } catch {
              setCurr([]);
              setFiltered([]);
              Swal.fire(
                "Error",
                "Failed to parse currency data from the server",
                "error"
              );
            }
            return;
          }
          if (Array.isArray(data.data)) {
            setCurr(data.data);
            setFiltered(data.data);
            return;
          }
        }
        setCurr([]);
        setFiltered([]);
      })
      .catch((err) => {
        console.error("Failed to fetch currency:", err);
        Swal.fire(
          "Error",
          "Failed to fetch currency data from the server",
          "error"
        );
        setCurr([]);
        setFiltered([]);
      })
      .finally(() => setLoading(false));
  };

  // Filtering and Sorting
  useEffect(() => {
    let newFiltered = currency.filter((item) => {
      const code = String(item.CURR_CODE ?? item.currCode ?? "").toLowerCase();
      const name = String(item.CURR_NAME ?? item.currName ?? "").toLowerCase();

      return (
        code.includes((filters.currCode || "").toLowerCase()) &&
        name.includes((filters.currName || "").toLowerCase())
      );
    });

    // Apply sorting
    if (sortBy) {
      newFiltered = [...newFiltered].sort((a, b) => {
        // Get the property value based on sortBy
        let aVal, bVal;

        if (sortBy === "currCode") {
          aVal = (a.CURR_CODE ?? a.currCode ?? "").toLowerCase();
          bVal = (b.CURR_CODE ?? b.currCode ?? "").toLowerCase();
        } else if (sortBy === "currName") {
          aVal = (a.CURR_NAME ?? a.currName ?? "").toLowerCase();
          bVal = (b.CURR_NAME ?? b.currName ?? "").toLowerCase();
        }

        // Compare the values
        if (aVal < bVal) {
          return sortDir === "asc" ? -1 : 1;
        }
        if (aVal > bVal) {
          return sortDir === "asc" ? 1 : -1;
        }
        return 0;
      });
    }

    setFiltered(newFiltered);
  }, [filters, currency, sortBy, sortDir]);

  const handleSelect = (curr) => {
    if (isEditing) return; // Don't select when in edit mode
    setSelectedCurrency(curr);
    // Set form fields with the selected currency data
    setCurrCode(curr.CURR_CODE ?? curr.currCode ?? "");
    setCurrName(curr.CURR_NAME ?? curr.currName ?? "");
    setEditingId(getId(curr));

    // Call the onSelect callback if provided
    onSelect && typeof onSelect === "function" && onSelect(curr);
  };

  const handleFilterChange = (e, key) => {
    setFilters({ ...filters, [key]: e.target.value });
  };

  const resetFilters = () => setFilters({ currCode: "", currName: "" });

  // Form helpers
  const startNew = () => {
    resetForm();
    setIsAdding(true);
    setIsEditing(true);
  };

  const resetForm = () => {
    // Clear form fields completely
    setCurrCode("");
    setCurrName("");
    setEditingId(null);
    setIsEditing(false);
    setIsAdding(false);

    // Reset selected currency
    setSelectedCurrency(null);

    // Reset filters too when not in editing mode
    if (!isEditing) {
      setFilters({ currCode: "", currName: "" });
    }
  };

  const handleEditRow = (curr) => {
    if (!curr) return;
    setCurrCode(curr.CURR_CODE ?? curr.currCode ?? "");
    setCurrName(curr.CURR_NAME ?? curr.currName ?? "");
    setEditingId(getId(curr)); // normalized ID
    setIsEditing(true);
    setIsAdding(false); // Important: we're editing, not adding
    setSelectedCurrency(curr);
  };

  // ───── Duplicate helper ─────
  const isDuplicateCurrCode = (code, currentCode = null) => {
    const normalized = String(code || "").trim().toUpperCase();
    const currentNormalized = currentCode
      ? String(currentCode || "").trim().toUpperCase()
      : null;

    if (!normalized) return false;

    return currency.some((item) => {
      const existingCode = String(
        item.CURR_CODE ?? item.currCode ?? ""
      ).trim().toUpperCase();

      // If editing, ignore the original code of the selected row
      if (currentNormalized && existingCode === currentNormalized) {
        return false;
      }

      return existingCode === normalized;
    });
  };

  // Save (ADD/UPDATE)
  const handleSaveCurrency = async () => {
    const normalizedCode = String(currCode || "").trim().toUpperCase();
    const trimmedName = String(currName || "").trim();

    if (!normalizedCode || !trimmedName) {
      Swal.fire({
        title: "Error!",
        text: "Please fill out all required fields: Currency Code and Currency Name.",
        icon: "error",
        confirmButtonText: "Okay",
      });
      return;
    }

    // Determine original code when editing
    const originalCode = selectedCurrency
      ? String(
          selectedCurrency.CURR_CODE ?? selectedCurrency.currCode ?? ""
        )
          .trim()
          .toUpperCase()
      : null;

    // Duplicate check for both Add and Edit
    if (isDuplicateCurrCode(normalizedCode, originalCode)) {
      await Swal.fire({
        title: "Duplicate Code",
        text: "Duplicate Currency Code is not allowed.",
        icon: "error",
        confirmButtonText: "Okay",
      });
      return;
    }

    // Extract the userCode from the authentication context
    const userCode = user?.USER_CODE || user?.username || "SYSTEM";

    setSaving(true);
    try {
      // Structure data according to API requirements
      const requestData = {
        currCode: normalizedCode,
        currName: trimmedName,
        userCode: userCode,
        // Only include ID for updates if API needs it
        ...(editingId && { id: editingId }),
      };

      const { data } = await apiClient.post("/upsertCurr", requestData);

      if (data?.status === "success" || data?.success) {
        await Swal.fire({
          title: "Success!",
          text: isAdding
            ? "Currency added successfully"
            : "Currency updated successfully",
          icon: "success",
          confirmButtonText: "Okay",
        });
        fetchCurrencies();
        resetForm();
      } else {
        Swal.fire(
          "Error",
          data?.message || "Failed to save currency",
          "error"
        );
      }
    } catch (error) {
      console.error("Error saving currency:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to save currency";
      Swal.fire("Error", `${errorMessage}`, "error");
    } finally {
      setSaving(false);
    }
  };

  // Delete currency
  const handleDeleteCurrency = async () => {
    if (!selectedCurrency) {
      Swal.fire("Error", "Please select a currency to delete", "error");
      return;
    }

    // Debug log to see the actual structure
    console.log("Selected currency for deletion:", selectedCurrency);

    // Extract the currency code (check both formats)
    const currencyCode =
      selectedCurrency.CURR_CODE ?? selectedCurrency.currCode;

    if (!currencyCode) {
      Swal.fire("Error", "Cannot identify the selected currency", "error");
      return;
    }

    // Extract the userCode from the authentication context
    const userCode = user?.USER_CODE || user?.username || "SYSTEM";

    const confirm = await Swal.fire({
      title: "Delete this currency?",
      text: `Code: ${currencyCode} | Name: ${
        selectedCurrency.CURR_NAME ?? selectedCurrency.currName
      }`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Yes, delete it",
      customClass: { popup: "rounded-xl shadow-2xl" },
    });

    if (!confirm.isConfirmed) return;

    try {
      // Format the payload as expected by the controller - as an array
      const payload = [{ currCode: currencyCode }];

      const requestData = {
        json_data: JSON.stringify(payload),
        userCode: userCode,
      };

      const { data } = await apiClient.post("/deleteCurr", requestData);

      if (data?.success || data?.status === "success") {
        await Swal.fire({
          title: "Deleted",
          text: "The currency has been deleted.",
          icon: "success",
          customClass: { popup: "rounded-xl shadow-2xl" },
        });
        fetchCurrencies();
        resetForm();
        setSelectedCurrency(null); // Clear selection after deletion
      } else {
        Swal.fire(
          "Error",
          data?.message || "Failed to delete currency.",
          "error"
        );
      }
    } catch (error) {
      console.error("Delete error:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to delete currency";
      Swal.fire("Error", errorMessage, "error");
    }
  };

  // Export functionality
  const handleExport = () => {
    // Implement export functionality here
    Swal.fire({
      title: "Export",
      text: "Export functionality will be implemented here",
      icon: "info",
    });
  };

  // Guides
  const handlePDFGuide = () => {
    if (pdfLink) window.open(pdfLink, "_blank");
    setOpenGuide(false);
  };
  const handleVideoGuide = () => {
    if (videoLink) window.open(videoLink, "_blank");
    setOpenGuide(false);
  };

  return (
    <div className="global-ref-main-div-ui mt-24">
      <div className="fixed mt-4 top-14 left-6 right-6 z-30 global-ref-header-ui flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <h1 className="global-ref-headertext-ui">{documentTitle}</h1>
        </div>

        <div className="flex gap-2 justify-end text-xs">
          <button
            onClick={startNew}
            className="bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
            disabled={isEditing}
          >
            <FontAwesomeIcon icon={faPlus} /> Add
          </button>

          <button
            onClick={() => handleEditRow(selectedCurrency)}
            className={`bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 ${
              !selectedCurrency || isEditing
                ? "opacity-50 cursor-not-allowed"
                : ""
            }`}
            disabled={!selectedCurrency || isEditing}
          >
            <FontAwesomeIcon icon={faEdit} /> Edit
          </button>

          <button
            onClick={handleDeleteCurrency}
            className={`bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 ${
              !selectedCurrency || isEditing
                ? "opacity-50 cursor-not-allowed"
                : ""
            }`}
            disabled={!selectedCurrency || isEditing}
          >
            <FontAwesomeIcon icon={faTrashAlt} /> Delete
          </button>

          <button
            onClick={handleSaveCurrency}
            className={`bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 ${
              !isEditing || saving ? "opacity-50 cursor-not-allowed" : ""
            }`}
            disabled={!isEditing || saving}
            title="Ctrl+S to Save"
          >
            <FontAwesomeIcon icon={faSave} />{" "}
            {saving ? "Saving..." : "Save"}
          </button>

          <button
            onClick={() => {
              if (isEditing) {
                // If in edit mode, reset the form
                resetForm();
              } else if (selectedCurrency) {
                // If a currency is selected but not in edit mode, clear selection and form
                setCurrCode("");
                setCurrName("");
                setEditingId(null);
                setSelectedCurrency(null);
              } else {
                // If not editing and nothing selected, just reset filters
                setFilters({ currCode: "", currName: "" });
              }
            }}
            className="bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
          >
            <FontAwesomeIcon icon={faUndo} />{" "}
            {isEditing
              ? "Reset"
              : selectedCurrency
              ? "Clear Selection"
              : "Reset Filters"}
          </button>

          <button
            onClick={handleExport}
            className="bg-green-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700"
          >
            <FontAwesomeIcon icon={faFileExport} /> Export
          </button>

          {/* Help menu */}
          <div ref={guideRef} className="relative">
            <button
              onClick={() => setOpenGuide(!isOpenGuide)}
              className="bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
            >
              <FontAwesomeIcon icon={faInfoCircle} /> Info{" "}
              <FontAwesomeIcon icon={faChevronDown} className="text-xs" />
            </button>
            {isOpenGuide && (
              <div className="absolute right-0 mt-1 w-40 rounded-md shadow-lg bg-white ring-1 ring-black/10 z-[60] dark:bg-gray-800">
                <button
                  onClick={() => {
                    handlePDFGuide();
                    setOpenGuide(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900"
                >
                  <FontAwesomeIcon
                    icon={faFilePdf}
                    className="mr-2 text-red-600"
                  />{" "}
                  User Guide
                </button>
                <button
                  onClick={() => {
                    handleVideoGuide();
                    setOpenGuide(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900"
                >
                  <FontAwesomeIcon
                    icon={faVideo}
                    className="mr-2 text-blue-600"
                  />{" "}
                  Video Guide
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 mb-4 bg-white rounded-lg shadow-md overflow-x-auto">
        <div className="w-full bg-white p-4 sm:p-6 shadow-md rounded-lg">
          {/* Stacked layout with Form Column above Currencies Table */}
          <div className="flex flex-col gap-4">
            {/* Form Column */}
            <div className="w-full">
              <div className="border rounded-lg overflow-hidden p-4 bg-gray-50">
                {saving && (
                  <div className="text-xs text-blue-600 mb-2">
                    Processing...
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Currency Code */}
                  <div className="relative">
                    <input
                      type="text"
                      id="CURR_CODE"
                      placeholder=" "
                      className={`peer global-ref-textbox-ui ${
                        isEditing && isAdding
                          ? "global-ref-textbox-enabled"
                          : "global-ref-textbox-disabled"
                      }`}
                      value={currCode}
                      onChange={(e) =>
                        setCurrCode(e.target.value.toUpperCase())
                      }
                      onBlur={async () => {
                        const normalized = String(currCode || "")
                          .trim()
                          .toUpperCase();
                        if (!normalized) return;

                        const originalCode = selectedCurrency
                          ? String(
                              selectedCurrency.CURR_CODE ??
                                selectedCurrency.currCode ??
                                ""
                            )
                              .trim()
                              .toUpperCase()
                          : null;

                        if (
                          isDuplicateCurrCode(normalized, originalCode)
                        ) {
                          await Swal.fire({
                            title: "Duplicate Code",
                            text: "Duplicate Currency Code is not allowed.",
                            icon: "error",
                            confirmButtonText: "Okay",
                          });
                          setCurrCode("");
                          return;
                        }

                        setCurrCode(normalized);
                      }}
                      disabled={!isEditing || !isAdding}
                      maxLength={10}
                    />
                    <label
                      htmlFor="CURR_CODE"
                      className={`global-ref-floating-label ${
                        !isEditing ||
                        (!isAdding && isEditing)
                          ? "global-ref-label-disabled"
                          : "global-ref-label-enabled"
                      }`}
                    >
                      Currency Code{" "}
                      <span className="global-ref-asterisk-ui">*</span>
                      {isEditing && !isAdding && (
                        <span className="ml-1 text-gray-400">
                          (not editable)
                        </span>
                      )}
                    </label>
                  </div>

                  {/* Description (CURR_NAME) */}
                  <div className="relative">
                    <input
                      type="text"
                      id="CURR_NAME"
                      placeholder=" "
                      className={`peer global-ref-textbox-ui ${
                        isEditing
                          ? "global-ref-textbox-enabled"
                          : "global-ref-textbox-disabled"
                      }`}
                      value={currName}
                      onChange={(e) => setCurrName(e.target.value)}
                      disabled={!isEditing}
                    />
                    <label
                      htmlFor="CURR_NAME"
                      className={`global-ref-floating-label ${
                        !isEditing
                          ? "global-ref-label-disabled"
                          : "global-ref-label-enabled"
                      }`}
                    >
                      Currency Name{" "}
                      <span className="global-ref-asterisk-ui">*</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Currencies Table */}
            <div className="global-ref-table-main-div-ui">
              <div className="global-ref-table-main-sub-div-ui">
                <div className="global-ref-table-div-ui">
                  <table className="global-ref-table-div-ui">
                    <thead className="global-ref-thead-div-ui">
                      <tr>
                        <th
                          className="global-ref-th-ui cursor-pointer select-none"
                          onClick={() => {
                            setSortBy("currCode");
                            setSortDir((prev) =>
                              prev === "asc" ? "desc" : "asc"
                            );
                          }}
                        >
                          Currency Code{" "}
                          {sortBy === "currCode"
                            ? sortDir === "asc"
                              ? "▲"
                              : "▼"
                            : ""}
                        </th>
                        <th
                          className="global-ref-th-ui cursor-pointer select-none"
                          onClick={() => {
                            setSortBy("currName");
                            setSortDir((prev) =>
                              prev === "asc" ? "desc" : "asc"
                            );
                          }}
                        >
                          Description{" "}
                          {sortBy === "currName"
                            ? sortDir === "asc"
                              ? "▲"
                              : "▼"
                            : ""}
                        </th>
                      </tr>

                      {/* Filter row */}
                      <tr>
                        <th className="global-ref-th-ui">
                          <input
                            className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                            placeholder="Filter…"
                            value={filters.currCode}
                            onChange={(e) =>
                              handleFilterChange(e, "currCode")
                            }
                          />
                        </th>
                        <th className="global-ref-th-ui">
                          <input
                            className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                            placeholder="Filter…"
                            value={filters.currName}
                            onChange={(e) =>
                              handleFilterChange(e, "currName")
                            }
                          />
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {filtered.length > 0 ? (
                        filtered.map((curr, index) => (
                          <tr
                            key={getId(curr) ?? index}
                            className={`global-tran-tr-ui ${
                              getId(selectedCurrency) === getId(curr)
                                ? "bg-blue-50"
                                : ""
                            }`}
                            onClick={() => handleSelect(curr)}
                            onDoubleClick={() => {
                              if (!isEditing) handleEditRow(curr);
                            }}
                          >
                            <td className="global-ref-td-ui">
                              {curr.CURR_CODE ?? curr.currCode ?? ""}
                            </td>
                            <td className="global-ref-td-ui">
                              {curr.CURR_NAME ?? curr.currName ?? "-"}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan="2"
                            className="global-ref-norecords-ui"
                          >
                            {loading ? (
                              <span className="inline-flex items-center gap-2">
                                <FontAwesomeIcon icon={faSpinner} spin />
                                Loading…
                              </span>
                            ) : (
                              "No currency codes found"
                            )}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  {/* Pagination */}
                  <div className="flex items-center justify-between p-3">
                    <div className="text-xs opacity-80 font-semibold">
                      Total Records: {filtered.length}
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        className="px-7 py-2 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                        value={10}
                        onChange={(e) => {
                          // Add pagination logic here if needed
                        }}
                      >
                        {[10, 20, 50, 100].map((n) => (
                          <option key={n} value={n}>
                            {n}/page
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-gray-50 border-t border-gray-200 flex justify-between items-center mt-4 rounded-b-lg">
          <div className="text-sm text-gray-700">
            Showing{" "}
            <span className="font-medium">{filtered.length}</span> of{" "}
            <span className="font-medium">{currency.length}</span>{" "}
            currencies
          </div>
        </div>
      </div>

      {/* Custom Scrollbar Styles */}
      <style jsx="true">{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }
      `}</style>
    </div>
  );
};

export default CurrencyCode;
