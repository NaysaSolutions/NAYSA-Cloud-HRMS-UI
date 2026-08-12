import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEye,
  faUndo,
  faCheck,
  faChevronDown,
  faFilePdf,
  faInfoCircle,
  faVideo,
  faFileAlt,
  faSquare,
  faCheckSquare,
  faShieldAlt,
} from "@fortawesome/free-solid-svg-icons";

import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable.jsx";

import {
  reftables,
  reftablesPDFGuide,
  reftablesVideoGuide,
} from "@/NAYSA Cloud/Global/reftable";

import {
  useSwalSuccessAlert,
  useSwalWarningAlert,
  useSwalErrorAlert,
} from "@/NAYSA Cloud/Global/behavior.jsx";

function normalizeRows(data) {
  const raw = data?.data ?? data ?? [];

  if (Array.isArray(raw) && raw[0]?.result) {
    try {
      const parsed =
        typeof raw[0].result === "string"
          ? JSON.parse(raw[0].result)
          : raw[0].result;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return Array.isArray(raw) ? raw : [];
}

export default function ReportAccessRights() {
  const docType       = "ReportAccRight";
  const documentTitle = reftables?.[docType]        ?? "Management Report Access Rights";
  const pdfLink       = reftablesPDFGuide?.[docType];
  const videoLink     = reftablesVideoGuide?.[docType];

  const exportRef = useRef(null);
  const guideRef  = useRef(null);

  // always holds the latest reportData list — avoids stale closure
  const reportDataRef = useRef([]);

  const [isOpenExport, setOpenExport] = useState(false);
  const [isOpenGuide,  setOpenGuide]  = useState(false);

  const [loading,          setLoading]         = useState(false);
  const [saving,           setSaving]          = useState(false);
  const [loadingReports,   setLoadingReports]  = useState(false);

  const [users,      setUsers]      = useState([]);
  const [reportData, setReportData] = useState([]);

  const [selectedUsers,    setSelectedUsers]    = useState([]);
  const [checkedReports,   setCheckedReports]   = useState(new Set());
  const [showReports,      setShowReports]      = useState(false);

  const loadReportsEndpoint    = "/report-access-rights/load-report-data";
  const getUserReportsEndpoint = "/report-access-rights/get-user-report-data";
  const upsertEndpoint         = "/report-access-rights/upsert-user-report-data";
  const deleteEndpoint         = "/report-access-rights/delete-user-report-data";

  // close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (exportRef.current && !exportRef.current.contains(e.target)) setOpenExport(false);
      if (guideRef.current  && !guideRef.current.contains(e.target))  setOpenGuide(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const allReportIds = useMemo(
    () => (Array.isArray(reportData) ? reportData : []).map((r) => r.reportId).filter(Boolean),
    [reportData]
  );

  const allSelected =
    allReportIds.length > 0 && checkedReports.size === allReportIds.length;

  const selectedUserDetails = useMemo(
    () => (Array.isArray(users) ? users : []).filter((u) => selectedUsers.includes(u.userCode)),
    [users, selectedUsers]
  );

  // ── fetch users ──────────────────────────────────────────────────────────────
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get("/load", { params: { Status: "Active" } });
      let userData = [];
      if (Array.isArray(data?.data) && data.data[0]?.result) {
        const parsed =
          typeof data.data[0].result === "string"
            ? JSON.parse(data.data[0].result)
            : data.data[0].result;
        if (Array.isArray(parsed)) userData = parsed;
      }
      setUsers(userData);
    } catch (e) {
      console.error("fetchUsers failed", e);
      setUsers([]);
      await useSwalErrorAlert("Error!", "Failed to fetch users.");
    } finally {
      setLoading(false);
    }
  };

  // ── fetch report list ────────────────────────────────────────────────────────
  const fetchReportData = async () => {
    try {
      const { data } = await apiClient.get(loadReportsEndpoint);
      const rows = normalizeRows(data).map((r) => ({
        reportId:   r.reportId   ?? r.REPORT_ID   ?? r.report_id   ?? "",
        moduleName: r.moduleName ?? r.MODULE_NAME  ?? r.module      ?? "",
        reportName: r.reportName ?? r.REPORT_NAME  ?? r.report_name ?? "",
      }));
      const filtered = rows.filter((r) => r.reportId);
      reportDataRef.current = filtered;
      setReportData(filtered);
      return filtered;
    } catch (e) {
      console.error("fetchReportData failed", e);
      setReportData([]);
      await useSwalErrorAlert("Error!", "Failed to fetch report list.");
      return [];
    }
  };

  // ── fetch which reports are checked for given users ──────────────────────────
  const fetchUserReportData = async (userCodes = []) => {
    if (!userCodes?.length) return new Set();
    try {
      const { data } = await apiClient.post(getUserReportsEndpoint, {
        json_data: { users: userCodes.map((uc) => ({ userCode: uc })) },
      });
      const rows = normalizeRows(data);
      return new Set(
        rows
          .map((r) => r.reportId ?? r.REPORT_ID ?? r.report_id ?? null)
          .filter(Boolean)
      );
    } catch (e) {
      console.error("fetchUserReportData failed", e);
      return new Set();
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchReportData();
  }, []);

  // ── toggles ──────────────────────────────────────────────────────────────────
  const toggleUser = useCallback((userCode) => {
    if (showReports) return; // lock users while report panel is open
    setSelectedUsers((prev) =>
      prev.includes(userCode)
        ? prev.filter((x) => x !== userCode)
        : [...prev, userCode]
    );
  }, [showReports]);

  const toggleReport = useCallback((reportId) => {
    setCheckedReports((prev) => {
      const next = new Set(prev);
      if (next.has(reportId)) next.delete(reportId);
      else next.add(reportId);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setCheckedReports((prev) =>
      allReportIds.length > 0 && prev.size === allReportIds.length
        ? new Set()
        : new Set(allReportIds)
    );
  }, [allReportIds]);

  // ── View Rights ──────────────────────────────────────────────────────────────
  const handleViewRights = useCallback(async () => {
    if (selectedUsers.length === 0) {
      await useSwalWarningAlert("No Users Selected", "Please select at least one user before viewing report access.");
      return;
    }

    setLoadingReports(true);
    setShowReports(false);
    setCheckedReports(new Set());

    try {
      if (reportDataRef.current.length === 0) {
        await fetchReportData();
      }
      const checkedSet = await fetchUserReportData(selectedUsers);
      setCheckedReports(checkedSet);
      setShowReports(true);
    } catch (e) {
      console.error("handleViewRights failed", e);
      await useSwalErrorAlert("Error!", "Failed to load report access.");
    } finally {
      setLoadingReports(false);
    }
  }, [selectedUsers]);

  // ── Reset ────────────────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    setSelectedUsers([]);
    setCheckedReports(new Set());
    setShowReports(false);
  }, []);

  // ── Apply ────────────────────────────────────────────────────────────────────
  const handleApply = useCallback(async () => {
    if (selectedUsers.length === 0) {
      await useSwalWarningAlert("No Users Selected", "Please select at least one user before applying.");
      return;
    }
    if (!showReports) {
      await useSwalWarningAlert("Nothing to Apply", "Click View Rights first, then modify and apply.");
      return;
    }

    const checkedIds   = Array.from(checkedReports);
    const uncheckedIds = reportDataRef.current
      .map((r) => r.reportId)
      .filter((id) => !checkedReports.has(id));

    setSaving(true);
    try {
      if (checkedIds.length > 0) {
        const { data: res } = await apiClient.post(upsertEndpoint, {
          json_data: {
            dt1: checkedIds.map((reportId) => ({ reportId })),
            dt2: selectedUsers.map((userCode)  => ({ userCode })),
          },
        });
        const ok =
          res?.success === true ||
          res?.data?.status === "success" ||
          res?.message?.toLowerCase?.().includes("saved");
        if (!ok) throw new Error(res?.message || "Upsert failed.");
      }

      if (uncheckedIds.length > 0) {
        await apiClient.post(deleteEndpoint, {
          json_data: {
            dt1: uncheckedIds.map((reportId) => ({ reportId })),
            dt2: selectedUsers.map((userCode)  => ({ userCode })),
          },
        });
      }

      await useSwalSuccessAlert("Success!", "User Report Access updated successfully!");

      // refresh from server
      const refreshed = await fetchUserReportData(selectedUsers);
      setCheckedReports(refreshed);
    } catch (e) {
      console.error("handleApply failed", e);
      await useSwalErrorAlert("Error!", e?.response?.data?.message || "Error saving report access.");
    } finally {
      setSaving(false);
    }
  }, [selectedUsers, showReports, checkedReports]);

  const handlePDFGuide   = () => pdfLink   && window.open(pdfLink,   "_blank");
  const handleVideoGuide = () => videoLink && window.open(videoLink, "_blank");

  // ── columns ──────────────────────────────────────────────────────────────────
  const userColumns = useMemo(
    () => [
      {
        key:        "__select",
        label:      "Select",
        sortable:   false,
        filterable: false,
        width:      80,
        render: (row) => (
          <div className="flex justify-end md:justify-center py-1">
            <input
              type="checkbox"
              className="h-6 w-6 md:h-4 md:w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              checked={selectedUsers.includes(row.userCode)}
              disabled={showReports}
              onClick={(e) => e.stopPropagation()}
              onChange={() => toggleUser(row.userCode)}
            />
          </div>
        ),
      },
      { key: "userCode", label: "User Code", sortable: true, width: 140 },
      { key: "userName", label: "Username",  sortable: true, width: 260 },
    ],
    [selectedUsers, showReports, toggleUser]
  );

  const reportColumns = useMemo(
    () => [
      {
        key:        "__select",
        label:      "Access",
        sortable:   false,
        filterable: false,
        width:      80,
        render: (row) => (
          <div className="flex justify-end md:justify-center py-1">
            <input
              type="checkbox"
              className="h-6 w-6 md:h-4 md:w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              checked={checkedReports.has(row.reportId)}
              onClick={(e) => e.stopPropagation()}
              onChange={() => toggleReport(row.reportId)}
            />
          </div>
        ),
      },
      { key: "moduleName", label: "Module",      sortable: true, width: 200 },
      { key: "reportName", label: "Report Name", sortable: true, width: 360 },
    ],
    [checkedReports, toggleReport]
  );

  const userTableData = useMemo(
    () => (Array.isArray(users) ? users : []).map((row, index) => ({ ...row, __idx: index })),
    [users]
  );

  const reportTableData = useMemo(
    () => (Array.isArray(reportData) ? reportData : []).map((row, index) => ({ ...row, __idx: index })),
    [reportData]
  );

  // ── render ───────────────────────────────────────────────────────────────────
  return (
    <div className="global-ref-main-div-ui mt-24">
      {(loading || saving || loadingReports) && <LoadingSpinner />}

      {/* Header */}
      <div className="fixed mt-4 top-14 left-6 right-6 z-30 global-ref-header-ui flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <h1 className="global-ref-headertext-ui">{documentTitle}</h1>
        </div>

        <div className="flex gap-2 justify-center text-xs flex-wrap">
          <button onClick={handleViewRights} className="bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700">
            <FontAwesomeIcon icon={faEye} /> View Rights
          </button>
          <button onClick={handleReset} className="bg-gray-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-700">
            <FontAwesomeIcon icon={faUndo} /> Reset
          </button>
          <button onClick={handleApply} className="bg-green-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700">
            <FontAwesomeIcon icon={faCheck} /> Apply
          </button>

          <div ref={guideRef} className="relative">
            <button onClick={() => setOpenGuide((v) => !v)} className="bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700">
              <FontAwesomeIcon icon={faInfoCircle} /> Help <FontAwesomeIcon icon={faChevronDown} className="text-xs" />
            </button>
            {isOpenGuide && (
              <div className="absolute right-0 mt-1 w-40 rounded-md shadow-lg bg-white ring-1 ring-black/10 z-[60] dark:bg-gray-800">
                <button onClick={() => { handlePDFGuide();   setOpenGuide(false); }} className="block w-full text-left px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900">
                  <FontAwesomeIcon icon={faFilePdf} className="mr-2 text-red-600"  /> User Guide
                </button>
                <button onClick={() => { handleVideoGuide(); setOpenGuide(false); }} className="block w-full text-left px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900">
                  <FontAwesomeIcon icon={faVideo}   className="mr-2 text-blue-600" /> Video Guide
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ height: "15px" }} aria-hidden="true" />

      {/* Body */}
      <div className="global-ref-body-ui">
        <div className="flex flex-col md:flex-row md:items-stretch gap-4">

          {/* USERS PANEL */}
          <div className="w-full md:w-1/2">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 h-full flex flex-col">
              <h2 className="text-lg font-semibold mb-2 text-gray-700">Users</h2>
              <div className="flex-1 min-h-0">
                <SearchGlobalReferenceTable
                  docType="ReportAccRight"
                  columns={userColumns}
                  data={userTableData}
                  isLoading={loading}
                  itemsPerPage={10}
                  showFilters={true}
                  onRowClick={(row) => toggleUser(row.userCode)}
                  onRowDoubleClick={(row) => toggleUser(row.userCode)}
                  mobileSelectable={true}
                  selectedRowChecker={(row) => selectedUsers.includes(row.userCode)}
                  tableSize="Half"
                  className="h-full"
                />
              </div>
            </div>
          </div>

          {/* REPORTS PANEL */}
          <div className="w-full md:w-1/2">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 h-full flex flex-col">

              <div className="flex items-center justify-between mb-2 gap-3">
                <h2 className="text-lg font-semibold text-gray-700">Management Reports</h2>
                {showReports && (
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 transition-colors"
                  >
                    <FontAwesomeIcon icon={allSelected ? faSquare : faCheckSquare} />
                    {allSelected ? "Unselect All" : "Select All"}
                  </button>
                )}
              </div>

              {showReports ? (
                <>
                  {/* selected users badge */}
                  <div className="mb-2">
                    <div className="inline-flex max-w-full items-center gap-2 rounded-md border border-blue-100 bg-blue-50 px-3 py-2">
                      <FontAwesomeIcon icon={faShieldAlt} className="text-blue-600 text-sm shrink-0" />
                      <div className="flex items-center gap-2 min-w-0 flex-wrap">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-blue-700 shrink-0">
                          Selected User{selectedUserDetails.length !== 1 ? "s" : ""}
                        </span>
                        {selectedUserDetails.length === 0 ? (
                          <span className="text-xs text-gray-500">None</span>
                        ) : selectedUserDetails.length === 1 ? (
                          <span className="inline-flex items-center rounded-full border border-blue-200 bg-white px-2 py-0.5 text-xs font-medium text-blue-800 max-w-[260px] truncate">
                            {selectedUserDetails[0].userCode} – {selectedUserDetails[0].userName}
                          </span>
                        ) : (
                          <>
                            <span className="inline-flex items-center rounded-full border border-blue-200 bg-white px-2 py-0.5 text-xs font-medium text-blue-800">
                              {selectedUserDetails.length} users
                            </span>
                            {selectedUserDetails.slice(0, 1).map((u) => (
                              <span key={u.userCode} className="inline-flex items-center rounded-full border border-blue-200 bg-white px-2 py-0.5 text-[11px] text-blue-700">
                                {u.userCode}
                              </span>
                            ))}
                            {selectedUserDetails.length > 1 && (
                              <span className="inline-flex items-center rounded-full border border-blue-200 bg-white px-2 py-0.5 text-[11px] text-blue-700">
                                +{selectedUserDetails.length - 1} more
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 min-h-0">
                    <SearchGlobalReferenceTable
                      docType="ReportAccRight"
                      columns={reportColumns}
                      data={reportTableData}
                      isLoading={loadingReports}
                      itemsPerPage={50}
                      showFilters={true}
                      onRowClick={(row) => toggleReport(row.reportId)}
                      onRowDoubleClick={(row) => toggleReport(row.reportId)}
                      mobileSelectable={true}
                      selectedRowChecker={(row) => checkedReports.has(row.reportId)}
                      tableSize="Half"
                      className="h-full"
                    />
                  </div>
                </>
              ) : (
                <div className="h-full min-h-[320px] flex items-center justify-center text-center text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <FontAwesomeIcon icon={faFileAlt} className="text-xl mb-2 text-gray-400" />
                    <h3 className="font-medium text-sm mb-1">Report Selection Hidden</h3>
                    <p className="text-xs px-4">
                      Select user(s) and click "View Rights" to see and assign report access.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {selectedUsers.length > 0 && (
          <div className="mt-3 bg-blue-50 p-2 rounded text-xs">
            {showReports
              ? `Assigning report access to ${selectedUsers.length} selected user(s). Select items and click Apply.`
              : `${selectedUsers.length} user(s) selected. Click "View Rights" to continue.`}
          </div>
        )}

        {showReports && checkedReports.size > 0 && (
          <div className="mt-2 bg-green-50 p-2 rounded text-xs">
            {`${checkedReports.size} report(s) selected for Access.`}
          </div>
        )}
      </div>
    </div>
  );
}