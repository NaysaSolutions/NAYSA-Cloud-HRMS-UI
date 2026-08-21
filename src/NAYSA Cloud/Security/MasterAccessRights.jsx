import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEye,
  faUndo,
  faCheck,
  faPrint,
  faChevronDown,
  faFileCsv,
  faFileExcel,
  faFilePdf,
  faInfoCircle,
  faVideo,
  faDatabase,
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

export default function MasterAccessRights() {
  const docType       = "MasterAccRight";
  const documentTitle = reftables?.[docType]         ?? "Master Data Access Rights";
  const pdfLink       = reftablesPDFGuide?.[docType];
  const videoLink     = reftablesVideoGuide?.[docType];

  const exportRef = useRef(null);
  const guideRef  = useRef(null);

  // always holds the latest masterData list — avoids stale closure
  const masterDataRef = useRef([]);

  const [isOpenExport, setOpenExport] = useState(false);
  const [isOpenGuide,  setOpenGuide]  = useState(false);

  const [loading,           setLoading]          = useState(false);
  const [saving,            setSaving]            = useState(false);
  const [loadingMasterData, setLoadingMasterData] = useState(false);

  const [users,      setUsers]      = useState([]);
  const [masterData, setMasterData] = useState([]);

  // mirrors RoleAccessTab:
  //   selectedUsers     ↔ selectedRoles   (array of codes)
  //   checkedMasterData ↔ checkedMenus    (Set of codes)
  //   showMasterData    ↔ showMenus       (boolean gate)
  const [selectedUsers,     setSelectedUsers]     = useState([]);
  const [checkedMasterData, setCheckedMasterData] = useState(new Set());
  const [showMasterData,    setShowMasterData]    = useState(false);

  const loadMasterDataEndpoint    = "/master-access-rights/load-master-data";
  const getUserMasterDataEndpoint = "/master-access-rights/get-user-master-data";
  const upsertEndpoint            = "/master-access-rights/upsert-user-master-data";
  const deleteEndpoint            = "/master-access-rights/delete-user-master-data";

  // close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (exportRef.current && !exportRef.current.contains(e.target)) setOpenExport(false);
      if (guideRef.current  && !guideRef.current.contains(e.target))  setOpenGuide(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const allMasterCodes = useMemo(
    () => (Array.isArray(masterData) ? masterData : []).map((m) => m.masterCode).filter(Boolean),
    [masterData]
  );

  const allSelected =
    allMasterCodes.length > 0 && checkedMasterData.size === allMasterCodes.length;

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

  // ── fetch master data list ───────────────────────────────────────────────────
  const fetchMasterData = async () => {
    try {
      const { data } = await apiClient.get(loadMasterDataEndpoint);
      const rows = normalizeRows(data).map((r) => ({
        masterCode: r.masterCode ?? r.MASTER_CODE ?? r.master_code ?? "",
        moduleName: r.moduleName ?? r.MODULE_NAME ?? r.module        ?? "",
        subMenu:    r.subMenu    ?? r.SUB_MENU    ?? r.sub_menu      ?? "",
        particular: r.particular ?? r.menuName    ?? r.MENU_NAME     ?? r.menu_name ?? "",
      }));
      const filtered = rows.filter((r) => r.masterCode);
      masterDataRef.current = filtered;
      setMasterData(filtered);
      return filtered;
    } catch (e) {
      console.error("fetchMasterData failed", e);
      setMasterData([]);
      await useSwalErrorAlert("Error!", "Failed to fetch master data list.");
      return [];
    }
  };

  // ── fetch which masterCodes are checked for given users ──────────────────────
  // mirrors loadRoleMenus: returns a Set of codes directly
  const fetchUserMasterData = async (userCodes = []) => {
    if (!userCodes?.length) return new Set();
    try {
      // sproc OPENJSON uses WITH (userCode NVARCHAR(100)) → must send [{userCode}] objects
      const { data } = await apiClient.post(getUserMasterDataEndpoint, {
        json_data: { users: userCodes.map((uc) => ({ userCode: uc })) },
      });
      const rows = normalizeRows(data);
      return new Set(
        rows
          .map((r) => r.masterCode ?? r.MASTER_CODE ?? r.master_code ?? r.mastercode ?? null)
          .filter(Boolean)
      );
    } catch (e) {
      console.error("fetchUserMasterData failed", e);
      return new Set();
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchMasterData();
  }, []);

  // ── toggles (mirrors RoleAccessTab) ─────────────────────────────────────────
  const toggleUser = useCallback((userCode) => {
    if (showMasterData) return; // lock users while master data panel is open
    setSelectedUsers((prev) =>
      prev.includes(userCode)
        ? prev.filter((x) => x !== userCode)
        : [...prev, userCode]
    );
  }, [showMasterData]);

  const toggleMasterData = useCallback((masterCode) => {
    setCheckedMasterData((prev) => {
      const next = new Set(prev);
      if (next.has(masterCode)) next.delete(masterCode);
      else next.add(masterCode);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setCheckedMasterData((prev) =>
      allMasterCodes.length > 0 && prev.size === allMasterCodes.length
        ? new Set()
        : new Set(allMasterCodes)
    );
  }, [allMasterCodes]);

  // ── View Rights (mirrors handleViewMenus + loadRoleMenus) ───────────────────
  const handleViewRights = useCallback(async () => {
    if (selectedUsers.length === 0) {
      await useSwalWarningAlert("No Users Selected", "Please select at least one user before viewing master data.");
      return;
    }

    setLoadingMasterData(true);
    setShowMasterData(false);
    setCheckedMasterData(new Set());

    try {
      if (masterDataRef.current.length === 0) {
        await fetchMasterData();
      }
      const checkedSet = await fetchUserMasterData(selectedUsers);
      setCheckedMasterData(checkedSet);
      setShowMasterData(true);
    } catch (e) {
      console.error("handleViewRights failed", e);
      await useSwalErrorAlert("Error!", "Failed to load master data access.");
    } finally {
      setLoadingMasterData(false);
    }
  }, [selectedUsers]);

  // ── Reset ────────────────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    setSelectedUsers([]);
    setCheckedMasterData(new Set());
    setShowMasterData(false);
  }, []);

  // ── Apply ────────────────────────────────────────────────────────────────────
  const handleApply = useCallback(async () => {
    if (selectedUsers.length === 0) {
      await useSwalWarningAlert("No Users Selected", "Please select at least one user before applying.");
      return;
    }
    if (!showMasterData) {
      await useSwalWarningAlert("Nothing to Apply", "Click View Rights first, then modify and apply.");
      return;
    }

    const checkedCodes   = Array.from(checkedMasterData);
    const uncheckedCodes = masterDataRef.current
      .map((m) => m.masterCode)
      .filter((mc) => !checkedMasterData.has(mc));

    setSaving(true);
    try {
      if (checkedCodes.length > 0) {
        const { data: res } = await apiClient.post(upsertEndpoint, {
          json_data: {
            dt1: checkedCodes.map((masterCode) => ({ masterCode })),
            dt2: selectedUsers.map((userCode)  => ({ userCode })),
          },
        });
        const ok =
          res?.success === true ||
          res?.data?.status === "success" ||
          res?.message?.toLowerCase?.().includes("saved");
        if (!ok) throw new Error(res?.message || "Upsert failed.");
      }

      if (uncheckedCodes.length > 0) {
        await apiClient.post(deleteEndpoint, {
          json_data: {
            dt1: uncheckedCodes.map((masterCode) => ({ masterCode })),
            dt2: selectedUsers.map((userCode)    => ({ userCode })),
          },
        });
      }

      await useSwalSuccessAlert("Success!", "User Master Data Access updated successfully!");

      // refresh from server — same as loadRoleMenus after save
      const refreshed = await fetchUserMasterData(selectedUsers);
      setCheckedMasterData(refreshed);
    } catch (e) {
      console.error("handleApply failed", e);
      await useSwalErrorAlert("Error!", e?.response?.data?.message || "Error saving master data access.");
    } finally {
      setSaving(false);
    }
  }, [selectedUsers, showMasterData, checkedMasterData]);

  const handleExport    = async (type) => {
    await useSwalWarningAlert("Export", `Export (${type}) not yet wired for Master Access Rights.`);
  };
  const handlePDFGuide   = () => pdfLink   && window.open(pdfLink,   "_blank");
  const handleVideoGuide = () => videoLink && window.open(videoLink, "_blank");

  // ── columns (mirrors RoleAccessTab column definitions exactly) ───────────────
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
              disabled={showMasterData}
              onClick={(e) => e.stopPropagation()}
              onChange={() => toggleUser(row.userCode)}
            />
          </div>
        ),
      },
      { key: "userCode", label: "User Code", sortable: true, width: 140 },
      { key: "userName", label: "Username",  sortable: true, width: 260 },
    ],
    [selectedUsers, showMasterData, toggleUser]
  );

  const masterDataColumns = useMemo(
    () => [
      {
        key:        "__select",
        label:      "Full Access",
        sortable:   false,
        filterable: false,
        width:      100,
        render: (row) => (
          <div className="flex justify-end md:justify-center py-1">
            <input
              type="checkbox"
              className="h-6 w-6 md:h-4 md:w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              checked={checkedMasterData.has(row.masterCode)}
              onClick={(e) => e.stopPropagation()}
              onChange={() => toggleMasterData(row.masterCode)}
            />
          </div>
        ),
      },
      { key: "moduleName", label: "Module",    sortable: true, width: 200 },
      { key: "subMenu",    label: "Sub Menu",  sortable: true, width: 200 },
      { key: "particular", label: "Menu Name", sortable: true, width: 360 },
    ],
    [checkedMasterData, toggleMasterData]
  );

  const userTableData = useMemo(
    () => (Array.isArray(users) ? users : []).map((row, index) => ({ ...row, __idx: index })),
    [users]
  );

  const masterDataTableData = useMemo(
    () => (Array.isArray(masterData) ? masterData : []).map((row, index) => ({ ...row, __idx: index })),
    [masterData]
  );

  // ── render ───────────────────────────────────────────────────────────────────
  return (
    <div className="global-ref-main-div-ui mt-24">
      {(loading || saving || loadingMasterData) && <LoadingSpinner />}

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

          {/* <div ref={exportRef} className="relative">
            <button onClick={() => setOpenExport((v) => !v)} className="bg-green-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700">
              <FontAwesomeIcon icon={faPrint} /> Export <FontAwesomeIcon icon={faChevronDown} className="text-xs" />
            </button>
            {isOpenExport && (
              <div className="absolute right-0 mt-1 w-40 rounded-lg shadow-lg bg-white ring-1 ring-black/10 z-[60] dark:bg-gray-800">
                <button onClick={() => { handleExport("csv");   setOpenExport(false); }} className="block w-full text-left px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900">
                  <FontAwesomeIcon icon={faFileCsv}   className="mr-2 text-green-600" /> CSV
                </button>
                <button onClick={() => { handleExport("excel"); setOpenExport(false); }} className="block w-full text-left px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900">
                  <FontAwesomeIcon icon={faFileExcel} className="mr-2 text-green-600" /> Excel
                </button>
                <button onClick={() => { handleExport("pdf");   setOpenExport(false); }} className="block w-full text-left px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900">
                  <FontAwesomeIcon icon={faFilePdf}   className="mr-2 text-red-600"   /> PDF
                </button>
              </div>
            )}
          </div> */}

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
                  docType="MasterAccRight"
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

          {/* MASTER DATA PANEL */}
          <div className="w-full md:w-1/2">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 h-full flex flex-col">

              <div className="flex items-center justify-between mb-2 gap-3">
                <h2 className="text-lg font-semibold text-gray-700">Master Data</h2>
                {showMasterData && (
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

              {showMasterData ? (
                <>
                  {/* selected users badge — mirrors RoleAccessTab "Selected Role" badge */}
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
                      docType="MasterAccRight"
                      columns={masterDataColumns}
                      data={masterDataTableData}
                      isLoading={loadingMasterData}
                      itemsPerPage={50}
                      showFilters={true}
                      onRowClick={(row) => toggleMasterData(row.masterCode)}
                      onRowDoubleClick={(row) => toggleMasterData(row.masterCode)}
                      mobileSelectable={true}
                      selectedRowChecker={(row) => checkedMasterData.has(row.masterCode)}
                      tableSize="Half"
                      className="h-full"
                    />
                  </div>
                </>
              ) : (
                <div className="h-full min-h-[320px] flex items-center justify-center text-center text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <FontAwesomeIcon icon={faDatabase} className="text-xl mb-2 text-gray-400" />
                    <h3 className="font-medium text-sm mb-1">Master Data Selection Hidden</h3>
                    <p className="text-xs px-4">
                      Select user(s) and click "View Rights" to see and assign master data access.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {selectedUsers.length > 0 && (
          <div className="mt-3 bg-blue-50 p-2 rounded text-xs">
            {showMasterData
              ? `Assigning master data access to ${selectedUsers.length} selected user(s). Select items and click Apply.`
              : `${selectedUsers.length} user(s) selected. Click "View Rights" to continue.`}
          </div>
        )}

        {showMasterData && checkedMasterData.size > 0 && (
          <div className="mt-2 bg-green-50 p-2 rounded text-xs">
            {`${checkedMasterData.size} master data item(s) selected for Full Access.`}
          </div>
        )}
      </div>
    </div>
  );
}