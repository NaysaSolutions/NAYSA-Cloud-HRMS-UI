import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faPrint,
  faChevronDown,
  faInfoCircle,
  faFileExcel,
  faFilePdf,
  faVideo,
  faSave,
  faUndo,
  faUsers,
  faShield,
  faUserShield,
  faCheck,
  faEye,
  faArrowLeft,
} from "@fortawesome/free-solid-svg-icons";

import {
  reftables,
  reftablesPDFGuide,
  reftablesVideoGuide,
} from "@/NAYSA Cloud/Global/reftable";

import { useSwalInfoAlert } from "@/NAYSA Cloud/Global/behavior";

import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Swal from "sweetalert2";
import { exportGenericQueryExcel } from "@/NAYSA Cloud/Global/report";

import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

import UsersTab from "./UserAccessRightsTabs/UsersTab";
import RolesTab from "./UserAccessRightsTabs/RolesTab";
import RoleAccessTab from "./UserAccessRightsTabs/RoleAccessTab";
import UserRoleTab from "./UserAccessRightsTabs/UserRoleTab";

const getUserType = (row = {}) =>
  String(
    row.userType ??
      row.USER_TYPE ??
      row.user_type ??
      row.userTypeCode ??
      row.USER_TYPE_CODE ??
      row.user_type_code ??
      row.type ??
      row.TYPE ??
      ""
  )
    .trim()
    .toUpperCase();

const isRegularUser = (row = {}) => {
  const userType = getUserType(row);

  if (!userType) return false;

  const blockedTypes = new Set([
    "ADMIN",
    "ADMINISTRATOR",
    "SUPER ADMIN",
    "SUPERADMIN",
    "SUPER USER",
    "SUPERUSER",
    "SYSTEM",
  ]);

  if (blockedTypes.has(userType)) return false;

  return (
    userType === "REGULAR" ||
    userType === "REGULAR USER" ||
    userType === "REG" ||
    userType === "R" ||
    userType === "USER" ||
    userType.includes("REGULAR")
  );
};

const UserAccessRights = () => {
  const docType = "UserAccRight";
  const { user, companyInfo } = useAuth();

  const documentTitle = reftables[docType];
  const pdfLink = reftablesPDFGuide[docType];
  const videoLink = reftablesVideoGuide[docType];

  const usersTabRef = useRef(null);
  const rolesTabRef = useRef(null);
  const roleAccessTabRef = useRef(null);
  const userAccessTabRef = useRef(null);

  const exportRef = useRef(null);
  const guideRef = useRef(null);

  const [activeTab, setActiveTab] = useState("userRoles");
  const [showMobileMenu, setShowMobileMenu] = useState(true);

  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [appliedUserRoles, setAppliedUserRoles] = useState(new Set());

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isOpenExport, setOpenExport] = useState(false);
  const [isOpenGuide, setOpenGuide] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [tableSize] = useState("Half");

  // FIX #4: Guards to prevent re-fetching already-loaded data on tab switches
  const usersFetched = useRef(false);

  // ─── Pending add action ──────────────────────────────────────────────────
  useEffect(() => {
    if (activeTab === "userRoles" && pendingAction === "add") {
      if (usersTabRef.current?.add) {
        usersTabRef.current.add();
        setPendingAction(null);
      }
    }
  }, [activeTab, pendingAction]);

  // ─── Tabs definition ─────────────────────────────────────────────────────
  const tabs = useMemo(
    () => [
      { id: "userRoles", label: "User Roles", icon: faUsers },
      { id: "roleUserMatch", label: "User-Role Matching", icon: faUserShield },
      { id: "roleAccess", label: "Role Access Rights", icon: faShield },
    ],
    []
  );

  // ─── Data fetchers ───────────────────────────────────────────────────────

  // FIX #1: Wrapped in useCallback so the function reference is stable across
  // renders. Previously a new function was created every render, causing
  // UsersTab's useQuery to treat it as a changed queryFn and re-fetch.
  const fetchRoles = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get("/role", { timeout: 60000 });
      const roleData =
        Array.isArray(data?.data) && data.data[0]?.result
          ? JSON.parse(data.data[0].result)
          : [];
      setRoles(roleData);
      return roleData;
    } catch (error) {
      console.error("Error fetching roles:", error);
      setRoles([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []); // no deps — only uses stable refs (apiClient, setRoles)

  // FIX #1: Also wrapped in useCallback for the same reason
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get("/load", {
        params: { Status: "Active" },
        timeout: 60000,
      });
      const { data } = response;

      let userData = [];
      if (Array.isArray(data?.data) && data.data[0]?.result) {
        try {
          const resultData =
            typeof data.data[0].result === "string"
              ? JSON.parse(data.data[0].result)
              : data.data[0].result;

          if (Array.isArray(resultData)) {
            userData = resultData.filter(
              (u) =>
                (u.userCode || u.USER_CODE || u.userName || u.USER_NAME) &&
                isRegularUser(u)
            );
          }
        } catch (parseError) {
          console.error("Error parsing user data:", parseError);
        }
      }

      setUsers(userData);

      if (userData.length === 0) {
        await useSwalInfoAlert(
          "No Regular Users",
          "No active regular users found in the system."
        );
      }

      return userData;
    } catch (error) {
      console.error("Error fetching users:", error);
      setUsers([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []); // no deps — only uses stable refs

  const fetchUserRoles = async (userCodes = []) => {
    try {
      if (!Array.isArray(userCodes) || userCodes.length === 0) {
        setAppliedUserRoles(new Set());
        return new Set();
      }

      const cleanUserCodes = userCodes
        .map((x) => String(x || "").trim())
        .filter(Boolean);

      const { data } = await apiClient.get("/getUserRoles", {
        params: { userCodes: cleanUserCodes.join(",") },
        timeout: 60000,
      });

      let rows = data?.data ?? [];

      // If backend returns SQL JSON result format
      if (
        Array.isArray(rows) &&
        rows.length > 0 &&
        (rows[0]?.result || rows[0]?.RESULT)
      ) {
        const raw = rows[0]?.result || rows[0]?.RESULT || "[]";
        rows = typeof raw === "string" ? JSON.parse(raw) : raw;
      }

      const s = new Set(
        (Array.isArray(rows) ? rows : [])
          .map((r) => {
            const u =
              r.userCode ??
              r.USER_CODE ??
              r.user_code ??
              "";

            const rc =
              r.roleCode ??
              r.ROLE_CODE ??
              r.role_code ??
              "";

            const cleanUser = String(u || "").trim().toUpperCase();
            const cleanRole = String(rc || "").trim().toUpperCase();

            return cleanUser && cleanRole ? `${cleanUser}-${cleanRole}` : null;
          })
          .filter(Boolean)
      );

      setAppliedUserRoles(s);
      return s;
    } catch (e) {
      console.error("fetchUserRoles failed", e);
      setAppliedUserRoles(new Set());
      return new Set();
    }
  };

  // ─── Initial load ────────────────────────────────────────────────────────
  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  // ─── Tab-switch data loading ─────────────────────────────────────────────
  // FIX #4: Skip fetching users/userRoles if data is already loaded.
  // Previously every tab switch would re-fetch users from scratch, stacking
  // concurrent requests and slowing the DB connection pool.
  useEffect(() => {
    const loadTabData = async () => {
      if (activeTab === "roleUserMatch" || activeTab === "userAccess") {

        // If users are already loaded, skip re-fetching them
        if (usersFetched.current && users.length > 0) {
          if (activeTab === "roleUserMatch") {
            const userCodes = users
              .map((u) => u.userCode || u.USER_CODE)
              .filter(Boolean);
            await fetchUserRoles(userCodes);
          }
          return;
        }

        // First time loading users
        const loadedUsers = await fetchUsers();
        usersFetched.current = true;

        if (activeTab === "roleUserMatch" && loadedUsers.length > 0) {
          const userCodes = loadedUsers
            .map((u) => u.userCode || u.USER_CODE)
            .filter(Boolean);
          await fetchUserRoles(userCodes);
        }
      }
    };

    loadTabData();
  }, [activeTab, fetchUsers, fetchUserRoles, users]);

  // ─── Click-away for dropdowns ────────────────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedOutsideExport =
        exportRef.current && !exportRef.current.contains(event.target);
      const clickedOutsideGuide =
        guideRef.current && !guideRef.current.contains(event.target);

      if (clickedOutsideExport) setOpenExport(false);
      if (clickedOutsideGuide) setOpenGuide(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ─── Spinner delay ───────────────────────────────────────────────────────
  useEffect(() => {
    let timer;
    if (loading) {
      timer = setTimeout(() => setShowSpinner(true), 200);
    } else {
      setShowSpinner(false);
    }
    return () => clearTimeout(timer);
  }, [loading]);

  // ─── Export helpers ───────────────────────────────────────────────────────
  const getDateTimeStamp = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const mi = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    return `${yyyy}${mm}${dd}_${hh}${mi}${ss}`;
  };

  const getActiveExportConfig = () => {
    if (activeTab === "userRoles") {
      const rows = (Array.isArray(roles) ? roles : []).map((r) => ({
        roleCode: r.roleCode || "",
        roleName: r.roleName || "",
        active: r.active === "Y" ? "Yes" : "No",
      }));

      return {
        fileName: "User Access Rights",
        rows,
        columns: [
          { key: "roleCode", label: "Role Code" },
          { key: "roleName", label: "Role Name" },
          { key: "active", label: "Active" },
        ],
      };
    }

    if (activeTab === "roleUserMatch") {
      return rolesTabRef.current?.getExportData?.() || {
        fileName: "User Role Matching",
        rows: [],
        columns: [],
      };
    }

    if (activeTab === "roleAccess") {
      return roleAccessTabRef.current?.getExportData?.() || {
        fileName: "Role Access Rights",
        rows: [],
        columns: [],
      };
    }

    return {
      fileName: "Export",
      rows: [],
      columns: [],
    };
  };

  const handleExport = async (type) => {
    const exportConfig = getActiveExportConfig();
    const exportRows = Array.isArray(exportConfig?.rows) ? exportConfig.rows : [];
    const exportColumns = Array.isArray(exportConfig?.columns)
      ? exportConfig.columns
      : [];

    if (!exportRows.length || !exportColumns.length) {
      useSwalInfoAlert("No data", "There is no data to export.");
      return;
    }

    try {
      const defaultFileName = `${exportConfig.fileName} ${getDateTimeStamp()}`;

      const { value: fileName } = await Swal.fire({
        title: "Enter File Name",
        input: "text",
        inputLabel: "Export File Name:",
        inputValue: defaultFileName,
        width: "400px",
        showCancelButton: true,
        confirmButtonText: "Export",
        inputValidator: (value) => {
          if (!value || value.trim() === "") {
            return "File name cannot be empty!";
          }
        },
      });

      if (!fileName) return;

      if (type === "excel") {
        await exportGenericQueryExcel(
          exportRows,
          {},
          exportColumns,
          [],
          exportColumns,
          {},
          7,
          fileName,
          user?.USER_NAME || user?.userName || "",
          companyInfo?.compName || "",
          companyInfo?.compAddr || "",
          companyInfo?.telNo || ""
        );

        setOpenExport(false);
        return;
      }

      const headers = exportColumns.map((c) => c.label);
      const rows = exportRows.map((row) =>
        exportColumns.map((c) => row[c.key] ?? "")
      );

      if (type === "csv") {
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        XLSX.utils.book_append_sheet(wb, ws, exportConfig.fileName);
        XLSX.writeFile(wb, `${fileName}.csv`, { bookType: "csv" });
      } else if (type === "pdf") {
        const doc = new jsPDF({
          orientation: "landscape",
          unit: "pt",
          format: "A4",
        });

        doc.setFontSize(15);
        doc.text(exportConfig.fileName, 40, 40);

        autoTable(doc, {
          head: [headers],
          body: rows,
          startY: 60,
          margin: { top: 50 },
          theme: "grid",
          styles: {
            fontSize: 8,
            textColor: [40, 40, 40],
            lineColor: [60, 60, 60],
            lineWidth: 0.1,
          },
          headStyles: {
            fillColor: [0, 0, 128],
            textColor: [255, 255, 255],
            fontStyle: "bold",
            halign: "center",
          },
        });

        doc.save(`${fileName}.pdf`);
      }

      setOpenExport(false);
    } catch (err) {
      console.error("Export error:", err);
      useSwalInfoAlert("Export Error", "Failed to export file.");
    }
  };

  const handlePDFGuide = () => {
    if (pdfLink) window.open(pdfLink, "_blank");
    setOpenGuide(false);
  };

  const handleVideoGuide = () => {
    if (videoLink) window.open(videoLink, "_blank");
    setOpenGuide(false);
  };

  // ─── Tab ref action helpers ───────────────────────────────────────────────
  const callRefMethod = useCallback((refObj, methodName, delay = 0) => {
    const run = () => {
      const fn = refObj?.current?.[methodName];
      if (typeof fn === "function") fn();
    };

    if (delay > 0) {
      window.setTimeout(run, delay);
    } else {
      run();
    }
  }, []);

  const handleUsersAdd = useCallback(() => {
    callRefMethod(usersTabRef, "add", 80);
  }, [callRefMethod]);

  const handleUsersSave = useCallback(() => {
    callRefMethod(usersTabRef, "save");
  }, [callRefMethod]);

  const handleUsersReset = useCallback(() => {
    callRefMethod(usersTabRef, "reset");
  }, [callRefMethod]);

  const handleRolesView = useCallback(() => {
    callRefMethod(rolesTabRef, "viewRole", 40);
  }, [callRefMethod]);

  const handleRolesReset = useCallback(() => {
    callRefMethod(rolesTabRef, "reset");
  }, [callRefMethod]);

  const handleRolesApply = useCallback(() => {
    callRefMethod(rolesTabRef, "apply");
  }, [callRefMethod]);

  const handleRoleAccessView = useCallback(() => {
    callRefMethod(roleAccessTabRef, "viewModules", 40);
  }, [callRefMethod]);

  const handleRoleAccessReset = useCallback(() => {
    callRefMethod(roleAccessTabRef, "reset");
  }, [callRefMethod]);

  const handleRoleAccessSave = useCallback(() => {
    callRefMethod(roleAccessTabRef, "saveAccess");
  }, [callRefMethod]);

  // ─── Style constants ──────────────────────────────────────────────────────
  const primaryBtn =
    "flex items-center justify-center h-7 w-14 sm:w-auto sm:h-7 sm:px-3 text-[10px] font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-all";

  const mobileIconBtn =
    "flex items-center justify-center h-9 w-9 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-all";

  const openMobileTab = (tabId) => {
    setActiveTab(tabId);
    setShowMobileMenu(false);
  };

  // ─── Render helpers ───────────────────────────────────────────────────────
  const renderActionButtons = () => {
    switch (activeTab) {
      case "userRoles":
        return (
          <>
            <button type="button" className={primaryBtn} onClick={handleUsersAdd}>
              <FontAwesomeIcon icon={faPlus} />
              <span className="sm:inline ml-1">Add</span>
            </button>

            <button type="button" className={primaryBtn} onClick={handleUsersSave}>
              <FontAwesomeIcon icon={faSave} />
              <span className="sm:inline ml-1">Save</span>
            </button>

            <button type="button" className={primaryBtn} onClick={handleUsersReset}>
              <FontAwesomeIcon icon={faUndo} />
              <span className="sm:inline ml-1">Reset</span>
            </button>
          </>
        );

      case "roleUserMatch":
        return (
          <>
            <button type="button" className={primaryBtn} onClick={handleRolesView}>
              <FontAwesomeIcon icon={faEye} />
              <span className="sm:inline ml-1">View Role</span>
            </button>

            <button type="button" className={primaryBtn} onClick={handleRolesReset}>
              <FontAwesomeIcon icon={faUndo} />
              <span className="sm:inline ml-1">Reset</span>
            </button>

            <button type="button" className={primaryBtn} onClick={handleRolesApply}>
              <FontAwesomeIcon icon={faCheck} />
              <span className="sm:inline ml-1">Apply</span>
            </button>
          </>
        );

      case "roleAccess":
        return (
          <>
            <button
              type="button"
              className={primaryBtn}
              onClick={handleRoleAccessView}
            >
              <FontAwesomeIcon icon={faEye} />
              <span className="sm:inline ml-1">View Modules</span>
            </button>

            <button
              type="button"
              className={primaryBtn}
              onClick={handleRoleAccessReset}
            >
              <FontAwesomeIcon icon={faUndo} />
              <span className="sm:inline ml-1">Reset</span>
            </button>

            <button
              type="button"
              className={primaryBtn}
              onClick={handleRoleAccessSave}
            >
              <FontAwesomeIcon icon={faSave} />
              <span className="sm:inline ml-1">Save Access</span>
            </button>
          </>
        );

      default:
        return null;
    }
  };

  const renderMobileActionButtons = () => {
    switch (activeTab) {
      case "userRoles":
        return (
          <>
            <button
              type="button"
              className={mobileIconBtn}
              onClick={() => setPendingAction("add")}
              title="Add"
            >
              <FontAwesomeIcon icon={faPlus} />
            </button>

            <button
              type="button"
              className={mobileIconBtn}
              onClick={handleUsersSave}
              title="Save"
            >
              <FontAwesomeIcon icon={faSave} />
            </button>

            <button
              type="button"
              className={mobileIconBtn}
              onClick={handleUsersReset}
              title="Reset"
            >
              <FontAwesomeIcon icon={faUndo} />
            </button>
          </>
        );

      case "roleUserMatch":
        return (
          <>
            <button
              type="button"
              className={mobileIconBtn}
              onClick={handleRolesView}
              title="View Role"
            >
              <FontAwesomeIcon icon={faEye} />
            </button>

            <button
              type="button"
              className={mobileIconBtn}
              onClick={handleRolesReset}
              title="Reset"
            >
              <FontAwesomeIcon icon={faUndo} />
            </button>

            <button
              type="button"
              className={mobileIconBtn}
              onClick={handleRolesApply}
              title="Apply"
            >
              <FontAwesomeIcon icon={faCheck} />
            </button>
          </>
        );

      case "roleAccess":
        return (
          <>
            <button
              type="button"
              className={mobileIconBtn}
              onClick={handleRoleAccessView}
              title="View Modules"
            >
              <FontAwesomeIcon icon={faEye} />
            </button>

            <button
              type="button"
              className={mobileIconBtn}
              onClick={handleRoleAccessReset}
              title="Reset"
            >
              <FontAwesomeIcon icon={faUndo} />
            </button>

            <button
              type="button"
              className={mobileIconBtn}
              onClick={handleRoleAccessSave}
              title="Save Access"
            >
              <FontAwesomeIcon icon={faSave} />
            </button>
          </>
        );

      default:
        return null;
    }
  };

  const renderTabContent = () => {
    if (activeTab === "userRoles") {
      return (
        <UsersTab
          ref={usersTabRef}
          roles={roles}
          fetchRoles={fetchRoles}
          user={user}
          saving={saving}
          setSaving={setSaving}
          tableSize={tableSize}
        />
      );
    }

    if (activeTab === "roleUserMatch") {
      return (
        <RolesTab
          ref={rolesTabRef}
          users={users}
          roles={roles}
          appliedUserRoles={appliedUserRoles}
          setAppliedUserRoles={setAppliedUserRoles}
          fetchUserRoles={fetchUserRoles}
          tableSize={tableSize}
        />
      );
    }

    if (activeTab === "roleAccess") {
      return (
        <RoleAccessTab
          ref={roleAccessTabRef}
          roles={roles}
          tableSize={tableSize}
        />
      );
    }

    if (activeTab === "userAccess") {
      return <UserRoleTab ref={userAccessTabRef} users={users} />;
    }

    return null;
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="global-ref-main-div-ui">
      {(loading || saving || showSpinner) && <LoadingSpinner />}

      {/* ── Mobile layout ── */}
      <div className="md:hidden pt-[30px]">
        <AnimatePresence mode="wait" initial={false}>
          {showMobileMenu ? (
            <motion.div
              key="mobile-menu"
              initial={{ opacity: 0, x: -18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 18 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="bg-white"
            >
              <div className="bg-blue-50 border-b border-blue-100">
                <div className="px-4 py-4">
                  <h2 className="font-bold text-base text-blue-800 uppercase tracking-tight">
                    {documentTitle}
                  </h2>
                </div>
              </div>

              <div className="bg-white">
                {tabs.map((tab) => (
                  <button
                    type="button"
                    key={tab.id}
                    onClick={() => openMobileTab(tab.id)}
                    className="w-full flex items-center gap-3 px-5 py-6 text-left text-sm border-b border-gray-200 bg-white hover:bg-blue-50 transition-colors"
                  >
                    <span className="text-blue-600 w-5 flex justify-center">
                      <FontAwesomeIcon icon={tab.icon} />
                    </span>
                    <span className="font-medium text-gray-900">{tab.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={`mobile-content-${activeTab}`}
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -18 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="min-h-screen bg-white"
            >
              <div className="sticky top-0 z-30 bg-blue-50 border-b">
                <div className="flex items-center justify-between px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setShowMobileMenu(true)}
                    className="text-blue-600 text-sm font-medium flex items-center gap-2"
                  >
                    <FontAwesomeIcon icon={faArrowLeft} />
                    Back
                  </button>

                  <div className="text-sm font-bold text-blue-800 text-center">
                    {tabs.find((t) => t.id === activeTab)?.label || documentTitle}
                  </div>

                  <div className="w-[48px]" />
                </div>

                <div className="px-3 pb-3">
                  <div className="flex flex-wrap gap-2 justify-center">
                    {renderMobileActionButtons()}

                    <div ref={exportRef} className="relative">
                      <button
                        type="button"
                        onClick={() => setOpenExport((v) => !v)}
                        className={mobileIconBtn}
                        title="Export"
                      >
                        <FontAwesomeIcon icon={faPrint} />
                      </button>

                      {isOpenExport && (
                        <div className="absolute right-0 mt-2 w-40 rounded-lg shadow-lg bg-white ring-1 ring-black/10 z-[60] overflow-hidden">
                          <button
                            type="button"
                            onClick={() => {
                              handleExport("excel");
                              setOpenExport(false);
                            }}
                            className="block w-full text-left px-4 py-2 text-xs hover:bg-blue-50"
                          >
                            <FontAwesomeIcon
                              icon={faFileExcel}
                              className="mr-2 text-green-600"
                            />
                            Excel
                          </button>
                        </div>
                      )}
                    </div>

                    <div ref={guideRef} className="relative">
                      <button
                        type="button"
                        onClick={() => setOpenGuide((v) => !v)}
                        className={mobileIconBtn}
                        title="Help"
                      >
                        <FontAwesomeIcon icon={faInfoCircle} />
                      </button>

                      {isOpenGuide && (
                        <div className="absolute right-0 mt-2 w-40 rounded-md shadow-lg bg-white ring-1 ring-black/10 z-[60] overflow-hidden">
                          <button
                            type="button"
                            onClick={() => {
                              handlePDFGuide();
                              setOpenGuide(false);
                            }}
                            className="block w-full text-left px-4 py-2 text-xs hover:bg-blue-50"
                          >
                            <FontAwesomeIcon
                              icon={faFilePdf}
                              className="mr-2 text-red-600"
                            />
                            User Guide
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              handleVideoGuide();
                              setOpenGuide(false);
                            }}
                            className="block w-full text-left px-4 py-2 text-xs hover:bg-blue-50"
                          >
                            <FontAwesomeIcon
                              icon={faVideo}
                              className="mr-2 text-blue-600"
                            />
                            Video Guide
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: "easeOut", delay: 0.03 }}
                className="p-3 pb-24"
              >
                {renderTabContent()}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Desktop layout ── */}
      <div className="hidden md:block">
        <div className="global-ref-header-ui !py-2">
          <div className="w-full flex flex-col gap-1 md:grid md:grid-cols-3 md:items-center md:gap-0">
            <div className="w-full md:w-auto md:justify-start flex">
              <h1 className="global-ref-headertext-ui w-full md:w-auto truncate text-center md:text-left text-[18px] leading-tight">
                {documentTitle}
              </h1>
            </div>

            <div className="w-full md:justify-center flex mtm-2">
              <div className="w-full md:w-auto">
                <div className="flex flex-nowrap overflow-x-auto no-scrollbar border-b border-blue-300 dark:border-gray-700">
                  {tabs.map((tab) => (
                    <button
                      type="button"
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`shrink-0 whitespace-nowrap px-3 py-1 sm:py-1.5 sm:px-4 text-[10px] sm:text-[12px] font-bold transition-all border-b-2 rounded-md ${activeTab === tab.id
                          ? "border-blue-700 text-blue-700 bg-blue-50/50"
                          : "border-transparent text-gray-500 hover:text-blue-500"
                        }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="w-full md:w-auto flex md:justify-end">
              <div className="w-full md:w-auto flex items-center justify-center md:justify-end gap-2 flex-wrap">
                <div className="flex flex-wrap justify-center md:justify-end gap-2">
                  {renderActionButtons()}
                </div>

                <div ref={exportRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenExport((v) => !v)}
                    className={primaryBtn}
                  >
                    <FontAwesomeIcon icon={faPrint} />
                    <span className="sm:inline ml-1">Export</span>
                    <FontAwesomeIcon
                      icon={faChevronDown}
                      className="text-[10px] ml-1"
                    />
                  </button>

                  {isOpenExport && (
                    <div className="absolute right-0 mt-2 w-40 rounded-lg shadow-lg bg-white ring-1 ring-black/10 z-[60] overflow-hidden">
                      <button
                        type="button"
                        onClick={() => {
                          handleExport("excel");
                          setOpenExport(false);
                        }}
                        className="block w-full text-left px-4 py-2 text-xs hover:bg-blue-50"
                      >
                        <FontAwesomeIcon
                          icon={faFileExcel}
                          className="mr-2 text-green-600"
                        />
                        Excel
                      </button>
                    </div>
                  )}
                </div>

                <div ref={guideRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenGuide((v) => !v)}
                    className={primaryBtn}
                  >
                    <FontAwesomeIcon icon={faInfoCircle} />
                    <span className="sm:inline ml-1">Info</span>
                    <FontAwesomeIcon
                      icon={faChevronDown}
                      className="text-[10px] ml-1"
                    />
                  </button>

                  {isOpenGuide && (
                    <div className="absolute right-0 mt-2 w-40 rounded-md shadow-lg bg-white ring-1 ring-black/10 z-[60] overflow-hidden">
                      <button
                        type="button"
                        onClick={() => {
                          handlePDFGuide();
                          setOpenGuide(false);
                        }}
                        className="block w-full text-left px-4 py-2 text-xs hover:bg-blue-50"
                      >
                        <FontAwesomeIcon
                          icon={faFilePdf}
                          className="mr-2 text-red-600"
                        />
                        User Guide
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          handleVideoGuide();
                          setOpenGuide(false);
                        }}
                        className="block w-full text-left px-4 py-2 text-xs hover:bg-blue-50"
                      >
                        <FontAwesomeIcon
                          icon={faVideo}
                          className="mr-2 text-blue-600"
                        />
                        Video Guide
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10, scale: 0.995 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.995 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="global-tran-tab-div-ui pt-2"
            >
              {renderTabContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default UserAccessRights;