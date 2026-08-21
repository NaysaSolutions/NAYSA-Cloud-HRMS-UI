// RoleAccessTab.jsx — Simplified role-based access (permission_type stored in rolemenu_ref)
import React, {
  useState,
  useRef,
  forwardRef,
  useImperativeHandle,
  useMemo,
  useCallback,
} from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faList,
  faArrowLeft,
  faShieldAlt,
  faSquare,
  faCheckSquare,
  faLockOpen,
  faEye,
} from "@fortawesome/free-solid-svg-icons";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";

import {
  useSwalSuccessAlert,
  useSwalErrorAlert,
} from "@/NAYSA Cloud/Global/behavior.jsx";

import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

// ─── Permission defaults ──────────────────────────────────────────────────────
const DEFAULT_PERMISSIONS = {
  access: false,
  fullAccess: false,
  readOnly: false,
};

const truthy = (value) =>
  value === true ||
  value === 1 ||
  value === "1" ||
  String(value || "").toUpperCase() === "Y" ||
  String(value || "").toLowerCase() === "true";

const normalizeRows = (data) => {
  try {
    if (Array.isArray(data?.data) && data.data[0]?.result) {
      const parsed =
        typeof data.data[0].result === "string"
          ? JSON.parse(data.data[0].result)
          : data.data[0].result;
      return Array.isArray(parsed) ? parsed : [];
    }
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.result)) return data.result;
    if (typeof data?.result === "string") {
      const parsed = JSON.parse(data.result);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (error) {
    console.error("normalizeRows failed:", error);
    return [];
  }
  console.warn("normalizeRows: unrecognized shape", data);
  return [];
};

const getMenuCode = (row) =>
  row?.menuCode ?? row?.MENU_CODE ?? row?.menu_code ?? row?.code ?? "";

const getMenuName = (row) =>
  row?.menuName ?? row?.MENU_NAME ?? row?.menu_name ?? row?.name ?? "";

const getModuleName = (row) =>
  row?.moduleName ?? row?.MODULE_NAME ?? row?.module ?? row?.MODULE ?? "";

const getSubMenu = (row) =>
  row?.subMenu ?? row?.SUB_MENU ?? row?.sub_menu ?? row?.submenu ?? "";

// Build permission from rolemenu_ref.permission_type and selectedMenu flag
const buildInitialPermission = (row) => {
  const selected = truthy(row?.selectedMenu);
  if (!selected) return { ...DEFAULT_PERMISSIONS };

  const permType = String(
    row?.permissionType ?? row?.PERMISSION_TYPE ?? row?.permission_type ?? "FULL"
  ).toUpperCase();

  if (permType === "READ") {
    return { access: true, fullAccess: false, readOnly: true };
  }
  // Default to FULL
  return { access: true, fullAccess: true, readOnly: false };
};

const permissionLabel = (permission) => {
  if (!permission?.access) return "No Access";
  if (permission?.fullAccess) return "Full Access";
  if (permission?.readOnly) return "Read Only";
  return "No Access";
};

// ─── AccessToggleButton — cycles: No Access → Read Only → Full Access ─────────
const AccessToggleButton = ({ permission, onCycle }) => {
  const state = !permission?.access
    ? "none"
    : permission?.fullAccess
    ? "full"
    : "read";

  const styles = {
    none: "border-gray-200 bg-gray-100 text-gray-400 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-600",
    read: "border-amber-300 bg-amber-50 text-amber-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700",
    full: "border-blue-300 bg-blue-50 text-blue-700 hover:border-gray-200 hover:bg-gray-100 hover:text-gray-400",
  };

  const labels = {
    none: "No Access",
    read: "Read Only",
    full: "Full Access",
  };

  return (
    <div className="flex justify-center py-0.5">
      <button
        type="button"
        title={`Click to cycle: No Access → Read Only → Full Access (current: ${labels[state]})`}
        onClick={(event) => {
          event.stopPropagation();
          onCycle(state);
        }}
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all min-w-[86px] justify-center ${styles[state]}`}
      >
        {state === "full" && <FontAwesomeIcon icon={faLockOpen} className="text-[10px]" />}
        {state === "read" && <FontAwesomeIcon icon={faEye} className="text-[10px]" />}
        {labels[state]}
      </button>
    </div>
  );
};

// ─── RoleAccessTab ────────────────────────────────────────────────────────────
const RoleAccessTab = forwardRef(({ roles = [], tableSize = "Half" }, ref) => {
  const { user } = useAuth();

  const currentUserCode = useMemo(
    () => user?.userCode || user?.USER_CODE || "",
    [user]
  );

  const [selectedRoles, setSelectedRoles] = useState([]);
  const [menus, setMenus] = useState([]);
  const [permissionMap, setPermissionMap] = useState({});
  const [showMenus, setShowMenus] = useState(false);
  const [loadingMenus, setLoadingMenus] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mobileStep, setMobileStep] = useState("roles");
  const [tableFilter, setTableFilter] = useState(null); // null | "FULL" | "READ"

  // ─── Derived data ──────────────────────────────────────────────────────────
  const activeRoles = useMemo(
    () => (Array.isArray(roles) ? roles : []).filter((role) => role.active === "Y"),
    [roles]
  );

  const selectedRoleDetails = useMemo(
    () => activeRoles.filter((role) => selectedRoles.includes(role.roleCode)),
    [activeRoles, selectedRoles]
  );

  const normalizedMenus = useMemo(
    () =>
      (Array.isArray(menus) ? menus : []).map((row, index) => ({
        ...row,
        __idx: index,
        menuCode: getMenuCode(row),
        menuName: getMenuName(row),
        moduleName: getModuleName(row),
        subMenu: getSubMenu(row),
      })),
    [menus]
  );

  const selectedMenuCount = useMemo(
    () => Object.values(permissionMap).filter((p) => p?.access).length,
    [permissionMap]
  );

  const fullAccessCount = useMemo(
    () => Object.values(permissionMap).filter((p) => p?.fullAccess).length,
    [permissionMap]
  );

  const readOnlyCount = useMemo(
    () => Object.values(permissionMap).filter((p) => p?.readOnly).length,
    [permissionMap]
  );

  const fullAccessMenus = useMemo(
    () => normalizedMenus.filter((m) => permissionMap[m.menuCode]?.fullAccess),
    [normalizedMenus, permissionMap]
  );

  const readOnlyMenus = useMemo(
    () => normalizedMenus.filter((m) => permissionMap[m.menuCode]?.readOnly),
    [normalizedMenus, permissionMap]
  );

  const filteredMenus = useMemo(() => {
    if (tableFilter === "FULL") return fullAccessMenus;
    if (tableFilter === "READ") return readOnlyMenus;
    return normalizedMenus;
  }, [tableFilter, normalizedMenus, fullAccessMenus, readOnlyMenus]);

  const allMenuCodes = useMemo(
    () => normalizedMenus.map((m) => m.menuCode).filter(Boolean),
    [normalizedMenus]
  );

  const allMenusSelected =
    allMenuCodes.length > 0 &&
    allMenuCodes.every((menuCode) => permissionMap[menuCode]?.access);

  const getPermission = useCallback(
    (menuCode) => permissionMap[menuCode] || DEFAULT_PERMISSIONS,
    [permissionMap]
  );

  // ─── Load role menus ───────────────────────────────────────────────────────
  const loadRoleMenus = useCallback(async (roleCode) => {
    setLoadingMenus(true);
    setShowMenus(false);
    setMenus([]);
    setPermissionMap({});
    setTableFilter(null);

    try {
      const rc = String(roleCode ?? "").trim();
      if (!rc) {
        await useSwalErrorAlert(
          "No Role Selected",
          "Please select one role to continue."
        );
        return;
      }

      const { data } = await apiClient.get("/getRoleMenu", {
        params: { ROLE_CODE: rc },
      });

      // getRoleMenu returns menu list with selectedMenu + permissionType per row
      const rawMenus = Array.isArray(data?.data?.menus)
        ? data.data.menus
        : normalizeRows(data);

      const normalized = rawMenus.map((row) => ({
        ...row,
        menuCode: getMenuCode(row),
        menuName: getMenuName(row),
        moduleName: getModuleName(row),
        subMenu: getSubMenu(row),
      }));

      const nextPermissionMap = {};
      normalized.forEach((row) => {
        if (row.menuCode) {
          nextPermissionMap[row.menuCode] = buildInitialPermission(row);
        }
      });

      setMenus(normalized);
      setPermissionMap(nextPermissionMap);
      setShowMenus(true);
      setMobileStep("menus");
    } catch (err) {
      console.error("getRoleMenu failed:", err);
      const detail =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Unable to load menus for the selected role.";
      await useSwalErrorAlert(
          "Error",
          detail
        );
    } finally {
      setLoadingMenus(false);
    }
  }, []);

  const handleViewMenus = useCallback(async () => {
    if (selectedRoles.length === 0) {
      await useSwalErrorAlert(
        "No Role Selected",
        "Please select one role to continue."
      );
      return;
    }
    if (selectedRoles.length > 1) {
      await useSwalErrorAlert(
        "Multiple Roles Selected",
        "Please select only one role when configuring access."
      );
      return;
    }
    await loadRoleMenus(selectedRoles[0]);
  }, [selectedRoles, loadRoleMenus]);

  // ─── Permission updates ────────────────────────────────────────────────────
  const applyPermissionPreset = useCallback((menuCode, preset) => {
    if (!menuCode) return;
    setPermissionMap((previous) => ({
      ...previous,
      [menuCode]:
        preset === "FULL"
          ? { access: true, fullAccess: true, readOnly: false }
          : preset === "READ"
          ? { access: true, fullAccess: false, readOnly: true }
          : { ...DEFAULT_PERMISSIONS },
    }));
  }, []);

  const toggleSelectAllMenus = useCallback(() => {
    setPermissionMap((previous) => {
      const next = { ...previous };
      if (allMenusSelected) {
        allMenuCodes.forEach((menuCode) => { next[menuCode] = { ...DEFAULT_PERMISSIONS }; });
      } else {
        allMenuCodes.forEach((menuCode) => {
          next[menuCode] = { access: true, fullAccess: true, readOnly: false };
        });
      }
      return next;
    });
  }, [allMenuCodes, allMenusSelected]);

  const applyBulkPreset = useCallback((preset) => {
    setPermissionMap((previous) => {
      const next = { ...previous };
      allMenuCodes.forEach((menuCode) => {
        next[menuCode] =
          preset === "FULL"
            ? { access: true, fullAccess: true, readOnly: false }
            : { access: true, fullAccess: false, readOnly: true };
      });
      return next;
    });
  }, [allMenuCodes]);

  // ─── Save ──────────────────────────────────────────────────────────────────
  const handleSaveAccess = useCallback(async () => {
    if (selectedRoles.length !== 1) {
      await useSwalErrorAlert(
        "Select Exactly One Role",
        "Pick a single role, then click Save Access."
      );
      return;
    }
    if (!showMenus) {
      await useSwalErrorAlert(
        "Nothing to Save",
        "Click View Modules first, then modify and save."
      );
      return;
    }

    const rc = String(selectedRoles[0] ?? "").trim();

    // dt1: all menus that have access, with their permission_type
    const dt1 = normalizedMenus
      .filter((menu) => permissionMap[menu.menuCode]?.access)
      .map((menu) => {
        const p = permissionMap[menu.menuCode] || DEFAULT_PERMISSIONS;
        return {
          menuCode: menu.menuCode,
          permissionType: p.fullAccess ? "FULL" : "READ",
        };
      });

    setSaving(true);
    try {
      const payload = {
        json_data: {
          roleCode: rc,
          dt1,
          userCode: currentUserCode,
        },
      };

      const { data: res } = await apiClient.post("/upsertRoleMenu", payload);

      const ok =
        res?.success === true ||
        res?.data?.status === "success" ||
        res?.message?.toLowerCase?.().includes("saved") ||
        res?.errorcount === 0;

      if (!ok) {
        throw new Error(res?.message || "Error executing Role Menu Upsert.");
      }

      await useSwalSuccessAlert(
        "Saved!",
        "Role access rights have been updated."
      );
      await loadRoleMenus(rc);
    } catch (err) {
      console.error("UpsertRoleMenu failed:", err);
      const detail =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Error executing Role Menu Upsert.";
      await useSwalErrorAlert(
        "Save Failed",
        detail
      );
    } finally {
      setSaving(false);
    }
  }, [selectedRoles, showMenus, normalizedMenus, permissionMap, currentUserCode, loadRoleMenus]);

  // ─── Reset ─────────────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    setSelectedRoles([]);
    setMenus([]);
    setPermissionMap({});
    setShowMenus(false);
    setMobileStep("roles");
    setTableFilter(null);
  }, []);

  // ─── Exposed ref methods ───────────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    viewModules: handleViewMenus,
    saveAccess: handleSaveAccess,
    reset: handleReset,
    getExportData: () => {
      const selectedRole = selectedRoleDetails?.[0] || null;
      const rows = normalizedMenus.map((menu) => {
        const permission = permissionMap[menu.menuCode] || DEFAULT_PERMISSIONS;
        return {
          roleCode: selectedRole?.roleCode || "",
          roleName: selectedRole?.roleName || "",
          moduleName: menu.moduleName || "",
          subMenu: menu.subMenu || "",
          menuCode: menu.menuCode || "",
          menuName: menu.menuName || "",
          permission: permissionLabel(permission),
        };
      });
      return {
        fileName: "Role Access Rights",
        rows,
        columns: [
          { key: "roleCode", label: "Role Code" },
          { key: "roleName", label: "Role Name" },
          { key: "moduleName", label: "Module" },
          { key: "subMenu", label: "Sub Menu" },
          { key: "menuCode", label: "Menu Code" },
          { key: "menuName", label: "Menu Name" },
          { key: "permission", label: "Permission" },
        ],
      };
    },
  }));

  // ─── Role table ────────────────────────────────────────────────────────────
  const toggleRole = useCallback((roleCode) => {
    setSelectedRoles((previous) =>
      previous.includes(roleCode)
        ? previous.filter((r) => r !== roleCode)
        : [...previous, roleCode]
    );
  }, []);

  const roleColumns = useMemo(
    () => [
      {
        key: "__select",
        label: "Select",
        sortable: false,
        filterable: false,
        width: 90,
        render: (row) => {
          const isSelected = selectedRoles.includes(row.roleCode);
          return (
            <div className="flex justify-center py-0.5">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => { e.stopPropagation(); toggleRole(row.roleCode); }}
                onClick={(e) => e.stopPropagation()}
                className="h-4 w-4 cursor-pointer accent-blue-600 rounded"
              />
            </div>
          );
        },
      },
      { key: "roleCode", label: "Role Code", sortable: true, width: 160 },
      { key: "roleName", label: "Role Name", sortable: true, width: 260 },
    ],
    [selectedRoles, toggleRole]
  );

  // ─── Menu table ────────────────────────────────────────────────────────────
  const menuColumns = useMemo(
    () => [
      {
        key: "__access",
        label: "Permission",
        sortable: false,
        filterable: false,
        width: 130,
        render: (row) => {
          const permission = getPermission(row.menuCode);
          const handleCycle = (currentState) => {
            if (currentState === "none") {
              applyPermissionPreset(row.menuCode, "READ");
            } else if (currentState === "read") {
              applyPermissionPreset(row.menuCode, "FULL");
            } else {
              applyPermissionPreset(row.menuCode, "NONE");
            }
          };
          return <AccessToggleButton permission={permission} onCycle={handleCycle} />;
        },
      },
      { key: "moduleName", label: "Module", sortable: true, width: 180 },
      { key: "subMenu",    label: "Sub Menu", sortable: true, width: 180 },
      { key: "menuCode",   label: "Menu Code", sortable: true, width: 120 },
      { key: "menuName",   label: "Menu Name", sortable: true, width: 300 },
    ],
    [getPermission, applyPermissionPreset]
  );

  const roleTableData = useMemo(
    () => activeRoles.map((row, index) => ({ ...row, __idx: index })),
    [activeRoles]
  );

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="w-full md:pt-10">
      {/* Mobile back button */}
      <div className="md:hidden mb-3">
        {mobileStep === "menus" && (
          <button
            type="button"
            onClick={() => setMobileStep("roles")}
            className="text-blue-600 text-sm font-medium flex items-center gap-2"
          >
            <FontAwesomeIcon icon={faArrowLeft} />
            Back to Roles
          </button>
        )}
      </div>

      <div className="flex flex-col md:flex-row md:items-stretch gap-4">
        {/* ── Roles panel ── */}
        <div
          className={`w-full md:w-[35%] ${
            mobileStep === "roles" ? "block" : "hidden md:block"
          }`}
        >
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 h-full flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Roles</h2>
                <p className="text-xs text-gray-500">
                  Select one role, then view and configure access.
                </p>
              </div>
              <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                {selectedRoles.length} selected
              </span>
            </div>

            <div className="flex-1 min-h-0">
              <SearchGlobalReferenceTable
                docType="UserAccRight"
                columns={roleColumns}
                data={roleTableData}
                isLoading={false}
                itemsPerPage={10}
                showFilters={true}
                onRowDoubleClick={(row) => toggleRole(row.roleCode)}
                onRowClick={(row) => toggleRole(row.roleCode)}
                mobileSelectable={true}
                selectedRowChecker={(row) => selectedRoles.includes(row.roleCode)}
                tableSize={tableSize}
                className="h-full"
              />
            </div>
          </div>
        </div>

        {/* ── Menus panel ── */}
        <div
          className={`w-full md:w-[65%] ${
            mobileStep === "menus" ? "block" : "hidden md:block"
          }`}
        >
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 h-full flex flex-col">
            <div className="flex flex-col gap-3 mb-3">
              <div className="flex flex-col gap-2">
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">
                    Role Access Matrix
                  </h2>
                  <p className="text-xs text-gray-500">
                    Toggle per-menu access. Everyone with access gets Full or Read Only — no granular per-user overrides.
                  </p>
                </div>

                {showMenus && (
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={toggleSelectAllMenus}
                      className="inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-[11px] font-medium hover:bg-blue-100 transition-colors"
                    >
                      <FontAwesomeIcon icon={allMenusSelected ? faSquare : faCheckSquare} className="shrink-0" />
                      <span className="truncate">{allMenusSelected ? "Unselect All" : "Select All"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => applyBulkPreset("FULL")}
                      className="inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border border-green-200 bg-green-50 text-green-700 text-[11px] font-medium hover:bg-green-100 transition-colors"
                    >
                      <FontAwesomeIcon icon={faLockOpen} className="shrink-0" />
                      <span className="truncate">All Full</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => applyBulkPreset("READ")}
                      className="inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 text-[11px] font-medium hover:bg-amber-100 transition-colors"
                    >
                      <FontAwesomeIcon icon={faEye} className="shrink-0" />
                      <span className="truncate">All Read</span>
                    </button>
                  </div>
                )}
              </div>

              {showMenus && (
                <>
                  {/* Summary stats */}
                  <div className="grid grid-cols-3 gap-2">
                    <div
                      onClick={() => setTableFilter(null)}
                      className={`rounded-xl border p-2 transition-all ${
                        tableFilter === null
                          ? "border-gray-400 bg-gray-100 ring-2 ring-gray-300"
                          : "border-gray-100 bg-gray-50 hover:border-gray-300 hover:bg-gray-100 cursor-pointer"
                      }`}
                    >
                      <p className="text-[9px] uppercase tracking-wide text-gray-500 font-semibold leading-tight">Total Menus</p>
                      <p className="text-base font-bold text-gray-800">{normalizedMenus.length}</p>
                    </div>
                    <div
                      onClick={() => setTableFilter(tableFilter === "FULL" ? null : "FULL")}
                      className={`rounded-xl border p-2 transition-all cursor-pointer ${
                        tableFilter === "FULL"
                          ? "border-blue-400 bg-blue-100 ring-2 ring-blue-300"
                          : "border-blue-100 bg-blue-50 hover:border-blue-300 hover:bg-blue-100"
                      }`}
                    >
                      <p className="text-[9px] uppercase tracking-wide text-blue-600 font-semibold leading-tight">Full Access</p>
                      <p className="text-base font-bold text-blue-700">{fullAccessCount}</p>
                    </div>
                    <div
                      onClick={() => setTableFilter(tableFilter === "READ" ? null : "READ")}
                      className={`rounded-xl border p-2 transition-all cursor-pointer ${
                        tableFilter === "READ"
                          ? "border-amber-400 bg-amber-100 ring-2 ring-amber-300"
                          : "border-amber-100 bg-amber-50 hover:border-amber-300 hover:bg-amber-100"
                      }`}
                    >
                      <p className="text-[9px] uppercase tracking-wide text-amber-600 font-semibold leading-tight">Read Only</p>
                      <p className="text-base font-bold text-amber-700">{readOnlyCount}</p>
                    </div>
                  </div>

                  {/* Selected role badge */}
                  <div className="inline-flex max-w-full items-center gap-2 rounded-md border border-blue-100 bg-blue-50 px-3 py-2">
                    <FontAwesomeIcon icon={faShieldAlt} className="text-blue-600 text-sm shrink-0" />
                    <div className="flex items-center gap-2 min-w-0 flex-wrap">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-blue-700 shrink-0">
                        Selected Role
                      </span>
                      {selectedRoleDetails.length === 0 ? (
                        <span className="text-xs text-gray-500">None</span>
                      ) : selectedRoleDetails.length === 1 ? (
                        <span className="inline-flex items-center rounded-full border border-blue-200 bg-white px-2 py-0.5 text-xs font-medium text-blue-800 max-w-[260px] truncate">
                          {selectedRoleDetails[0].roleCode} - {selectedRoleDetails[0].roleName}
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-blue-200 bg-white px-2 py-0.5 text-xs font-medium text-blue-800">
                          {selectedRoleDetails.length} roles
                        </span>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {showMenus ? (
              <div className="flex-1 min-h-0 flex flex-col gap-2">

                <div className="flex-1 min-h-0">
                  <SearchGlobalReferenceTable
                    docType="UserAccRight"
                    columns={menuColumns}
                    data={filteredMenus}
                    isLoading={loadingMenus}
                    itemsPerPage={50}
                    showFilters={true}
                    onRowDoubleClick={() => {}}
                    onRowClick={() => {}}
                    mobileSelectable={true}
                    selectedRowChecker={(row) => getPermission(row.menuCode).access}
                    tableSize={tableSize}
                    className="h-full"
                  />
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[320px] flex items-center justify-center text-center text-gray-500 bg-gray-50 rounded-xl border border-gray-200">
                <div>
                  <FontAwesomeIcon icon={faList} className="text-xl mb-2 text-gray-400" />
                  <h3 className="font-medium text-sm mb-1">Access Matrix Hidden</h3>
                  <p className="text-xs px-4">
                    Select exactly one role and click "View Modules" to see and configure access rights.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedRoles.length > 0 && (
        <div className="mt-3 bg-blue-50 p-2 rounded text-xs text-blue-800">
          {selectedRoles.length === 1
            ? `Selected role: ${selectedRoles[0]}`
            : `Selected roles: ${selectedRoles.join(", ")}`}
        </div>
      )}

      {showMenus && selectedMenuCount > 0 && (
        <div className="mt-2 bg-green-50 p-2 rounded text-xs text-green-800">
          {`${selectedMenuCount} menu(s) granted access.`}
        </div>
      )}

      {(saving || loadingMenus) && <LoadingSpinner />}
    </div>
  );
});

export default RoleAccessTab;