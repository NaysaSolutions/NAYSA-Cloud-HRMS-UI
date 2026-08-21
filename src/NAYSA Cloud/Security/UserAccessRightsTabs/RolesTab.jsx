import React, {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useMemo,
  useCallback,
} from "react";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSpinner,
  faUserShield,
  faArrowLeft,
  faUsers,
  faCheckSquare,
  faSquare,
} from "@fortawesome/free-solid-svg-icons";

import {
  useSwalSuccessAlert,
  useSwalErrorAlert,
} from "@/NAYSA Cloud/Global/behavior.jsx";

import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable.jsx";

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

const RolesTab = forwardRef(
  (
    {
      users = [],
      roles = [],
      appliedUserRoles,
      setAppliedUserRoles,
      fetchUserRoles,
      tableSize = "Half",
    },
    ref
  ) => {
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [selectedRoles, setSelectedRoles] = useState([]);
    const [viewingRoles, setViewingRoles] = useState(false);
    const [usersLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [mobileStep, setMobileStep] = useState("users");

    /* ================= FILTER ACTIVE ROLES ================= */
    // This ensures only active roles appear in this specific tab
    const activeRoles = useMemo(() => {
      return (Array.isArray(roles) ? roles : []).filter((r) => r.active === "Y");
    }, [roles]);

    const appliedRolesSet = useMemo(() => {
      if (appliedUserRoles instanceof Set) return appliedUserRoles;
      return new Set();
    }, [appliedUserRoles]);

    const regularUsers = useMemo(() => {
      return (Array.isArray(users) ? users : []).filter(isRegularUser);
    }, [users]);

    useEffect(() => {
      setSelectedUsers((prev) =>
        prev.filter((code) =>
          regularUsers.some((u) => String(u.userCode || "") === String(code || ""))
        )
      );
    }, [regularUsers]);

    const selectedUserDetails = useMemo(() => {
      return regularUsers.filter((u) => selectedUsers.includes(u.userCode));
    }, [regularUsers, selectedUsers]);

    const roleTableData = useMemo(() => {
      return activeRoles; // Changed from roles
    }, [activeRoles]);

    const userTableData = useMemo(() => {
      return regularUsers;
    }, [regularUsers]);

    const allUserCodes = useMemo(
      () =>
        regularUsers
          .map((u) => u.userCode)
          .filter(Boolean),
      [regularUsers]
    );

    const allRoleCodes = useMemo(
      () =>
        activeRoles // Changed from roles
          .map((r) => r.roleCode)
          .filter(Boolean),
      [activeRoles]
    );

    const allUsersSelected =
      allUserCodes.length > 0 && selectedUsers.length === allUserCodes.length;

    const allRolesSelected =
      allRoleCodes.length > 0 && selectedRoles.length === allRoleCodes.length;

    const resetState = useCallback(() => {
      setSelectedUsers([]);
      setSelectedRoles([]);
      setViewingRoles(false);
      setMobileStep("users");
    }, []);

    const toggleUser = useCallback(
      (userCode) => {
        if (viewingRoles) return;

        setSelectedUsers((prev) =>
          prev.includes(userCode)
            ? prev.filter((id) => id !== userCode)
            : [...prev, userCode]
        );
      },
      [viewingRoles]
    );

    const toggleRole = useCallback((roleCode) => {
      setSelectedRoles((prev) =>
        prev.includes(roleCode)
          ? prev.filter((id) => id !== roleCode)
          : [...prev, roleCode]
      );
    }, []);

    const toggleSelectAllUsers = useCallback(() => {
      if (viewingRoles) return;

      setSelectedUsers((prev) =>
        prev.length === allUserCodes.length ? [] : [...allUserCodes]
      );
    }, [viewingRoles, allUserCodes]);

    const toggleSelectAllRoles = useCallback(() => {
      setSelectedRoles((prev) =>
        prev.length === allRoleCodes.length ? [] : [...allRoleCodes]
      );
    }, [allRoleCodes]);

    const handleViewRole = useCallback(async () => {
      if (selectedUsers.length === 0) {
        await useSwalErrorAlert(
          "No Users Selected",
          "Please select at least one user before viewing roles."
        );
        return;
      }

      const preSelectedRoles = new Set();

      selectedUsers.forEach((userCode) => {
        activeRoles.forEach((role) => { // Changed from roles
          if (appliedRolesSet.has(`${userCode}-${role.roleCode}`)) {
            preSelectedRoles.add(role.roleCode);
          }
        });
      });

      setSelectedRoles(Array.from(preSelectedRoles));
      setViewingRoles(true);
      setMobileStep("roles");
    }, [selectedUsers, activeRoles, appliedRolesSet]);

    const handleResetUserRoleMatching = useCallback(() => {
      resetState();
    }, [resetState]);

    const handleApplyRoles = useCallback(async () => {
      if (saving) return;

      if (selectedUsers.length === 0) {
        await useSwalErrorAlert(
          "No Users Selected",
          "Please select at least one user before applying roles."
        );
        return;
      }

      setSaving(true);

      try {
        const rolesToApply = [...selectedRoles];
        const rolesToRemove = [];

        selectedUsers.forEach((userCode) => {
          // Loop through ALL roles (the full list) to identify assignments 
          // that must be removed because they are either unselected OR now inactive.
          roles.forEach((role) => {
            const combo = `${userCode}-${role.roleCode}`;

            if (appliedRolesSet.has(combo)) {
              // Remove if it's not in the new selection OR if the role itself is no longer active
              if (!rolesToApply.includes(role.roleCode) || role.active !== "Y") {
                rolesToRemove.push({
                  userCode,
                  roleCode: role.roleCode,
                });
              }
            }
          });
        });

        // 1. Save new role assignments
        if (rolesToApply.length > 0) {
          const payload = {
            dt1: rolesToApply.map((code) => ({
              roleCode: code || "",
            })),
            dt2: selectedUsers.map((code) => ({
              userCode: code || "",
            })),
          };

          const { data: res } = await apiClient.post("/UpsertUserRole", {
            json_data: payload,
          });

          if (!res?.success) {
            await useSwalErrorAlert(
              "Error!",
              res?.message || "Something went wrong while applying roles."
            );
            return;
          }
        }

        // 2. Delete assignments for unselected or inactive roles
        for (const item of rolesToRemove) {
          const payload = {
            dt1: [{ roleCode: item.roleCode }],
            dt2: [{ userCode: item.userCode }],
          };

          const { data: delRes } = await apiClient.post("/deleteUserRole", {
            json_data: payload,
          });

          if (!delRes?.success) {
            await useSwalErrorAlert(
              "Error!",
              delRes?.message || "Something went wrong while removing roles."
            );
            return;
          }
        }

        // 3. Update local state to reflect only active, selected roles
        const newAppliedCombinations = new Set(appliedRolesSet);

        selectedUsers.forEach((userCode) => {
          roles.forEach((role) => {
            const combo = `${userCode}-${role.roleCode}`;
            if (rolesToApply.includes(role.roleCode) && role.active === "Y") {
              newAppliedCombinations.add(combo);
            } else {
              newAppliedCombinations.delete(combo);
            }
          });
        });

        setAppliedUserRoles(newAppliedCombinations);
        await fetchUserRoles?.(selectedUsers);

        await useSwalSuccessAlert(
          "Success!",
          "Users-Role updated successfully!"
        );
      } catch (e) {
        console.error("handleApplyRoles error:", e);
        await useSwalErrorAlert(
          "Error!",
          e?.response?.data?.message || "Error saving role assignment."
        );
      } finally {
        setSaving(false);
      }
    }, [
      saving,
      selectedUsers,
      selectedRoles,
      roles, // Full list is required here for the cleanup logic
      appliedRolesSet,
      setAppliedUserRoles,
      fetchUserRoles,
    ]);

    useImperativeHandle(ref, () => ({
      viewRole: handleViewRole,
      apply: handleApplyRoles,
      reset: handleResetUserRoleMatching,
      getExportData: () => {
        const rows = [];

        regularUsers.forEach((u) => {
          activeRoles.forEach((r) => { // Changed from roles
            if (appliedRolesSet.has(`${u.userCode}-${r.roleCode}`)) {
              rows.push({
                userCode: u.userCode || "",
                userName: u.userName || "",
                roleCode: r.roleCode || "",
                roleName: r.roleName || "",
                status: "Applied",
              });
            }
          });
        });

        return {
          fileName: "User Role Matching",
          rows,
          columns: [
            { key: "userCode", label: "User Code" },
            { key: "userName", label: "Username" },
            { key: "roleCode", label: "Role Code" },
            { key: "roleName", label: "Role Name" },
            { key: "status", label: "Active?" },
          ],
        };
      },
    }));

    const userColumns = useMemo(
      () => [
        {
          key: "__select",
          label: "Select",
          sortable: false,
          filterable: false,
          width: 90,
          render: (row) => (
            <div className="flex justify-end md:justify-center py-1">
              <input
                type="checkbox"
                className="h-6 w-6 md:h-4 md:w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                checked={selectedUsers.includes(row.userCode)}
                onClick={(e) => e.stopPropagation()}
                onChange={() => toggleUser(row.userCode)}
                disabled={viewingRoles}
              />
            </div>
          ),
        },
        {
          key: "userCode",
          label: "User Code",
          sortable: true,
          width: 150,
        },
        {
          key: "userName",
          label: "Username",
          sortable: true,
          width: 260,
        },
      ],
      [selectedUsers, toggleUser, viewingRoles]
    );

    const roleColumns = useMemo(
      () => [
        {
          key: "__select",
          label: "Select",
          sortable: false,
          filterable: false,
          width: 90,
          render: (row) => (
            <div className="flex justify-end md:justify-center py-1">
              <input
                type="checkbox"
                className="h-6 w-6 md:h-4 md:w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                checked={selectedRoles.includes(row.roleCode)}
                onClick={(e) => e.stopPropagation()}
                onChange={() => toggleRole(row.roleCode)}
              />
            </div>
          ),
        },
        {
          key: "roleCode",
          label: "Role Code",
          sortable: true,
          width: 160,
        },
        {
          key: "roleName",
          label: "Role Description",
          sortable: true,
          width: 260,
        },
      ],
      [selectedRoles, toggleRole]
    );

    return (
      <div className="w-full md:pt-10">
        <div className="flex flex-col md:flex-row gap-4">
          {/* USERS PANEL */}
          <div
            className={`w-full md:w-1/2 ${mobileStep === "users" ? "block" : "hidden md:block"
              }`}
          >
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 h-full flex flex-col">
              <div className="flex items-center justify-between mb-2 gap-3">
                <h2 className="text-lg font-semibold text-gray-700">Users</h2>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleSelectAllUsers}
                    disabled={viewingRoles || allUserCodes.length === 0}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FontAwesomeIcon icon={allUsersSelected ? faSquare : faCheckSquare} />
                    {allUsersSelected ? "Unselect All" : "Select All"}
                  </button>

                  {viewingRoles && (
                    <button
                      type="button"
                      onClick={() => setMobileStep("roles")}
                      className="md:hidden inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-sm font-medium"
                    >
                      <FontAwesomeIcon icon={faArrowLeft} className="rotate-180" />
                      Roles
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 min-h-0">
                <SearchGlobalReferenceTable
                  docType="UserAccRight"
                  columns={userColumns}
                  data={userTableData}
                  isLoading={usersLoading}
                  itemsPerPage={50}
                  showFilters={true}
                  onRowDoubleClick={(row) => toggleUser(row.userCode)}
                  onRowClick={(row) => toggleUser(row.userCode)}
                  mobileSelectable={true}
                  selectedRowChecker={(row) =>
                    selectedUsers.includes(row.userCode)
                  }
                  tableSize={tableSize}
                  className="h-full"
                />
              </div>
            </div>
          </div>

          {/* ROLES PANEL */}
          <div
            className={`w-full md:w-1/2 ${mobileStep === "roles" ? "block" : "hidden md:block"
              }`}
          >
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 h-full flex flex-col">
              <div className="flex items-center justify-between mb-2 gap-3">
                <h2 className="text-lg font-semibold text-gray-700">Roles</h2>

                <div className="flex items-center gap-2">
                  {viewingRoles && (
                    <button
                      type="button"
                      onClick={toggleSelectAllRoles}
                      disabled={allRoleCodes.length === 0}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FontAwesomeIcon icon={allRolesSelected ? faSquare : faCheckSquare} />
                      {allRolesSelected ? "Unselect All" : "Select All"}
                    </button>
                  )}

                  {viewingRoles && (
                    <button
                      type="button"
                      onClick={() => setMobileStep("users")}
                      className="md:hidden inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-700 text-sm font-medium"
                    >
                      <FontAwesomeIcon icon={faArrowLeft} />
                      Back
                    </button>
                  )}
                </div>
              </div>

              {viewingRoles && (
                <div className="mb-3">
                  <div className="inline-flex max-w-full items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-1 py-1">
                    <FontAwesomeIcon icon={faUsers} className="text-blue-600" />
                    <div className="min-w-0">
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-blue-700">
                        Selected User{selectedUserDetails.length > 1 ? "s" : ""}
                      </div>

                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {selectedUserDetails.length === 0 ? (
                          <span className="text-xs text-gray-500">None selected</span>
                        ) : selectedUserDetails.length === 1 ? (
                          <span className="inline-flex items-center rounded-full border border-blue-200 bg-white px-2 py-0.5 text-xs font-medium text-blue-800">
                            {selectedUserDetails[0].userCode} -{" "}
                            {selectedUserDetails[0].userName}
                          </span>
                        ) : (
                          <>
                            <span className="inline-flex items-center rounded-full border border-blue-200 bg-white px-2 py-0.5 text-xs font-medium text-blue-800">
                              {selectedUserDetails.length} users selected
                            </span>

                            {selectedUserDetails.slice(0, 2).map((u) => (
                              <span
                                key={u.userCode}
                                className="inline-flex items-center rounded-full border border-blue-200 bg-white px-2 py-0.5 text-[11px] text-blue-700"
                              >
                                {u.userCode}
                              </span>
                            ))}

                            {selectedUserDetails.length > 2 && (
                              <span className="inline-flex items-center rounded-full border border-blue-200 bg-white px-2 py-0.5 text-[11px] text-blue-700">
                                +{selectedUserDetails.length - 2} more
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex-1 min-h-0">
                {viewingRoles ? (
                  <SearchGlobalReferenceTable
                    docType="UserAccRight"
                    columns={roleColumns}
                    data={roleTableData}
                    isLoading={false}
                    itemsPerPage={50}
                    showFilters={true}
                    onRowDoubleClick={(row) => toggleRole(row.roleCode)}
                    onRowClick={(row) => toggleRole(row.roleCode)}
                    mobileSelectable={true}
                    selectedRowChecker={(row) =>
                      selectedRoles.includes(row.roleCode)
                    }
                    tableSize={tableSize}
                    className="h-full"
                  />
                ) : (
                  <div className="h-full min-h-[320px] flex items-center justify-center text-center text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
                    <div>
                      <FontAwesomeIcon
                        icon={faUserShield}
                        className="text-xl mb-2 text-gray-400"
                      />
                      <h3 className="font-medium text-sm mb-1">
                        Role Selection Hidden
                      </h3>
                      <p className="text-xs px-4">
                        Please select user(s) from the users table and click
                        "View Role" to see and assign roles.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {selectedUsers.length > 0 && (
          <div className="mt-3 bg-blue-50 p-2 rounded text-xs">
            {viewingRoles
              ? `Assigning roles to ${selectedUsers.length} selected user(s). Please select roles and click Apply.`
              : `${selectedUsers.length} user(s) selected. Click "View Role" to continue.`}
          </div>
        )}

        {viewingRoles && selectedRoles.length > 0 && (
          <div className="mt-2 bg-green-50 p-2 rounded text-xs">
            {`${selectedRoles.length} role(s) selected to apply.`}
          </div>
        )}

        {saving && (
          <div className="mt-2 bg-amber-50 text-amber-700 p-2 rounded text-xs flex items-center gap-2">
            <FontAwesomeIcon icon={faSpinner} spin />
            Saving role assignments...
          </div>
        )}
      </div>
    );
  }
);

export default RolesTab;