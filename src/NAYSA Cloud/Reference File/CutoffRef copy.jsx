// CutoffRef.jsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSpinner,
  faVideo,
  faUndo,
  faSave,
  faTrashAlt,
  faPlus,
  faEdit,
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

// Global UI helpers
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer";
import ButtonBar from "@/NAYSA Cloud/Global/ButtonBar";

// ---- Small helpers ----
const pick = (o, ...keys) => keys.reduce((r, k) => (r ?? o?.[k]), undefined);
const _clean = (v) => String(v || "").trim().split(" ")[0].replaceAll("/", "-");

const toISO = (v) => {
  const s = _clean(v);
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s; // already ISO
  const mdy = s.match(/^(\d{2})-(\d{2})-(\d{4})$/); // MM-DD-YYYY
  if (mdy) return `${mdy[3]}-${mdy[1]}-${mdy[2]}`;
  const d = new Date(s);
  if (isNaN(d)) return "";
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
};

const toDisplay = (v) => {
  const iso = toISO(v);
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${m}/${d}/${y}`; // use slashes
};

const getId = (row) => row?.CUTOFF_CODE ?? row?.cutoffCode ?? null;

const CutoffRef = ({ onSelect }) => {
  const { user } = useAuth();

  const docType = "Cutoff";
  const documentTitle = reftables[docType];
  const pdfLink = reftablesPDFGuide[docType];
  const videoLink = reftablesVideoGuide[docType];

  // Data
  const [cutoffData, setCutoffData] = useState([]);
  const [filtered, setFiltered] = useState([]);

  // Year filter (default current year; will auto-switch to latest available)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const initYearRef = useRef(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [isOpenGuide, setOpenGuide] = useState(false);
  const [selectedCutoff, setSelectedCutoff] = useState(null);

  // Form state
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [cutoffCode, setCutoffCode] = useState("");
  const [isDuplicateCode, setIsDuplicateCode] = useState(false);
  const [cutoffName, setCutoffName] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [stat, setStat] = useState("O");
  const [editingId, setEditingId] = useState(null);

  // Filters (text filters)
  const [filters, setFilters] = useState({
    cutoffCode: "",
    cutoffName: "",
    fromDate: "",
    toDate: "",
    stat: "",
  });

  // Refs
  const guideRef = useRef(null);

  // Sorting
  const [sortBy, setSortBy] = useState("cutoffCode");
  const [sortDir, setSortDir] = useState("asc");

  // --- Date validations (future date guard) ---
  const todayISO = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`; // local today
  };

  const isFutureDate = (iso) => {
    if (!iso) return false;
    return iso > todayISO(); // YYYY-MM-DD safe compare
  };

  // Available years (latest first)
  const availableYears = useMemo(() => {
    const years = cutoffData
      .map((item) => {
        const d = toISO(pick(item, "FROM_DATE", "fromDate"));
        return d ? new Date(d).getFullYear() : null;
      })
      .filter(Boolean);

    return [...new Set(years)].sort((a, b) => b - a);
  }, [cutoffData]);

  // Default to latest year + latest dates (DESC) once data is available
  useEffect(() => {
    if (availableYears.length > 0 && !initYearRef.current) {
      initYearRef.current = true;
      setSelectedYear(availableYears[0]); // latest year
      setSortBy("fromDate");
      setSortDir("desc");
    }
  }, [availableYears]);

  // Initial load
  useEffect(() => {
    fetchCutoffPeriods();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close Help menu on click-away
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (guideRef.current && !guideRef.current.contains(e.target)) {
        setOpenGuide(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Ctrl+S to save when editing
  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!saving && isEditing) handleSaveCutoff();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saving, isEditing, cutoffCode, cutoffName, fromDate, toDate, stat, isDuplicateCode]);

  // Fetch
  const fetchCutoffPeriods = () => {
    setLoading(true);
    apiClient
      .get("/cutOff", { params: { PARAMS: "All" } })
      .then(({ data }) => {
        if (data?.success) {
          if (Array.isArray(data.data) && data.data[0]?.result) {
            try {
              const parsed = JSON.parse(data.data[0].result || "[]");
              setCutoffData(parsed);
              setFiltered(parsed);
              return;
            } catch (e) {
              console.error("Parse error:", e);
            }
          } else if (Array.isArray(data.data)) {
            setCutoffData(data.data);
            setFiltered(data.data);
            return;
          }
        }

        setCutoffData([]);
        setFiltered([]);
        if (!data?.success) {
          Swal.fire(
            "Error",
            data?.message || "Server returned an unsuccessful response",
            "error"
          );
        }
      })
      .catch((err) => {
        console.error("Fetch error:", err);
        Swal.fire({
          title: "Database Error",
          text: `The server couldn't process your request: ${
            err.response?.data?.message || err.message
          }`,
          icon: "error",
          confirmButtonText: "Okay",
        });
        setCutoffData([]);
        setFiltered([]);
      })
      .finally(() => setLoading(false));
  };

  // Filtering & Sorting
  useEffect(() => {
    let nf = cutoffData.filter((item) => {
      const code = String(pick(item, "CUTOFF_CODE", "cutoffCode") || "").toLowerCase();
      const name = String(pick(item, "CUTOFF_NAME", "cutoffName") || "").toLowerCase();
      const fromIso = toISO(pick(item, "FROM_DATE", "fromDate"));
      const toIso = toISO(pick(item, "TO_DATE", "toDate"));
      const status = String(pick(item, "STAT", "stat") || "").toLowerCase();

      // Year filter uses FROM_DATE year
      const yearMatch =
        selectedYear && fromIso
          ? String(new Date(fromIso).getFullYear()) === String(selectedYear)
          : true;

      return (
        yearMatch &&
        code.includes((filters.cutoffCode || "").toLowerCase()) &&
        name.includes((filters.cutoffName || "").toLowerCase()) &&
        toDisplay(fromIso).toLowerCase().includes((filters.fromDate || "").toLowerCase()) &&
        toDisplay(toIso).toLowerCase().includes((filters.toDate || "").toLowerCase()) &&
        status.includes((filters.stat || "").toLowerCase())
      );
    });

    if (sortBy) {
      nf = [...nf].sort((a, b) => {
        let av, bv;

        if (sortBy === "cutoffCode") {
          av = String(pick(a, "CUTOFF_CODE", "cutoffCode") || "").toLowerCase();
          bv = String(pick(b, "CUTOFF_CODE", "cutoffCode") || "").toLowerCase();
        } else if (sortBy === "cutoffName") {
          av = String(pick(a, "CUTOFF_NAME", "cutoffName") || "").toLowerCase();
          bv = String(pick(b, "CUTOFF_NAME", "cutoffName") || "").toLowerCase();
        } else if (sortBy === "fromDate") {
          av = toISO(pick(a, "FROM_DATE", "fromDate"));
          bv = toISO(pick(b, "FROM_DATE", "fromDate"));
        } else if (sortBy === "toDate") {
          av = toISO(pick(a, "TO_DATE", "toDate"));
          bv = toISO(pick(b, "TO_DATE", "toDate"));
        } else if (sortBy === "stat") {
          av = String(pick(a, "STAT", "stat") || "").toLowerCase();
          bv = String(pick(b, "STAT", "stat") || "").toLowerCase();
        }

        if (av < bv) return sortDir === "asc" ? -1 : 1;
        if (av > bv) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
    }

    setFiltered(nf);
  }, [filters, cutoffData, sortBy, sortDir, selectedYear]);

  const handleSelect = (cutoff) => {
    if (isEditing) return;
    setSelectedCutoff(cutoff);
    setCutoffCode(pick(cutoff, "CUTOFF_CODE", "cutoffCode") || "");
    setCutoffName(pick(cutoff, "CUTOFF_NAME", "cutoffName") || "");
    setFromDate(toISO(pick(cutoff, "fromDate", "FROM_DATE")));
    setToDate(toISO(pick(cutoff, "toDate", "TO_DATE")));
    setStat(pick(cutoff, "stat", "STAT") ?? "O");
    setEditingId(getId(cutoff));
    onSelect && typeof onSelect === "function" && onSelect(cutoff);
  };

  const handleFilterChange = (e, key) =>
    setFilters({ ...filters, [key]: e.target.value });

  const resetFilters = () =>
    setFilters({
      cutoffCode: "",
      cutoffName: "",
      fromDate: "",
      toDate: "",
      stat: "",
    });

  const startNew = () => {
    resetForm();
    setIsAdding(true);
    setIsEditing(true);
  };

  const resetForm = () => {
    setCutoffCode("");
    setIsDuplicateCode(false);
    setCutoffName("");
    setFromDate("");
    setToDate("");
    setStat("O");
    setEditingId(null);
    setIsEditing(false);
    setIsAdding(false);
    setSelectedCutoff(null);
    if (!isEditing) resetFilters();
  };

  const handleEditRow = (cutoff) => {
    if (!cutoff) return;
    setCutoffCode(pick(cutoff, "CUTOFF_CODE", "cutoffCode") || "");
    setIsDuplicateCode(false); // editing existing code; no duplicate check needed
    setCutoffName(pick(cutoff, "CUTOFF_NAME", "cutoffName") || "");
    setFromDate(toISO(pick(cutoff, "FROM_DATE", "fromDate")));
    setToDate(toISO(pick(cutoff, "TO_DATE", "toDate")));
    setStat(pick(cutoff, "STAT", "stat") ?? "O");
    setEditingId(getId(cutoff));
    setIsEditing(true);
    setIsAdding(false);
    setSelectedCutoff(cutoff);
  };

  const handleSaveCutoff = async () => {
    if (!cutoffCode || !cutoffName || !fromDate || !toDate || !stat) {
      await Swal.fire("Error!", "Please fill all required fields.", "error");
      return;
    }

    // ✅ duplicate code guard (final safety net)
    if (isDuplicateCode) {
      await Swal.fire("Error!", "Duplicate Code is not allowed.", "error");
      return;
    }

    // ✅ future date validation
    if (isFutureDate(fromDate) || isFutureDate(toDate)) {
      await Swal.fire(
        "Invalid Date",
        `You cannot save a cutoff period with a future date.\nToday: ${toDisplay(todayISO())}`,
        "error"
      );
      return;
    }

    // ✅ fromDate must not be after toDate
    if (fromDate > toDate) {
      await Swal.fire(
        "Invalid Date Range",
        "From Date cannot be later than To Date.",
        "error"
      );
      return;
    }

    setSaving(true);

    try {
      const payload = {
        json_data: JSON.stringify({
          json_data: {
            cutoffCode,
            cutoffName,
            status: stat,
            fromDate,
            toDate,
            userCode: user.USER_CODE,
          },
        }),
      };

      const { data } = await apiClient.post("/upsertCutOff", payload);

      if (data?.success || data?.status === "success") {
        await Swal.fire("Success", "Cutoff period saved successfully.", "success");
        fetchCutoffPeriods();
        resetForm();
        setIsEditing(false);
      } else {
        await Swal.fire("Error", data?.message || "Failed to save cutoff period.", "error");
      }
    } catch (error) {
      await Swal.fire(
        "Error",
        error?.response?.data?.message ||
          error.message ||
          "Failed to save cutoff period.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCutoff = async () => {
    if (!selectedCutoff) {
      Swal.fire("Error", "Please select a cutoff period to delete", "error");
      return;
    }

    const code = (selectedCutoff.CUTOFF_CODE ?? selectedCutoff.cutoffCode ?? "")
      .toString()
      .trim();

    if (!code) {
      Swal.fire("Error", "Cannot identify the selected cutoff period", "error");
      return;
    }

    const confirm = await Swal.fire({
      title: "Delete this cutoff period?",
      text: `Code: ${code} | Name: ${
        selectedCutoff.CUTOFF_NAME ?? selectedCutoff.cutoffName ?? ""
      }`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Yes, delete it",
    });

    if (!confirm.isConfirmed) return;

    try {
      const userCode = user?.USER_CODE || user?.username || "SYSTEM";

      const payload = {
        json_data: JSON.stringify({
          json_data: {
            cutoffCode: code,
            userCode,
          },
        }),
      };

      const { data } = await apiClient.post("/deleteCutOff", payload);

      if (data?.success || data?.status === "success") {
        await Swal.fire({
          title: "Deleted",
          text: "The cutoff period has been deleted.",
          icon: "success",
        });
        fetchCutoffPeriods();
        resetForm();
        setSelectedCutoff(null);
      } else {
        Swal.fire("Error", data?.message || "Failed to delete cutoff period.", "error");
      }
    } catch (error) {
      Swal.fire(
        "Error",
        error.response?.data?.message ||
          error.message ||
          "Failed to delete cutoff period",
        "error"
      );
    }
  };

  // Export placeholder
  const handleExport = () =>
    Swal.fire({ title: "Export", text: "Export coming soon", icon: "info" });

  // Guides
  const handlePDFGuide = () => {
    if (pdfLink) window.open(pdfLink, "_blank");
    setOpenGuide(false);
  };
  const handleVideoGuide = () => {
    if (videoLink) window.open(videoLink, "_blank");
    setOpenGuide(false);
  };

  // Dynamic label for Reset button in ButtonBar
  const resetLabel = isEditing ? "Reset" : selectedCutoff ? "Clear Selection" : "Reset Filters";

  return (
    <div className="global-ref-main-div-ui mt-24">
      {/* Header */}
      <div className="fixed mt-4 top-14 left-6 right-6 z-30 global-ref-header-ui flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <h1 className="global-ref-headertext-ui">{documentTitle}</h1>
        </div>

        <div className="flex gap-2 justify-end text-xs">
          <ButtonBar
            buttons={[
              { key: "add", label: "Add", icon: faPlus, onClick: startNew, disabled: isEditing },
              {
                key: "edit",
                label: "Edit",
                icon: faEdit,
                onClick: () => handleEditRow(selectedCutoff),
                disabled: !selectedCutoff || isEditing,
              },
              {
                key: "delete",
                label: "Delete",
                icon: faTrashAlt,
                onClick: handleDeleteCutoff,
                disabled: !selectedCutoff || isEditing,
              },
              {
                key: "save",
                label: saving ? "Saving..." : "Save",
                icon: faSave,
                onClick: handleSaveCutoff,
                disabled: !isEditing || saving,
                className:
                  "bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 " +
                  (!isEditing || saving ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-700"),
              },
              {
                key: "reset",
                label: resetLabel,
                icon: faUndo,
                onClick: () => {
                  if (isEditing || selectedCutoff) resetForm();
                  else resetFilters();
                },
                disabled: false,
              },
            ]}
          />

          <button
            onClick={handleExport}
            className="bg-green-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700"
          >
            <FontAwesomeIcon icon={faFileExport} /> Export
          </button>

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
                  onClick={handlePDFGuide}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900"
                >
                  <FontAwesomeIcon icon={faFilePdf} className="mr-2 text-red-600" /> User Guide
                </button>
                <button
                  onClick={handleVideoGuide}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900"
                >
                  <FontAwesomeIcon icon={faVideo} className="mr-2 text-blue-600" /> Video Guide
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="mt-4 mb-4 bg-white rounded-lg shadow-md overflow-x-auto">
        <div className="w-full bg-white p-4 sm:p-6 shadow-md rounded-lg">
          <div className="flex flex-col gap-4">
            {/* Form */}
            <div className="w-full">
              <div className="border rounded-lg overflow-hidden p-4 bg-gray-50">
                {saving && <div className="text-xs text-blue-600 mb-2">Processing...</div>}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FieldRenderer
                    label="Cut Off Code"
                    required={true}
                    type="text"
                    value={cutoffCode}
                    disabled={!isEditing || !isAdding}
                    onChange={(val) => {
                      const code = String(val || "").toUpperCase();

                      // allow clearing
                      if (!code) {
                        setCutoffCode("");
                        setIsDuplicateCode(false);
                        return;
                      }

                      const exists = cutoffData.some((item) => {
                        const existingCode = String(pick(item, "CUTOFF_CODE", "cutoffCode") || "")
                          .trim()
                          .toUpperCase();
                        return existingCode === code;
                      });

                      setIsDuplicateCode(exists);

                      // ✅ If duplicate, DO NOT update the value
                      if (exists) {
                        Swal.fire({
                          title: "Duplicate Code",
                          text: "Duplicate Code is not allowed.",
                          icon: "error",
                        });
                        return;
                      }

                      setCutoffCode(code);
                    }}
                  />

                  <FieldRenderer
                    label="Cut Off Name"
                    required={true}
                    type="text"
                    value={cutoffName}
                    disabled={!isEditing}
                    onChange={(val) => setCutoffName(val)}
                  />

                  <FieldRenderer
                    label="Status"
                    required={true}
                    type="select"
                    value={stat}
                    disabled={!isEditing}
                    onChange={(val) => setStat(val)}
                    options={[
                      { value: "O", label: "Open" },
                      { value: "C", label: "Closed" },
                    ]}
                  />

                  <FieldRenderer
                    label="From Date"
                    required={true}
                    type="date"
                    value={fromDate}
                    disabled={!isEditing}
                    onChange={(val) => {
                      if (isFutureDate(val)) {
                        Swal.fire("Invalid Date", "From Date cannot be a future date.", "error");
                        return;
                      }

                      if (toDate && val > toDate) {
                        Swal.fire(
                          "Invalid Date Range",
                          "From Date cannot be later than To Date.",
                          "error"
                        );
                        return;
                      }

                      setFromDate(val);
                    }}
                  />

                  <FieldRenderer
                    label="To Date"
                    required={true}
                    type="date"
                    value={toDate}
                    disabled={!isEditing}
                    onChange={(val) => {
                      if (isFutureDate(val)) {
                        Swal.fire("Invalid Date", "To Date cannot be a future date.", "error");
                        return;
                      }

                      if (fromDate && val < fromDate) {
                        Swal.fire(
                          "Invalid Date Range",
                          "To Date cannot be earlier than From Date.",
                          "error"
                        );
                        return;
                      }

                      setToDate(val);
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="global-ref-table-main-div-ui">
              <div className="global-ref-table-main-sub-div-ui">
                <div className="global-ref-table-div-ui">
                  <table className="global-ref-table-div-ui">
                    <thead className="global-ref-thead-div-ui">
                      <tr>
                        <th className="global-ref-th-ui">Year</th>

                        <th
                          className="global-ref-th-ui cursor-pointer select-none"
                          onClick={() => {
                            setSortBy("cutoffCode");
                            setSortDir((p) => (p === "asc" ? "desc" : "asc"));
                          }}
                        >
                          Cut Off Code{" "}
                          {sortBy === "cutoffCode" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                        </th>

                        <th
                          className="global-ref-th-ui cursor-pointer select-none"
                          onClick={() => {
                            setSortBy("cutoffName");
                            setSortDir((p) => (p === "asc" ? "desc" : "asc"));
                          }}
                        >
                          Cut Off Name{" "}
                          {sortBy === "cutoffName" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                        </th>

                        <th
                          className="global-ref-th-ui cursor-pointer select-none"
                          onClick={() => {
                            setSortBy("fromDate");
                            setSortDir((p) => (p === "asc" ? "desc" : "asc"));
                          }}
                        >
                          From Date{" "}
                          {sortBy === "fromDate" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                        </th>

                        <th
                          className="global-ref-th-ui cursor-pointer select-none"
                          onClick={() => {
                            setSortBy("toDate");
                            setSortDir((p) => (p === "asc" ? "desc" : "asc"));
                          }}
                        >
                          To Date {sortBy === "toDate" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                        </th>

                        <th
                          className="global-ref-th-ui cursor-pointer select-none"
                          onClick={() => {
                            setSortBy("stat");
                            setSortDir((p) => (p === "asc" ? "desc" : "asc"));
                          }}
                        >
                          Status {sortBy === "stat" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                        </th>
                      </tr>

                      {/* Filter row */}
                      <tr>
                        <th className="global-ref-th-ui">
                          <select
                            className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                          >
                            {availableYears.length === 0 ? (
                              <option value={new Date().getFullYear()}>
                                {new Date().getFullYear()}
                              </option>
                            ) : (
                              availableYears.map((y) => (
                                <option key={y} value={y}>
                                  {y}
                                </option>
                              ))
                            )}
                          </select>
                        </th>

                        <th className="global-ref-th-ui">
                          <input
                            className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                            placeholder="Filter…"
                            value={filters.cutoffCode}
                            onChange={(e) => handleFilterChange(e, "cutoffCode")}
                          />
                        </th>

                        <th className="global-ref-th-ui">
                          <input
                            className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                            placeholder="Filter…"
                            value={filters.cutoffName}
                            onChange={(e) => handleFilterChange(e, "cutoffName")}
                          />
                        </th>

                        <th className="global-ref-th-ui">
                          <input
                            className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                            placeholder="Filter…"
                            value={filters.fromDate}
                            onChange={(e) => handleFilterChange(e, "fromDate")}
                          />
                        </th>

                        <th className="global-ref-th-ui">
                          <input
                            className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                            placeholder="Filter…"
                            value={filters.toDate}
                            onChange={(e) => handleFilterChange(e, "toDate")}
                          />
                        </th>

                        <th className="global-ref-th-ui">
                          <input
                            className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                            placeholder="Filter…"
                            value={filters.stat}
                            onChange={(e) => handleFilterChange(e, "stat")}
                          />
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {filtered.length > 0 ? (
                        filtered.map((cutoff, idx) => {
                          const id = getId(cutoff) ?? idx;
                          const isSel = getId(selectedCutoff) === getId(cutoff);

                          const fromIso = toISO(pick(cutoff, "fromDate", "FROM_DATE"));
                          const rowYear = fromIso ? new Date(fromIso).getFullYear() : "";

                          return (
                            <tr
                              key={id}
                              className={`global-tran-tr-ui ${isSel ? "bg-blue-50" : ""}`}
                              onClick={() => handleSelect(cutoff)}
                              onDoubleClick={() => {
                                if (!isEditing) handleEditRow(cutoff);
                              }}
                            >
                              <td className="global-ref-td-ui">{rowYear}</td>

                              <td className="global-ref-td-ui">
                                {pick(cutoff, "CUTOFF_CODE", "cutoffCode") || ""}
                              </td>

                              <td className="global-ref-td-ui">
                                {pick(cutoff, "CUTOFF_NAME", "cutoffName") || "-"}
                              </td>

                              <td className="global-ref-td-ui">
                                {toDisplay(pick(cutoff, "fromDate", "FROM_DATE"))}
                              </td>

                              <td className="global-ref-td-ui">
                                {toDisplay(pick(cutoff, "toDate", "TO_DATE"))}
                              </td>

                              <td className="global-ref-td-ui">
                                {pick(cutoff, "STAT", "stat") === "C" ? "Closed" : "Open"}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="6" className="global-ref-norecords-ui">
                            {loading ? (
                              <span className="inline-flex items-center gap-2">
                                <FontAwesomeIcon icon={faSpinner} spin />
                                Loading…
                              </span>
                            ) : (
                              "No cutoff periods found"
                            )}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  {/* Pagination (placeholder) */}
                  <div className="flex items-center justify-between p-3">
                    <div className="text-xs opacity-80 font-semibold">
                      Total Records: {filtered.length}
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        className="px-7 py-2 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                        value={10}
                        onChange={() => {}}
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
            Showing <span className="font-medium">{filtered.length}</span> of{" "}
            <span className="font-medium">{cutoffData.length}</span> cutoff periods
          </div>
        </div>
      </div>

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

export default CutoffRef;
