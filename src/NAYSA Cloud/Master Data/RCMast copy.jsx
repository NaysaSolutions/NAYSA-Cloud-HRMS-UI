// src/NAYSA Cloud/Reference File/RCMast.jsx
import React, { useEffect, useRef, useState, useMemo } from "react";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";

import Swal from "sweetalert2";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faSave,
  faUndo,
  faFileExport,
  faInfoCircle,
  faChevronDown,
  faSpinner,
  faFilePdf,
  faVideo,
  faTrashAlt,
} from "@fortawesome/free-solid-svg-icons";

import ButtonBar from "@/NAYSA Cloud/Global/ButtonBar.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import {
  reftables,
  reftablesPDFGuide,
  reftablesVideoGuide,
} from "@/NAYSA Cloud/Global/reftable";

const RCMast = () => {
  const { user } = useAuth();
  const userCode =
    user?.USER_CODE || user?.username || user?.userCode || "SYSTEM";

  const docType = "RCMast";
  const documentTitle = reftables[docType] || "Responsibility Center";
  const pdfLink = reftablesPDFGuide[docType];
  const videoLink = reftablesVideoGuide[docType];

  const [rows, setRows] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [filters, setFilters] = useState({
    rcCode: "",
    rcName: "",
    rcTypeCode: "",
    rcGroup: "",
    groupCode: "",
    active: "",
  });

  const [sortBy, setSortBy] = useState("rcCode");
  const [sortDir, setSortDir] = useState("asc");

  const [editing, setEditing] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  const [regInfo, setRegInfo] = useState({
    registeredBy: "",
    registeredDate: "",
    lastUpdatedBy: "",
    lastUpdatedDate: "",
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [isOpenExport, setOpenExport] = useState(false);
  const [isOpenGuide, setOpenGuide] = useState(false);

  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const guideRef = useRef(null);
  const exportRef = useRef(null);

  const getRowId = (row) => (row ? String(row.rcCode ?? row.rc_code ?? "") : "");

  // ───────────────────────────────
  // Fetch list (GET /rCMast)
  // ───────────────────────────────
  const fetchRC = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get("/rCMast");

      const resultString =
        data?.data?.[0]?.result || data?.[0]?.result || data?.result || null;

      let list = [];
      if (resultString) {
        try {
          list = JSON.parse(resultString) || [];
        } catch (e) {
          console.error("Error parsing RCMast Load result:", e);
        }
      }
      if (!Array.isArray(list)) list = [];

      setRows(list);
    } catch (err) {
      console.error("Error fetching RC master:", err);
      Swal.fire("Error", "Failed to load responsibility centers.", "error");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRC();
  }, []);

  // ───────────────────────────────
  // Filters + sort
  // ───────────────────────────────
  useEffect(() => {
    let list = rows.filter((r) => {
      const rcCode = String(r.rcCode ?? "").toLowerCase();
      const rcName = String(r.rcName ?? "").toLowerCase();
      const rcTypeCode = String(r.rcTypeCode ?? "").toLowerCase();
      const rcGroup = String(r.rcGroup ?? "").toLowerCase();
      const groupCode = String(r.groupCode ?? "").toLowerCase();
      const active = String(r.active ?? "").toLowerCase();

      return (
        rcCode.includes(filters.rcCode.toLowerCase()) &&
        rcName.includes(filters.rcName.toLowerCase()) &&
        rcTypeCode.includes(filters.rcTypeCode.toLowerCase()) &&
        rcGroup.includes(filters.rcGroup.toLowerCase()) &&
        groupCode.includes(filters.groupCode.toLowerCase()) &&
        active.includes(filters.active.toLowerCase())
      );
    });

    if (sortBy) {
      list = [...list].sort((a, b) => {
        let A = "";
        let B = "";
        switch (sortBy) {
          case "rcCode":
            A = String(a.rcCode ?? "");
            B = String(b.rcCode ?? "");
            break;
          case "rcName":
            A = String(a.rcName ?? "");
            B = String(b.rcName ?? "");
            break;
          case "rcTypeCode":
            A = String(a.rcTypeCode ?? "");
            B = String(b.rcTypeCode ?? "");
            break;
          case "rcGroup":
            A = String(a.rcGroup ?? "");
            B = String(b.rcGroup ?? "");
            break;
          case "groupCode":
            A = String(a.groupCode ?? "");
            B = String(b.groupCode ?? "");
            break;
          case "active":
            A = String(a.active ?? "");
            B = String(b.active ?? "");
            break;
          default:
            A = "";
            B = "";
        }
        const res = A.localeCompare(B);
        return sortDir === "asc" ? res : -res;
      });
    }

    setFiltered(list);
    // reset page when filter changes
    setPage(1);
  }, [rows, filters, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const handleFilterChange = (key, value) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const resetFilters = () =>
    setFilters({
      rcCode: "",
      rcName: "",
      rcTypeCode: "",
      rcGroup: "",
      groupCode: "",
      active: "",
    });

  // ───────────────────────────────
  // Click-away for dropdowns
  // ───────────────────────────────
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (guideRef.current && !guideRef.current.contains(e.target)) {
        setOpenGuide(false);
      }
      if (exportRef.current && !exportRef.current.contains(e.target)) {
        setOpenExport(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ───────────────────────────────
  // Selection + edit
  // ───────────────────────────────
  const handleSelectRow = (row) => {
    if (isEditing) return;
    setSelectedRow(row);
  };

  const handleRowDoubleClick = (row) => {
    if (!row) return;

    // Map the selected grid row directly into the form
    setEditing({
      rcCode: row.rcCode ?? "",
      rcName: row.rcName ?? "",
      rcTypeCode: row.rcTypeCode ?? "",
      rcGroup: row.rcGroup ?? "N",          // Y / N from DB
      groupCode: row.groupCode ?? "",
      active: row.active ?? "Y",
      __existing: true,
    });

    // If your Load doesn’t return registration info, just clear it
    // (you can fill these later when sproc/Get returns them)
    setRegInfo({
      registeredBy: row.registeredBy || "",
      registeredDate: row.registeredDate || "",
      lastUpdatedBy: row.updatedBy || "",
      lastUpdatedDate: row.updatedDate || "",
    });

    setIsEditing(true);
    setIsAdding(false);
    setSelectedRow(row);
  };


  // const handleRowDoubleClick = async (row) => {
  //   if (!row) return;
  //   const rcCode = row.rcCode || row.rc_code;
  //   if (!rcCode) return;

  //   setLoading(true);
  //   try {
  //     const { data } = await apiClient.get("/getRCMast", {
  //       params: { rcCode },
  //     });
  //     const resultString =
  //       data?.data?.[0]?.result || data?.[0]?.result || data?.result || null;

  //     let full = row;
  //     if (resultString) {
  //       try {
  //         const list = JSON.parse(resultString);
  //         if (Array.isArray(list) && list[0]) {
  //           full = list[0];
  //         }
  //       } catch (e) {
  //         console.error("Error parsing getRCMast result:", e);
  //       }
  //     }

  //     setEditing({
  //       rcCode: full.rcCode ?? "",
  //       rcName: full.rcName ?? "",
  //       rcTypeCode: full.rcTypeCode ?? "",
  //       rcGroup: full.rcGroup ?? "N",
  //       groupCode: full.groupCode ?? "",
  //       active: full.active ?? "Y",
  //       __existing: true,
  //     });

  //     setRegInfo({
  //       registeredBy: full.registeredBy || "",
  //       registeredDate: full.registeredDate || "",
  //       lastUpdatedBy: full.updatedBy || "",
  //       lastUpdatedDate: full.updatedDate || "",
  //     });

  //     setIsEditing(true);
  //     setIsAdding(false);
  //     setSelectedRow(row);
  //   } catch (err) {
  //     console.error("Error loading RC record:", err);
  //     Swal.fire("Error", "Failed to retrieve RC record.", "error");
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const startNew = () => {
    setSelectedRow(null);
    setEditing({
      rcCode: "",
      rcName: "",
      rcTypeCode: "",
      rcGroup: "N",
      groupCode: "",
      active: "Y",
      __existing: false,
    });
    setRegInfo({
      registeredBy: "",
      registeredDate: "",
      lastUpdatedBy: "",
      lastUpdatedDate: "",
    });
    setIsAdding(true);
    setIsEditing(true);
  };

  const resetForm = () => {
    setEditing(null);
    setIsAdding(false);
    setIsEditing(false);
    setSelectedRow(null);
    setRegInfo({
      registeredBy: "",
      registeredDate: "",
      lastUpdatedBy: "",
      lastUpdatedDate: "",
    });
  };

  // ───────────────────────────────
  // Duplicate check on RC Code
  // ───────────────────────────────
  const handleRcCodeChange = (val) => {
    const v = (val || "").toUpperCase();
    setEditing((prev) => ({
      ...(prev || {}),
      rcCode: v,
    }));

    if (isAdding && v.trim() !== "") {
      const exists = rows.some((row) => {
        const existing = String(row.rcCode ?? "").trim().toUpperCase();
        return existing === v.trim();
      });

      if (exists) {
        Swal.fire({
          icon: "error",
          title: "Duplicate Code",
          text: "RC Code already exists and cannot be used.",
          confirmButtonText: "OK",
        });

        setEditing((prev) => ({
          ...(prev || {}),
          rcCode: "",
        }));
      }
    }
  };

  // ───────────────────────────────
  // Save (Upsert) – JSON.stringify fix
  // ───────────────────────────────
  const handleSave = async () => {
    if (!editing) {
      Swal.fire("Error", "Nothing to save.", "error");
      return;
    }

    const { rcCode, rcName, rcTypeCode } = editing;

    if (!rcCode || !rcName || !rcTypeCode) {
      Swal.fire(
        "Missing Data",
        "RC Code, RC Description and RC Type are required.",
        "warning"
      );
      return;
    }

    const payload = {
      // sproc expects @params to look like: {"json_data":{...}}
      json_data: JSON.stringify({
        json_data: {
          rcCode: String(rcCode).trim(),
          rcName: String(rcName).trim(),
          rcTypeCode: String(rcTypeCode).trim(),
          rcGroup:
            editing.rcGroup === "Yes" || editing.rcGroup === "Y" ? "Y" : "N",
          groupCode: String(editing.groupCode || "").trim(),
          active:
            editing.active === "Yes" || editing.active === "Y" ? "Y" : "N",
          userCode,
        },
      }),
    };


    const confirm = await Swal.fire({
      title: "Save Responsibility Center?",
      text: "Please confirm the details before saving.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Save",
    });
    if (!confirm.isConfirmed) return;

    setSaving(true);
    setLoading(true);
    try {
      const { data } = await apiClient.post("/upsertRCMast", payload);
      const status = data?.status;
      const message = data?.message;

      if (status === "success") {
        await Swal.fire(
          "Saved",
          isAdding ? "Responsibility Center added." : "Responsibility Center updated.",
          "success"
        );
        await fetchRC();
        resetForm();
      } else {
        Swal.fire(
          "Error",
          message || "Failed to save Responsibility Center.",
          "error"
        );
      }
    } catch (err) {
      console.error("Error saving RC:", err);
      const msg =
        err?.response?.data?.message || err.message || "Error saving RC.";
      Swal.fire("Error", msg, "error");
    } finally {
      setSaving(false);
      setLoading(false);
    }
  };

  // ───────────────────────────────
  // Delete – POST /deleteRCMast
  // ───────────────────────────────
  const handleDelete = async () => {
    if (!editing || !editing.rcCode) {
      Swal.fire("Info", "Select a record to delete.", "info");
      return;
    }

    const confirm = await Swal.fire({
      title: "Delete Responsibility Center?",
      text: `RC Code: ${editing.rcCode}`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
    });

    if (!confirm.isConfirmed) return;

    const payload = {
      json_data: JSON.stringify({
        json_data: {
          rcCode: String(editing.rcCode).trim(),
          userCode,
        },
      }),
    };


    setSaving(true);
    setLoading(true);
    try {
      const { data } = await apiClient.post("/deleteRCMast", payload);
      const status = data?.status;
      const message = data?.message;

      if (status === "success") {
        await Swal.fire("Deleted", "Responsibility Center deleted.", "success");
        await fetchRC();
        resetForm();
      } else {
        Swal.fire(
          "Error",
          message || "Failed to delete Responsibility Center.",
          "error"
        );
      }
    } catch (err) {
      console.error("Error deleting RC:", err);
      const msg =
        err?.response?.data?.message || err.message || "Error deleting RC.";
      Swal.fire("Error", msg, "error");
    } finally {
      setSaving(false);
      setLoading(false);
    }
  };

  // ───────────────────────────────
  // Export / Help
  // ───────────────────────────────
  const handleExport = () => {
    setOpenExport(false);
    Swal.fire(
      "Info",
      "Export for Responsibility Center will be implemented here.",
      "info"
    );
  };

  const handlePDFGuide = () => {
    if (pdfLink) window.open(pdfLink, "_blank");
    setOpenGuide(false);
  };

  const handleVideoGuide = () => {
    if (videoLink) window.open(videoLink, "_blank");
    setOpenGuide(false);
  };

  // ───────────────────────────────
  // Buttons
  // ───────────────────────────────
  const mainButtons = [
    {
      key: "add",
      label: "Add",
      icon: faPlus,
      onClick: startNew,
      disabled: saving || isEditing,
    },
    {
      key: "save",
      label: saving ? "Saving..." : "Save",
      icon: faSave,
      onClick: handleSave,
      disabled: !isEditing || saving,
    },
    {
      key: "delete",
      label: "Delete",
      icon: faTrashAlt,
      onClick: handleDelete,
      disabled: !isEditing || isAdding || saving,
    },
    {
      key: "reset",
      label: "Reset",
      icon: faUndo,
      onClick: () => {
        if (isEditing) resetForm();
        else resetFilters();
      },
      disabled: saving,
    },
  ];

  // ───────────────────────────────
  // Render
  // ───────────────────────────────
  return (
    <div className="global-ref-main-div-ui mt-24">
      {/* HEADER BAR */}
      <div className="fixed mt-4 top-14 left-6 right-6 z-30 global-ref-header-ui flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <h1 className="global-ref-headertext-ui">{documentTitle}</h1>
        </div>

        <div className="flex gap-2 justify-end text-xs">
          <ButtonBar buttons={mainButtons} />

          {/* Export dropdown */}
          <div ref={exportRef} className="relative">
            <button
              onClick={() => setOpenExport((prev) => !prev)}
              className="bg-green-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700"
            >
              <FontAwesomeIcon icon={faFileExport} />
              Export
              <FontAwesomeIcon icon={faChevronDown} className="text-[10px]" />
            </button>
            {isOpenExport && (
              <div className="absolute right-0 mt-1 w-36 bg-white rounded-md shadow-lg ring-1 ring-black/10 z-40">
                <button
                  onClick={handleExport}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50"
                >
                  Excel / CSV
                </button>
              </div>
            )}
          </div>

          {/* Help / Guide dropdown */}
          <div ref={guideRef} className="relative">
            <button
              onClick={() => setOpenGuide((prev) => !prev)}
              className="bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
            >
              <FontAwesomeIcon icon={faInfoCircle} />
              Help
              <FontAwesomeIcon icon={faChevronDown} className="text-[10px]" />
            </button>
            {isOpenGuide && (
              <div className="absolute right-0 mt-1 w-40 rounded-md shadow-lg bg-white ring-1 ring-black/10 z-[60]">
                <button
                  onClick={handlePDFGuide}
                  disabled={!pdfLink}
                  className="block w-full text-left px-4 py-2 text-xs hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FontAwesomeIcon icon={faFilePdf} className="mr-2 text-red-600" />
                  User Guide
                </button>
                <button
                  onClick={handleVideoGuide}
                  disabled={!videoLink}
                  className="block w-full text-left px-4 py-2 text-xs hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FontAwesomeIcon icon={faVideo} className="mr-2 text-blue-600" />
                  Video Guide
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MAIN CARD */}
      <div className="mt-4 mb-4 bg-white rounded-lg shadow-md overflow-x-auto">
        <div className="w-full bg-white p-4 sm:p-6 shadow-md rounded-lg">
          <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
            {/* LEFT: TABLE */}
            <div className="global-ref-table-main-div-ui">
              <div className="global-ref-table-main-sub-div-ui">
                <div className="global-ref-table-div-ui">
                  <table className="global-ref-table-div-ui">
                    <thead className="global-ref-thead-div-ui">
                      <tr>
                        <th
                          className="global-ref-th-ui cursor-pointer select-none"
                          onClick={() => {
                            setSortBy("rcCode");
                            setSortDir((prev) =>
                              prev === "asc" ? "desc" : "asc"
                            );
                          }}
                        >
                          RC Code{" "}
                          {sortBy === "rcCode"
                            ? sortDir === "asc"
                              ? "▲"
                              : "▼"
                            : ""}
                        </th>
                        <th
                          className="global-ref-th-ui cursor-pointer select-none"
                          onClick={() => {
                            setSortBy("rcName");
                            setSortDir((prev) =>
                              prev === "asc" ? "desc" : "asc"
                            );
                          }}
                        >
                          RC Description{" "}
                          {sortBy === "rcName"
                            ? sortDir === "asc"
                              ? "▲"
                              : "▼"
                            : ""}
                        </th>
                        <th
                          className="global-ref-th-ui cursor-pointer select-none"
                          onClick={() => {
                            setSortBy("rcTypeCode");
                            setSortDir((prev) =>
                              prev === "asc" ? "desc" : "asc"
                            );
                          }}
                        >
                          RC Type{" "}
                          {sortBy === "rcTypeCode"
                            ? sortDir === "asc"
                              ? "▲"
                              : "▼"
                            : ""}
                        </th>
                        <th
                          className="global-ref-th-ui cursor-pointer select-none"
                          onClick={() => {
                            setSortBy("rcGroup");
                            setSortDir((prev) =>
                              prev === "asc" ? "desc" : "asc"
                            );
                          }}
                        >
                          RC Group{" "}
                          {sortBy === "rcGroup"
                            ? sortDir === "asc"
                              ? "▲"
                              : "▼"
                            : ""}
                        </th>
                        <th
                          className="global-ref-th-ui cursor-pointer select-none"
                          onClick={() => {
                            setSortBy("groupCode");
                            setSortDir((prev) =>
                              prev === "asc" ? "desc" : "asc"
                            );
                          }}
                        >
                          Group Code{" "}
                          {sortBy === "groupCode"
                            ? sortDir === "asc"
                              ? "▲"
                              : "▼"
                            : ""}
                        </th>
                        <th
                          className="global-ref-th-ui cursor-pointer select-none"
                          onClick={() => {
                            setSortBy("active");
                            setSortDir((prev) =>
                              prev === "asc" ? "desc" : "asc"
                            );
                          }}
                        >
                          Active?{" "}
                          {sortBy === "active"
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
                            placeholder="Contains..."
                            value={filters.rcCode}
                            onChange={(e) =>
                              handleFilterChange("rcCode", e.target.value)
                            }
                          />
                        </th>
                        <th className="global-ref-th-ui">
                          <input
                            className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                            placeholder="Contains..."
                            value={filters.rcName}
                            onChange={(e) =>
                              handleFilterChange("rcName", e.target.value)
                            }
                          />
                        </th>
                        <th className="global-ref-th-ui">
                          <input
                            className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                            placeholder="Contains..."
                            value={filters.rcTypeCode}
                            onChange={(e) =>
                              handleFilterChange("rcTypeCode", e.target.value)
                            }
                          />
                        </th>
                        <th className="global-ref-th-ui">
                          <input
                            className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                            placeholder="Contains..."
                            value={filters.rcGroup}
                            onChange={(e) =>
                              handleFilterChange("rcGroup", e.target.value)
                            }
                          />
                        </th>
                        <th className="global-ref-th-ui">
                          <input
                            className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                            placeholder="Contains..."
                            value={filters.groupCode}
                            onChange={(e) =>
                              handleFilterChange("groupCode", e.target.value)
                            }
                          />
                        </th>
                        <th className="global-ref-th-ui">
                          <input
                            className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                            placeholder="Contains..."
                            value={filters.active}
                            onChange={(e) =>
                              handleFilterChange("active", e.target.value)
                            }
                          />
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {pageRows.length > 0 ? (
                        pageRows.map((row, index) => {
                          const selected =
                            getRowId(selectedRow) === getRowId(row);
                          return (
                            <tr
                              key={getRowId(row) || index}
                              className={`global-tran-tr-ui ${selected ? "bg-blue-50" : ""
                                }`}
                              onClick={() => handleSelectRow(row)}
                              onDoubleClick={() => handleRowDoubleClick(row)}
                            >
                              <td className="global-ref-td-ui">{row.rcCode}</td>
                              <td className="global-ref-td-ui">{row.rcName}</td>
                              <td className="global-ref-td-ui">
                                {row.rcTypeCode}
                              </td>
                              <td className="global-ref-td-ui">
                                {row.rcGroup === "Y" ? "Yes" : "No"}
                              </td>
                              <td className="global-ref-td-ui">
                                {row.groupCode}
                              </td>
                              <td className="global-ref-td-ui">
                                {row.active === "Y" ? "Yes" : "No"}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td
                            colSpan={6}
                            className="global-ref-norecords-ui text-center"
                          >
                            {loading ? (
                              <span className="inline-flex items-center gap-2">
                                <FontAwesomeIcon icon={faSpinner} spin />
                                Loading…
                              </span>
                            ) : (
                              "No records found"
                            )}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  {/* Paging */}
                  <div className="flex items-center justify-between p-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span>Rows per page:</span>
                      <select
                        value={pageSize}
                        onChange={(e) =>
                          setPageSize(Number(e.target.value) || 10)
                        }
                        className="border rounded px-1 py-0.5 text-xs"
                      >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={30}>30</option>
                      </select>
                      <span className="ml-4">
                        Total Records: {filtered.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="px-2 py-1 border rounded disabled:opacity-40"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1}
                      >
                        Prev
                      </button>
                      <span>
                        Page {page} of {totalPages}
                      </span>
                      <button
                        className="px-2 py-1 border rounded disabled:opacity-40"
                        onClick={() =>
                          setPage((p) => Math.min(totalPages, p + 1))
                        }
                        disabled={page >= totalPages}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: REGISTRATION + FORM */}
            <div className="flex flex-col gap-4">
              {/* Registration Information */}
              <div className="border rounded-lg bg-gray-50 p-3">
                <div className="text-[11px] font-semibold text-slate-700 mb-2">
                  Registration Information
                </div>
                <div className="grid grid-cols-1 gap-y-1 text-[11px]">
                  <FieldRenderer
                    label="Registered By"
                    type="text"
                    value={regInfo.registeredBy || ""}
                    disabled
                    labelWidth="w-28"
                  />
                  <FieldRenderer
                    label="Registered Date"
                    type="text"
                    value={regInfo.registeredDate || ""}
                    disabled
                    labelWidth="w-28"
                  />
                  <FieldRenderer
                    label="Last Updated By"
                    type="text"
                    value={regInfo.lastUpdatedBy || ""}
                    disabled
                    labelWidth="w-28"
                  />
                  <FieldRenderer
                    label="Last Updated Date"
                    type="text"
                    value={regInfo.lastUpdatedDate || ""}
                    disabled
                    labelWidth="w-28"
                  />
                </div>
              </div>

              {/* RC Form */}
              <div className="border rounded-lg bg-gray-50 p-3">
                <div className="text-[11px] font-semibold text-slate-700 mb-2">
                  RC Details
                </div>
                <div className="space-y-1">
                  <FieldRenderer
                    label="RC Code"
                    required
                    type="text"
                    labelWidth="w-28"
                    value={editing?.rcCode || ""}
                    disabled={!isEditing || (editing && editing.__existing)}
                    onChange={handleRcCodeChange}
                  />

                  <FieldRenderer
                    label="RC Description"
                    required
                    type="text"
                    labelWidth="w-28"
                    value={editing?.rcName || ""}
                    disabled={!isEditing}
                    onChange={(val) =>
                      setEditing((prev) => ({
                        ...(prev || {}),
                        rcName: val,
                      }))
                    }
                  />

                  <FieldRenderer
                    label="RC Type"
                    required
                    type="select"
                    labelWidth="w-28"
                    value={editing?.rcTypeCode || ""}
                    disabled={!isEditing}
                    options={[
                      { value: "Branch", label: "Branch" },
                      { value: "Department", label: "Department" },
                      { value: "Project", label: "Project" },
                    ]}
                    onChange={(val) =>
                      setEditing((prev) => ({
                        ...(prev || {}),
                        rcTypeCode: val,
                      }))
                    }
                  />

                  <FieldRenderer
                    label="RC Group"
                    type="select"
                    labelWidth="w-28"
                    value={
                      editing?.rcGroup === "Y" || editing?.rcGroup === "Yes"
                        ? "Yes"
                        : "No"
                    }
                    disabled={!isEditing}
                    options={[
                      { value: "Yes", label: "Yes" },
                      { value: "No", label: "No" },
                    ]}
                    onChange={(val) =>
                      setEditing((prev) => ({
                        ...(prev || {}),
                        rcGroup: val === "Yes" ? "Y" : "N",
                      }))
                    }
                  />

                  <FieldRenderer
                    label="Group Code"
                    type="text"
                    labelWidth="w-28"
                    value={editing?.groupCode || ""}
                    disabled={!isEditing}
                    onChange={(val) =>
                      setEditing((prev) => ({
                        ...(prev || {}),
                        groupCode: val.toUpperCase(),
                      }))
                    }
                  />

                  <FieldRenderer
                    label="Active ?"
                    type="select"
                    labelWidth="w-28"
                    value={
                      editing?.active === "N" || editing?.active === "No"
                        ? "No"
                        : "Yes"
                    }
                    disabled={!isEditing}
                    options={[
                      { value: "Yes", label: "Yes" },
                      { value: "No", label: "No" },
                    ]}
                    onChange={(val) =>
                      setEditing((prev) => ({
                        ...(prev || {}),
                        active: val === "Yes" ? "Y" : "N",
                      }))
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER STRIP */}
        <div className="p-3 bg-gray-50 border-t border-gray-200 flex justify-between items-center mt-4 rounded-b-lg">
          <div className="text-sm text-gray-700">
            Showing{" "}
            <span className="font-medium">{filtered.length}</span> of{" "}
            <span className="font-medium">{rows.length}</span> responsibility
            centers
          </div>
        </div>
      </div>
    </div>
  );
};

export default RCMast;
