import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faCheckSquare,
  faSquare,
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

const getPaygroupCode = (row = {}) =>
  row.paygroupCode ??
  row.groupCode ??
  row.GROUP_CODE ??
  row.group_code ??
  "";

const getPaygroupName = (row = {}) =>
  row.paygroupName ??
  row.groupName ??
  row.GROUP_NAME ??
  row.group_name ??
  "";


const normalizeRows = (data) => {
  try {
    const raw =
      data?.data?.[0]?.result ??
      data?.data?.result ??
      data?.[0]?.result ??
      data?.result ??
      data?.data;

    if (Array.isArray(raw)) {
      return raw;
    }

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


const PaygroupAccessTab = forwardRef(
  (
    {
      users = [],
      tableSize = "Half",
      setSaving,
    },
    ref
  ) => {
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [paygroups, setPaygroups] = useState([]);
    const [selectedPaygroups, setSelectedPaygroups] = useState([]);
    const [viewing, setViewing] = useState(false);
    const [loadingPaygroups, setLoadingPaygroups] = useState(false);
    const [mobileStep, setMobileStep] = useState("users");


    const allUserCodes = useMemo(
      () =>
        users
          .map(getUserCode)
          .filter(Boolean),
      [users]
    );


    const allPaygroupCodes = useMemo(
      () =>
        paygroups
          .map(getPaygroupCode)
          .filter(Boolean),
      [paygroups]
    );


    const selectedUserDetails = useMemo(
      () =>
        users.filter((user) =>
          selectedUsers.includes(getUserCode(user))
        ),
      [users, selectedUsers]
    );


    const allUsersSelected =
      allUserCodes.length > 0 &&
      selectedUsers.length === allUserCodes.length;


    const allPaygroupsSelected =
      allPaygroupCodes.length > 0 &&
      selectedPaygroups.length === allPaygroupCodes.length;


    const toggleUser = useCallback(
      (userCode) => {
        if (viewing) return;

        setSelectedUsers((previous) =>
          previous.includes(userCode)
            ? previous.filter((code) => code !== userCode)
            : [...previous, userCode]
        );
      },
      [viewing]
    );


    const toggleSelectAllUsers = useCallback(() => {
      if (viewing) return;

      setSelectedUsers((previous) =>
        previous.length === allUserCodes.length
          ? []
          : [...allUserCodes]
      );
    }, [viewing, allUserCodes]);


    const togglePaygroup = useCallback((paygroupCode) => {
      setSelectedPaygroups((previous) =>
        previous.includes(paygroupCode)
          ? previous.filter((code) => code !== paygroupCode)
          : [...previous, paygroupCode]
      );
    }, []);


    const toggleSelectAllPaygroups = useCallback(() => {
      setSelectedPaygroups((previous) =>
        previous.length === allPaygroupCodes.length
          ? []
          : [...allPaygroupCodes]
      );
    }, [allPaygroupCodes]);


    /*
    |--------------------------------------------------------------------------
    | Load Paygroup Master
    |--------------------------------------------------------------------------
    */
    const loadPaygroups = useCallback(async () => {
      const { data } = await apiClient.get(
        "/loadPaygroups",
        {
          timeout: 60000,
        }
      );

      return normalizeRows(data)
        .filter((row) => {
          const code = getPaygroupCode(row);

          const active = String(
            row.active ??
              row.ACTIVE ??
              "Y"
          )
            .trim()
            .toUpperCase();

          return code && active !== "N";
        })
        .map((row) => ({
          ...row,
          paygroupCode: getPaygroupCode(row),
          paygroupName: getPaygroupName(row),
        }));
    }, []);


    /*
    |--------------------------------------------------------------------------
    | Load Existing User Paygroup Access
    |--------------------------------------------------------------------------
    */
    const loadExistingAccess = useCallback(async () => {
      if (selectedUsers.length === 0) {
        return [];
      }

      const { data } = await apiClient.post(
        "/getUserPaygroupAccess",
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


    /*
    |--------------------------------------------------------------------------
    | View Paygroups
    |--------------------------------------------------------------------------
    */
    const handleViewPaygroups = useCallback(async () => {
      if (selectedUsers.length === 0) {
        await useSwalErrorAlert(
          "No Users Selected",
          "Please select at least one user before viewing paygroup access."
        );

        return;
      }

      setLoadingPaygroups(true);

      try {
        const [paygroupRows, accessRows] =
          await Promise.all([
            loadPaygroups(),
            loadExistingAccess(),
          ]);


        /*
          For multiple selected users, initially check only paygroups
          currently assigned to ALL selected users.
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

          const paygroupCode = String(
            getPaygroupCode(row)
          )
            .trim()
            .toUpperCase();

          if (
            accessByUser.has(userCode) &&
            paygroupCode
          ) {
            accessByUser
              .get(userCode)
              .add(paygroupCode);
          }
        });


        const commonPaygroups = paygroupRows
          .map(getPaygroupCode)
          .filter(Boolean)
          .filter((paygroupCode) => {
            const normalizedPaygroup =
              String(paygroupCode)
                .trim()
                .toUpperCase();

            return selectedUsers.every(
              (userCode) => {
                const normalizedUser =
                  String(userCode)
                    .trim()
                    .toUpperCase();

                return accessByUser
                  .get(normalizedUser)
                  ?.has(normalizedPaygroup);
              }
            );
          });


        setPaygroups(paygroupRows);
        setSelectedPaygroups(commonPaygroups);
        setViewing(true);
        setMobileStep("access");

      } catch (error) {
        console.error(
          "Unable to load paygroup access:",
          error?.response?.data || error
        );

        await useSwalErrorAlert(
          "Error",
          error?.response?.data?.message ||
            error?.response?.data?.details ||
            "Unable to load paygroup access."
        );
      } finally {
        setLoadingPaygroups(false);
      }
    }, [
      selectedUsers,
      loadPaygroups,
      loadExistingAccess,
    ]);


    /*
    |--------------------------------------------------------------------------
    | Save Paygroup Access
    |--------------------------------------------------------------------------
    */
    const handleSave = useCallback(async () => {
      if (selectedUsers.length === 0) {
        await useSwalErrorAlert(
          "No Users Selected",
          "Please select at least one user first."
        );

        return;
      }

      if (!viewing) {
        await useSwalErrorAlert(
          "Nothing to Save",
          'Click "View Paygroups" before saving paygroup access.'
        );

        return;
      }

      setSaving?.(true);

      try {
        const payload = {
          json_data: {
            dt1: selectedPaygroups.map(
              (paygroupCode) => ({
                paygroupCode,
              })
            ),

            dt2: selectedUsers.map(
              (userCode) => ({
                userCode,
              })
            ),
          },
        };


        const { data: response } =
          await apiClient.post(
            "/upsertUserPaygroupAccess",
            payload,
            {
              timeout: 60000,
            }
          );


        if (response?.success === false) {
          throw new Error(
            response?.message ||
              "Unable to save paygroup access."
          );
        }


        await useSwalSuccessAlert(
          "Success!",
          `Paygroup access updated for ${selectedUsers.length} user(s).`
        );


        await handleViewPaygroups();

      } catch (error) {
        console.error(
          "upsertUserPaygroupAccess failed:",
          error?.response?.data || error
        );

        await useSwalErrorAlert(
          "Error!",
          error?.response?.data?.message ||
            error?.response?.data?.details ||
            error?.message ||
            "Error saving paygroup access."
        );

      } finally {
        setSaving?.(false);
      }

    }, [
      selectedUsers,
      selectedPaygroups,
      viewing,
      setSaving,
      handleViewPaygroups,
    ]);


    const handleReset = useCallback(() => {
      setSelectedUsers([]);
      setPaygroups([]);
      setSelectedPaygroups([]);
      setViewing(false);
      setMobileStep("users");
    }, []);


    useImperativeHandle(
      ref,
      () => ({
        save: handleSave,
        reset: handleReset,
        viewPaygroups: handleViewPaygroups,
      }),
      [
        handleSave,
        handleReset,
        handleViewPaygroups,
      ]
    );


    const userColumns = useMemo(
      () => [
        {
          key: "__select",
          label: "Select",
          sortable: false,
          filterable: false,
          width: 90,

          render: (row) => {
            const userCode =
              getUserCode(row);

            return (
              <div className="flex justify-end md:justify-center py-1">
                <input
                  type="checkbox"
                  checked={
                    selectedUsers.includes(
                      userCode
                    )
                  }
                  onChange={() =>
                    toggleUser(userCode)
                  }
                  onClick={(event) =>
                    event.stopPropagation()
                  }
                  disabled={viewing}
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
          render: getUserCode,
        },

        {
          key: "userName",
          label: "Username",
          sortable: true,
          width: 260,
          render: getUserName,
        },
      ],
      [
        selectedUsers,
        toggleUser,
        viewing,
      ]
    );


    const paygroupColumns = useMemo(
      () => [
        {
          key: "__select",
          label: "Select",
          sortable: false,
          filterable: false,
          width: 90,

          render: (row) => {
            const paygroupCode =
              getPaygroupCode(row);

            return (
              <div className="flex justify-end md:justify-center py-1">
                <input
                  type="checkbox"
                  checked={
                    selectedPaygroups.includes(
                      paygroupCode
                    )
                  }
                  onChange={() =>
                    togglePaygroup(
                      paygroupCode
                    )
                  }
                  onClick={(event) =>
                    event.stopPropagation()
                  }
                  className="h-6 w-6 md:h-4 md:w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
              </div>
            );
          },
        },

        {
          key: "paygroupCode",
          label: "Paygroup Code",
          sortable: true,
          width: 150,
          render: getPaygroupCode,
        },

        {
          key: "paygroupName",
          label: "Paygroup Name",
          sortable: true,
          width: 300,
          render: getPaygroupName,
        },
      ],
      [
        selectedPaygroups,
        togglePaygroup,
      ]
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
                      viewing ||
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


                  {viewing && (
                    <button
                      type="button"
                      onClick={() =>
                        setMobileStep("access")
                      }
                      className="md:hidden inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-sm font-medium"
                    >
                      Paygroups

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
                  itemsPerPage={50}
                  showFilters={true}
                  onRowClick={(row) =>
                    toggleUser(
                      getUserCode(row)
                    )
                  }
                  onRowDoubleClick={(row) =>
                    toggleUser(
                      getUserCode(row)
                    )
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


          {/* PAYGROUPS */}
          <div
            className={`w-full md:w-1/2 ${
              mobileStep === "access"
                ? "block"
                : "hidden md:block"
            }`}
          >
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 h-full flex flex-col">

              <div className="flex items-center justify-between mb-2 gap-3">

                <h2 className="text-lg font-semibold text-gray-700">
                  Paygroups
                </h2>

                <div className="flex items-center gap-2">

                  {viewing && (
                    <button
                      type="button"
                      onClick={
                        toggleSelectAllPaygroups
                      }
                      disabled={
                        allPaygroupCodes.length === 0
                      }
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 transition-colors disabled:opacity-50"
                    >
                      <FontAwesomeIcon
                        icon={
                          allPaygroupsSelected
                            ? faSquare
                            : faCheckSquare
                        }
                      />

                      {allPaygroupsSelected
                        ? "Unselect All"
                        : "Select All"}
                    </button>
                  )}


                  {viewing && (
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


              {viewing && (
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
                              .map((user) => (
                                <span
                                  key={
                                    getUserCode(user)
                                  }
                                  className="inline-flex items-center rounded-full border border-blue-200 bg-white px-2 py-0.5 text-[11px] text-blue-700"
                                >
                                  {getUserCode(user)}
                                </span>
                              ))}

                            {selectedUserDetails.length > 2 && (
                              <span className="inline-flex items-center rounded-full border border-blue-200 bg-white px-2 py-0.5 text-[11px] text-blue-700">
                                +
                                {selectedUserDetails.length - 2}{" "}
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

                {viewing ? (
                  <SearchGlobalReferenceTable
                    docType="UserAccRight"
                    columns={paygroupColumns}
                    data={paygroups}
                    isLoading={loadingPaygroups}
                    itemsPerPage={50}
                    showFilters={true}
                    onRowClick={(row) =>
                      togglePaygroup(
                        getPaygroupCode(row)
                      )
                    }
                    onRowDoubleClick={(row) =>
                      togglePaygroup(
                        getPaygroupCode(row)
                      )
                    }
                    mobileSelectable={true}
                    selectedRowChecker={(row) =>
                      selectedPaygroups.includes(
                        getPaygroupCode(row)
                      )
                    }
                    tableSize={tableSize}
                    className="h-full"
                  />
                ) : (
                  <div className="h-full min-h-[320px] flex items-center justify-center text-center text-gray-500 bg-gray-50 rounded-lg border border-gray-200">

                    <div>

                      <FontAwesomeIcon
                        icon={faUsers}
                        className="text-xl mb-2 text-gray-400"
                      />

                      <h3 className="font-medium text-sm mb-1">
                        Paygroup Selection Hidden
                      </h3>

                      <p className="text-xs px-4">
                        Select user(s), then click
                        "View Paygroups".
                      </p>

                      <button
                        type="button"
                        onClick={
                          handleViewPaygroups
                        }
                        disabled={
                          selectedUsers.length === 0
                        }
                        className="mt-3 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        View Paygroups
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
            {viewing
              ? `Assigning paygroup access to ${selectedUsers.length} selected user(s).`
              : `${selectedUsers.length} user(s) selected. Click "View Paygroups" to continue.`}
          </div>
        )}


        {viewing && (
          <div className="mt-2 bg-green-50 p-2 rounded text-xs">
            {`${selectedPaygroups.length} paygroup(s) selected to apply to ${selectedUsers.length} user(s).`}
          </div>
        )}

      </div>
    );
  }
);


export default PaygroupAccessTab;
