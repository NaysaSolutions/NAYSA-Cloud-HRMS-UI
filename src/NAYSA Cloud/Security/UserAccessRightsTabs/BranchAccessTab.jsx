import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBuilding,
  faCheckSquare,
  faSquare,
  faArrowLeft,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";

import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";

import {
  useSwalErrorAlert,
  useSwalSuccessAlert,
} from "@/NAYSA Cloud/Global/behavior.jsx";

import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable.jsx";

const getUserCode = (row = {}) =>
  row.userCode ?? row.USER_CODE ?? row.user_code ?? "";

const getUserName = (row = {}) =>
  row.userName ?? row.USER_NAME ?? row.user_name ?? "";

const getBranchCode = (row = {}) =>
  row.branchCode ?? row.BRANCH_CODE ?? row.branch_code ?? "";

const getBranchName = (row = {}) =>
  row.branchName ?? row.BRANCH_NAME ?? row.branch_name ?? "";

const normalizeRows = (data) => {
  try {
    const raw =
      data?.data?.[0]?.result ??
      data?.[0]?.result ??
      data?.result ??
      data?.data;

    if (Array.isArray(raw)) return raw;

    if (typeof raw === "string") {
      const parsed = JSON.parse(raw || "[]");
      return Array.isArray(parsed) ? parsed : [];
    }

    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("normalizeRows failed:", error);
    return [];
  }
};

const BranchAccessTab = forwardRef(
  ({ users = [], tableSize = "Half", setSaving }, ref) => {
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [branches, setBranches] = useState([]);
    const [selectedBranches, setSelectedBranches] = useState([]);
    const [viewingBranches, setViewingBranches] = useState(false);
    const [loadingBranches, setLoadingBranches] = useState(false);
    const [mobileStep, setMobileStep] = useState("users");

    const selectedUserDetails = useMemo(
      () =>
        users.filter((u) =>
          selectedUsers.includes(getUserCode(u))
        ),
      [users, selectedUsers]
    );

    const allUserCodes = useMemo(
      () => users.map(getUserCode).filter(Boolean),
      [users]
    );

    const allBranchCodes = useMemo(
      () => branches.map(getBranchCode).filter(Boolean),
      [branches]
    );

    const allUsersSelected =
      allUserCodes.length > 0 &&
      selectedUsers.length === allUserCodes.length;

    const allBranchesSelected =
      allBranchCodes.length > 0 &&
      selectedBranches.length === allBranchCodes.length;

    const toggleUser = useCallback(
      (userCode) => {
        if (viewingBranches) return;

        setSelectedUsers((previous) =>
          previous.includes(userCode)
            ? previous.filter((code) => code !== userCode)
            : [...previous, userCode]
        );
      },
      [viewingBranches]
    );

    const toggleSelectAllUsers = useCallback(() => {
      if (viewingBranches) return;

      setSelectedUsers((previous) =>
        previous.length === allUserCodes.length
          ? []
          : [...allUserCodes]
      );
    }, [viewingBranches, allUserCodes]);

    const toggleBranch = useCallback((branchCode) => {
      setSelectedBranches((previous) =>
        previous.includes(branchCode)
          ? previous.filter((code) => code !== branchCode)
          : [...previous, branchCode]
      );
    }, []);

    const toggleSelectAllBranches = useCallback(() => {
      setSelectedBranches((previous) =>
        previous.length === allBranchCodes.length
          ? []
          : [...allBranchCodes]
      );
    }, [allBranchCodes]);

    const loadBranchMaster = useCallback(async () => {
      const { data } = await apiClient.get("/branch", {
        timeout: 60000,
      });

      return normalizeRows(data).filter(
        (row) =>
          getBranchCode(row) &&
          String(row.active ?? row.ACTIVE ?? "Y")
            .trim()
            .toUpperCase() !== "N"
      );
    }, []);

   const loadExistingAccess = useCallback(async () => {
    if (selectedUsers.length === 0) return [];

    const { data } = await apiClient.get(
        "/getUserBranchAccess",
        {
            json_data: {
                dt2: selectedUsers.map((userCode) => ({
                    userCode,
                })),
            },
        },
        {
            timeout: 60000,
        }
    );

    return normalizeRows(data);
}, [selectedUsers]);

    const handleViewBranches = useCallback(async () => {
      if (selectedUsers.length === 0) {
        await useSwalErrorAlert(
          "No Users Selected",
          "Please select at least one user before viewing branch access."
        );
        return;
      }

      setLoadingBranches(true);

      try {
        const [branchRows, accessRows] = await Promise.all([
          loadBranchMaster(),
          loadExistingAccess(),
        ]);

        /*
          For multiple users, a branch is checked if ALL selected users
          currently have that branch.

          Example:
          User A = HO, CEB
          User B = HO, DVO

          Initially checked:
          HO only

          When saved, the final selected branch list will be applied
          equally to all selected users.
        */
        const accessByUser = new Map();

        selectedUsers.forEach((userCode) => {
          accessByUser.set(
            String(userCode).trim().toUpperCase(),
            new Set()
          );
        });

        accessRows.forEach((row) => {
          const userCode = String(
            row.userCode ??
              row.USER_CODE ??
              row.user_code ??
              ""
          )
            .trim()
            .toUpperCase();

          const branchCode = String(getBranchCode(row))
            .trim()
            .toUpperCase();

          if (accessByUser.has(userCode) && branchCode) {
            accessByUser.get(userCode).add(branchCode);
          }
        });

        const commonBranches = branchRows
          .map(getBranchCode)
          .filter(Boolean)
          .filter((branchCode) => {
            const normalizedBranch = String(branchCode)
              .trim()
              .toUpperCase();

            return selectedUsers.every((userCode) => {
              const normalizedUser = String(userCode)
                .trim()
                .toUpperCase();

              return accessByUser
                .get(normalizedUser)
                ?.has(normalizedBranch);
            });
          });

        setBranches(branchRows);
        setSelectedBranches(commonBranches);
        setViewingBranches(true);
        setMobileStep("branches");
      } catch (error) {
        console.error("Unable to load branch access:", error);

        await useSwalErrorAlert(
          "Error",
          error?.response?.data?.message ||
            "Unable to load branch access."
        );
      } finally {
        setLoadingBranches(false);
      }
    }, [
      selectedUsers,
      loadBranchMaster,
      loadExistingAccess,
    ]);

    const handleSave = useCallback(async () => {
      if (selectedUsers.length === 0) {
        await useSwalErrorAlert(
          "No Users Selected",
          "Please select at least one user first."
        );
        return;
      }

      if (!viewingBranches) {
        await useSwalErrorAlert(
          "Nothing to Save",
          'Click "View Branches" before saving branch access.'
        );
        return;
      }

      setSaving?.(true);

      try {
        const payload = {
          json_data: {
            dt1: selectedBranches.map((branchCode) => ({
              branchCode,
            })),

            dt2: selectedUsers.map((userCode) => ({
              userCode,
            })),
          },
        };

        const { data: response } = await apiClient.post(
          "/upsertUserBranchAccess",
          payload
        );

        const sqlRow =
          response?.data?.[0] ??
          response?.data ??
          response;

        const errorCount = Number(
          sqlRow?.errorcount ??
            sqlRow?.errorCount ??
            response?.errorcount ??
            0
        );

        if (errorCount > 0) {
          throw new Error(
            sqlRow?.errormsg ||
              sqlRow?.errorMsg ||
              "Unable to save branch access."
          );
        }

        await useSwalSuccessAlert(
          "Success!",
          `Branch access updated for ${selectedUsers.length} user(s).`
        );

        await handleViewBranches();
      } catch (error) {
        console.error("upsertUserBranchAccess failed:", error);

        await useSwalErrorAlert(
          "Error!",
          error?.response?.data?.message ||
            error?.message ||
            "Error saving branch access."
        );
      } finally {
        setSaving?.(false);
      }
    }, [
      selectedUsers,
      selectedBranches,
      viewingBranches,
      setSaving,
      handleViewBranches,
    ]);

    const handleReset = useCallback(() => {
      setSelectedUsers([]);
      setBranches([]);
      setSelectedBranches([]);
      setViewingBranches(false);
      setMobileStep("users");
    }, []);

    useImperativeHandle(ref, () => ({
      save: handleSave,
      reset: handleReset,
      viewBranches: handleViewBranches,
    }));

    const userColumns = useMemo(
      () => [
        {
          key: "__select",
          label: "Select",
          sortable: false,
          filterable: false,
          width: 90,
          render: (row) => {
            const userCode = getUserCode(row);

            return (
              <div className="flex justify-end md:justify-center py-1">
                <input
                  type="checkbox"
                  checked={selectedUsers.includes(userCode)}
                  onChange={() => toggleUser(userCode)}
                  onClick={(e) => e.stopPropagation()}
                  disabled={viewingBranches}
                  className="h-6 w-6 md:h-4 md:w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
              </div>
            );
          },
        },
        {
          key: "userCode",
          label: "User Code",
          sortable: true,
          width: 150,
          render: (row) => getUserCode(row),
        },
        {
          key: "userName",
          label: "Username",
          sortable: true,
          width: 260,
          render: (row) => getUserName(row),
        },
      ],
      [selectedUsers, toggleUser, viewingBranches]
    );

    const branchColumns = useMemo(
      () => [
        {
          key: "__select",
          label: "Select",
          sortable: false,
          filterable: false,
          width: 90,
          render: (row) => {
            const branchCode = getBranchCode(row);

            return (
              <div className="flex justify-end md:justify-center py-1">
                <input
                  type="checkbox"
                  checked={selectedBranches.includes(branchCode)}
                  onChange={() => toggleBranch(branchCode)}
                  onClick={(e) => e.stopPropagation()}
                  className="h-6 w-6 md:h-4 md:w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
              </div>
            );
          },
        },
        {
          key: "branchCode",
          label: "Branch Code",
          sortable: true,
          width: 150,
          render: (row) => getBranchCode(row),
        },
        {
          key: "branchName",
          label: "Branch Name",
          sortable: true,
          width: 300,
          render: (row) => getBranchName(row),
        },
        {
          key: "branchType",
          label: "Branch Type",
          sortable: true,
          width: 150,
        },
      ],
      [selectedBranches, toggleBranch]
    );

    return (
      <div className="w-full md:pt-10">
        <div className="flex flex-col md:flex-row gap-4">
          {/* USERS */}
          <div
            className={`w-full md:w-1/2 ${
              mobileStep === "users"
                ? "block"
                : "hidden md:block"
            }`}
          >
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 h-full flex flex-col">
              <div className="flex items-center justify-between mb-2 gap-3">
                <h2 className="text-lg font-semibold text-gray-700">
                  Users
                </h2>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleSelectAllUsers}
                    disabled={
                      viewingBranches ||
                      allUserCodes.length === 0
                    }
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FontAwesomeIcon
                      icon={
                        allUsersSelected
                          ? faSquare
                          : faCheckSquare
                      }
                    />

                    {allUsersSelected
                      ? "Unselect All"
                      : "Select All"}
                  </button>

                  {viewingBranches && (
                    <button
                      type="button"
                      onClick={() =>
                        setMobileStep("branches")
                      }
                      className="md:hidden inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-sm font-medium"
                    >
                      Branches

                      <FontAwesomeIcon
                        icon={faArrowLeft}
                        className="rotate-180"
                      />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 min-h-0">
                <SearchGlobalReferenceTable
                  docType="UserAccRight"
                  columns={userColumns}
                  data={users}
                  isLoading={false}
                  itemsPerPage={50}
                  showFilters={true}
                  onRowDoubleClick={(row) =>
                    toggleUser(getUserCode(row))
                  }
                  onRowClick={(row) =>
                    toggleUser(getUserCode(row))
                  }
                  mobileSelectable={true}
                  selectedRowChecker={(row) =>
                    selectedUsers.includes(
                      getUserCode(row)
                    )
                  }
                  tableSize={tableSize}
                  className="h-full"
                />
              </div>
            </div>
          </div>

          {/* BRANCHES */}
          <div
            className={`w-full md:w-1/2 ${
              mobileStep === "branches"
                ? "block"
                : "hidden md:block"
            }`}
          >
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 h-full flex flex-col">
              <div className="flex items-center justify-between mb-2 gap-3">
                <h2 className="text-lg font-semibold text-gray-700">
                  Branches
                </h2>

                <div className="flex items-center gap-2">
                  {viewingBranches && (
                    <button
                      type="button"
                      onClick={toggleSelectAllBranches}
                      disabled={
                        allBranchCodes.length === 0
                      }
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 transition-colors disabled:opacity-50"
                    >
                      <FontAwesomeIcon
                        icon={
                          allBranchesSelected
                            ? faSquare
                            : faCheckSquare
                        }
                      />

                      {allBranchesSelected
                        ? "Unselect All"
                        : "Select All"}
                    </button>
                  )}

                  {viewingBranches && (
                    <button
                      type="button"
                      onClick={() =>
                        setMobileStep("users")
                      }
                      className="md:hidden inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-700 text-sm font-medium"
                    >
                      <FontAwesomeIcon
                        icon={faArrowLeft}
                      />
                      Back
                    </button>
                  )}
                </div>
              </div>

              {viewingBranches && (
                <div className="mb-3">
                  <div className="inline-flex max-w-full items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-2 py-1.5">
                    <FontAwesomeIcon
                      icon={faUsers}
                      className="text-blue-600"
                    />

                    <div className="min-w-0">
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-blue-700">
                        Selected Users
                      </div>

                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {selectedUserDetails.length === 1 ? (
                          <span className="inline-flex items-center rounded-full border border-blue-200 bg-white px-2 py-0.5 text-xs font-medium text-blue-800">
                            {getUserCode(
                              selectedUserDetails[0]
                            )}{" "}
                            -{" "}
                            {getUserName(
                              selectedUserDetails[0]
                            )}
                          </span>
                        ) : (
                          <>
                            <span className="inline-flex items-center rounded-full border border-blue-200 bg-white px-2 py-0.5 text-xs font-medium text-blue-800">
                              {selectedUserDetails.length}{" "}
                              users selected
                            </span>

                            {selectedUserDetails
                              .slice(0, 2)
                              .map((u) => (
                                <span
                                  key={getUserCode(u)}
                                  className="inline-flex items-center rounded-full border border-blue-200 bg-white px-2 py-0.5 text-[11px] text-blue-700"
                                >
                                  {getUserCode(u)}
                                </span>
                              ))}

                            {selectedUserDetails.length >
                              2 && (
                              <span className="inline-flex items-center rounded-full border border-blue-200 bg-white px-2 py-0.5 text-[11px] text-blue-700">
                                +
                                {selectedUserDetails.length -
                                  2}{" "}
                                more
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
                {viewingBranches ? (
                  <SearchGlobalReferenceTable
                    docType="UserAccRight"
                    columns={branchColumns}
                    data={branches}
                    isLoading={loadingBranches}
                    itemsPerPage={50}
                    showFilters={true}
                    onRowDoubleClick={(row) =>
                      toggleBranch(
                        getBranchCode(row)
                      )
                    }
                    onRowClick={(row) =>
                      toggleBranch(
                        getBranchCode(row)
                      )
                    }
                    mobileSelectable={true}
                    selectedRowChecker={(row) =>
                      selectedBranches.includes(
                        getBranchCode(row)
                      )
                    }
                    tableSize={tableSize}
                    className="h-full"
                  />
                ) : (
                  <div className="h-full min-h-[320px] flex items-center justify-center text-center text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
                    <div>
                      <FontAwesomeIcon
                        icon={faBuilding}
                        className="text-xl mb-2 text-gray-400"
                      />

                      <h3 className="font-medium text-sm mb-1">
                        Branch Selection Hidden
                      </h3>

                      <p className="text-xs px-4">
                        Select user(s) from the users
                        table and click "View Branches".
                      </p>

                      <button
                        type="button"
                        onClick={handleViewBranches}
                        disabled={
                          selectedUsers.length === 0
                        }
                        className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        View Branches
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {selectedUsers.length > 0 && (
          <div className="mt-3 bg-blue-50 p-2 rounded text-xs">
            {viewingBranches
              ? `Assigning branches to ${selectedUsers.length} selected user(s).`
              : `${selectedUsers.length} user(s) selected. Click "View Branches" to continue.`}
          </div>
        )}

        {viewingBranches && (
          <div className="mt-2 bg-green-50 p-2 rounded text-xs">
            {`${selectedBranches.length} branch(es) selected to apply to ${selectedUsers.length} user(s).`}
          </div>
        )}
      </div>
    );
  }
);

export default BranchAccessTab;
