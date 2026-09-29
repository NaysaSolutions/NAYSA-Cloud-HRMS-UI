import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEye,
  faUndo,
  faCheck,
  faChevronDown,
  faFilePdf,
  faInfoCircle,
  faVideo,
  faDatabase,
  faSquare,
  faCheckSquare,
  faShieldAlt,
  faArrowLeft,
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

/* ============================================================
   HELPERS
   ============================================================ */

const getUserCode = (row = {}) =>
  row.userCode ??
  row.USER_CODE ??
  row.user_code ??
  "";

const getUserName = (row = {}) =>
  row.userName ??
  row.USER_NAME ??
  row.user_name ??
  "";

const getMasterCode = (row = {}) =>
  row.masterCode ??
  row.MASTER_CODE ??
  row.master_code ??
  row.menuCode ??
  row.MENU_CODE ??
  row.menu_code ??
  "";

const normalizeRows = (payload) => {
  const raw = payload?.data ?? payload ?? [];

  if (Array.isArray(raw)) {
    return raw;
  }

  return [];
};

const normalizeUserLoadRows = (payload) => {
  try {
    const raw =
      payload?.data?.[0]?.result ??
      payload?.[0]?.result ??
      payload?.result ??
      payload?.data;

    if (Array.isArray(raw)) {
      return raw;
    }

    if (typeof raw === "string") {
      const parsed = JSON.parse(raw || "[]");
      return Array.isArray(parsed) ? parsed : [];
    }

    return [];
  } catch (error) {
    console.error("normalizeUserLoadRows error:", error);
    return [];
  }
};


/* ============================================================
   COMPONENT
   ============================================================ */

export default function MasterAccessRights() {
  const docType = "MasterAccRight";

  const documentTitle =
    reftables?.[docType] ??
    "Master Data Access Rights";

  const pdfLink =
    reftablesPDFGuide?.[docType];

  const videoLink =
    reftablesVideoGuide?.[docType];

  const guideRef = useRef(null);
  const masterDataRef = useRef([]);

  const [isOpenGuide, setOpenGuide] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [
    loadingMasterData,
    setLoadingMasterData,
  ] = useState(false);

  const [saving, setSaving] =
    useState(false);

  const [users, setUsers] =
    useState([]);

  const [masterData, setMasterData] =
    useState([]);

  const [
    selectedUsers,
    setSelectedUsers,
  ] = useState([]);

  const [
    checkedMasterData,
    setCheckedMasterData,
  ] = useState(new Set());

  const [
    showMasterData,
    setShowMasterData,
  ] = useState(false);

  const [mobileStep, setMobileStep] =
    useState("users");


  /* ============================================================
     ENDPOINTS
     ============================================================ */

  const loadMasterDataEndpoint =
    "/master-access-rights/load-master-data";

  const getUserMasterDataEndpoint =
    "/master-access-rights/get-user-master-data";

  const upsertEndpoint =
    "/master-access-rights/upsert-user-master-data";


  /* ============================================================
     CLOSE INFO DROPDOWN
     ============================================================ */

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        guideRef.current &&
        !guideRef.current.contains(event.target)
      ) {
        setOpenGuide(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () =>
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
  }, []);


  /* ============================================================
     DERIVED VALUES
     ============================================================ */

  const allUserCodes = useMemo(
    () =>
      (Array.isArray(users) ? users : [])
        .map(getUserCode)
        .filter(Boolean),
    [users]
  );

  const allMasterCodes = useMemo(
    () =>
      (Array.isArray(masterData)
        ? masterData
        : []
      )
        .map(getMasterCode)
        .filter(Boolean),
    [masterData]
  );

  const allUsersSelected =
    allUserCodes.length > 0 &&
    selectedUsers.length ===
      allUserCodes.length;

  const allMasterSelected =
    allMasterCodes.length > 0 &&
    checkedMasterData.size ===
      allMasterCodes.length;

  const selectedUserDetails =
    useMemo(
      () =>
        (Array.isArray(users)
          ? users
          : []
        ).filter((row) =>
          selectedUsers.includes(
            getUserCode(row)
          )
        ),
      [users, selectedUsers]
    );


  /* ============================================================
     LOAD USERS
     ============================================================ */

  const fetchUsers =
    useCallback(async () => {
      setLoading(true);

      try {
        const { data } =
          await apiClient.get(
            "/load",
            {
              params: {
                Status: "Active",
              },
              timeout: 60000,
            }
          );

        const rows =
          normalizeUserLoadRows(data);

        setUsers(
          rows.filter((row) =>
            getUserCode(row)
          )
        );
      } catch (error) {
        console.error(
          "fetchUsers failed:",
          error
        );

        setUsers([]);

        await useSwalErrorAlert(
          "Error!",
          "Failed to fetch users."
        );
      } finally {
        setLoading(false);
      }
    }, []);


  /* ============================================================
     LOAD MASTER DATA
     ============================================================ */

  const fetchMasterData =
    useCallback(async () => {
      try {
        const { data } =
          await apiClient.get(
            loadMasterDataEndpoint,
            {
              timeout: 60000,
            }
          );

        const rows =
          normalizeRows(data).map(
            (row) => ({
              masterCode:
                getMasterCode(row),

              moduleName:
                row.moduleName ??
                row.MODULE_NAME ??
                row.module ??
                row.MODULE ??
                "",

              subMenu:
                row.subMenu ??
                row.SUB_MENU ??
                row.sub_menu ??
                "",

              particular:
                row.particular ??
                row.PARTICULAR ??
                row.menuName ??
                row.MENU_NAME ??
                row.menu_name ??
                "",
            })
          );

        const filtered =
          rows.filter(
            (row) => row.masterCode
          );

        masterDataRef.current =
          filtered;

        setMasterData(filtered);

        return filtered;
      } catch (error) {
        console.error(
          "fetchMasterData failed:",
          error
        );

        masterDataRef.current = [];
        setMasterData([]);

        await useSwalErrorAlert(
          "Error!",
          "Failed to fetch master data list."
        );

        return [];
      }
    }, []);


  /* ============================================================
     INITIAL LOAD
     ============================================================ */

  useEffect(() => {
    fetchUsers();
    fetchMasterData();
  }, [fetchUsers, fetchMasterData]);


  /* ============================================================
     USER SELECTION
     ============================================================ */

  const toggleUser =
    useCallback(
      (userCode) => {
        if (showMasterData) {
          return;
        }

        setSelectedUsers(
          (previous) =>
            previous.includes(userCode)
              ? previous.filter(
                  (code) =>
                    code !== userCode
                )
              : [
                  ...previous,
                  userCode,
                ]
        );
      },
      [showMasterData]
    );


  const toggleSelectAllUsers =
    useCallback(() => {
      if (showMasterData) {
        return;
      }

      setSelectedUsers(
        (previous) =>
          previous.length ===
          allUserCodes.length
            ? []
            : [...allUserCodes]
      );
    }, [
      showMasterData,
      allUserCodes,
    ]);


  /* ============================================================
     MASTER SELECTION
     ============================================================ */

  const toggleMasterData =
    useCallback((masterCode) => {
      setCheckedMasterData(
        (previous) => {
          const next =
            new Set(previous);

          if (
            next.has(masterCode)
          ) {
            next.delete(
              masterCode
            );
          } else {
            next.add(masterCode);
          }

          return next;
        }
      );
    }, []);


  const toggleSelectAllMasterData =
    useCallback(() => {
      setCheckedMasterData(
        (previous) =>
          allMasterCodes.length >
            0 &&
          previous.size ===
            allMasterCodes.length
            ? new Set()
            : new Set(
                allMasterCodes
              )
      );
    }, [allMasterCodes]);


  /* ============================================================
     LOAD USER MASTER ACCESS

     Important:
     A masterCode is initially checked only if ALL selected users
     already have that access.
     ============================================================ */

  const fetchUserMasterData =
    useCallback(
      async (
        userCodes = []
      ) => {
        if (
          !Array.isArray(
            userCodes
          ) ||
          userCodes.length === 0
        ) {
          return new Set();
        }

        try {
          const { data } =
            await apiClient.post(
              getUserMasterDataEndpoint,
              {
                json_data: {
                  users:
                    userCodes.map(
                      (userCode) => ({
                        userCode,
                      })
                    ),
                },
              }
            );

          const rows =
            normalizeRows(data);

          const accessByUser =
            new Map();

          userCodes.forEach(
            (userCode) => {
              accessByUser.set(
                String(userCode)
                  .trim()
                  .toUpperCase(),
                new Set()
              );
            }
          );

          rows.forEach(
            (row) => {
              const userCode =
                String(
                  row.userCode ??
                    row.USER_CODE ??
                    row.user_code ??
                    ""
                )
                  .trim()
                  .toUpperCase();

              const masterCode =
                String(
                  getMasterCode(row)
                )
                  .trim()
                  .toUpperCase();

              if (
                accessByUser.has(
                  userCode
                ) &&
                masterCode
              ) {
                accessByUser
                  .get(userCode)
                  .add(
                    masterCode
                  );
              }
            }
          );

          const commonCodes =
            masterDataRef.current
              .map(getMasterCode)
              .filter(Boolean)
              .filter(
                (masterCode) => {
                  const normalizedMaster =
                    String(masterCode)
                      .trim()
                      .toUpperCase();

                  return userCodes.every(
                    (userCode) => {
                      const normalizedUser =
                        String(
                          userCode
                        )
                          .trim()
                          .toUpperCase();

                      return accessByUser
                        .get(
                          normalizedUser
                        )
                        ?.has(
                          normalizedMaster
                        );
                    }
                  );
                }
              );

          return new Set(
            commonCodes
          );
        } catch (error) {
          console.error(
            "fetchUserMasterData failed:",
            error
          );

          throw error;
        }
      },
      []
    );


  /* ============================================================
     VIEW RIGHTS
     ============================================================ */

  const handleViewRights =
    useCallback(async () => {
      if (
        selectedUsers.length ===
        0
      ) {
        await useSwalWarningAlert(
          "No Users Selected",
          "Please select at least one user before viewing master data access."
        );

        return;
      }

      setLoadingMasterData(
        true
      );

      setShowMasterData(
        false
      );

      setCheckedMasterData(
        new Set()
      );

      try {
        if (
          masterDataRef.current
            .length === 0
        ) {
          await fetchMasterData();
        }

        const checkedSet =
          await fetchUserMasterData(
            selectedUsers
          );

        setCheckedMasterData(
          checkedSet
        );

        setShowMasterData(
          true
        );

        setMobileStep(
          "master"
        );
      } catch (error) {
        console.error(
          "handleViewRights failed:",
          error
        );

        await useSwalErrorAlert(
          "Error!",
          error?.response?.data
            ?.message ||
            "Failed to load master data access."
        );
      } finally {
        setLoadingMasterData(
          false
        );
      }
    }, [
      selectedUsers,
      fetchMasterData,
      fetchUserMasterData,
    ]);


  /* ============================================================
     APPLY

     UpsertUserMasterData already replaces all master rows for
     every selected user, so only one request is required.

     Empty dt1 = clear all master access for selected users.
     ============================================================ */

  const handleApply =
    useCallback(async () => {
      if (
        selectedUsers.length ===
        0
      ) {
        await useSwalWarningAlert(
          "No Users Selected",
          "Please select at least one user before applying."
        );

        return;
      }

      if (!showMasterData) {
        await useSwalWarningAlert(
          "Nothing to Apply",
          'Click "View Rights" first, then modify the access.'
        );

        return;
      }

      setSaving(true);

      try {
        const payload = {
          json_data: {
            dt1: Array.from(
              checkedMasterData
            ).map(
              (masterCode) => ({
                masterCode,
              })
            ),

            dt2:
              selectedUsers.map(
                (userCode) => ({
                  userCode,
                })
              ),
          },
        };

        const { data } =
          await apiClient.post(
            upsertEndpoint,
            payload
          );

        const success =
          data?.success === true ||
          data?.data?.status ===
            "success";

        if (!success) {
          throw new Error(
            data?.message ||
              "Unable to save master access rights."
          );
        }

        await useSwalSuccessAlert(
          "Success!",
          `Master Data Access updated for ${selectedUsers.length} user(s).`
        );

        const refreshed =
          await fetchUserMasterData(
            selectedUsers
          );

        setCheckedMasterData(
          refreshed
        );
      } catch (error) {
        console.error(
          "handleApply failed:",
          error
        );

        await useSwalErrorAlert(
          "Error!",
          error?.response?.data
            ?.message ||
            error?.message ||
            "Error saving master data access."
        );
      } finally {
        setSaving(false);
      }
    }, [
      selectedUsers,
      showMasterData,
      checkedMasterData,
      fetchUserMasterData,
    ]);


  /* ============================================================
     RESET
     ============================================================ */

  const handleReset =
    useCallback(() => {
      setSelectedUsers([]);
      setCheckedMasterData(
        new Set()
      );

      setShowMasterData(
        false
      );

      setMobileStep(
        "users"
      );
    }, []);


  /* ============================================================
     USER TABLE COLUMNS
     ============================================================ */

  const userColumns =
    useMemo(
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
                  className="h-6 w-6 md:h-4 md:w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  checked={selectedUsers.includes(
                    userCode
                  )}
                  disabled={
                    showMasterData
                  }
                  onClick={(e) =>
                    e.stopPropagation()
                  }
                  onChange={() =>
                    toggleUser(
                      userCode
                    )
                  }
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
          render: (row) =>
            getUserCode(row),
        },

        {
          key: "userName",
          label: "Username",
          sortable: true,
          width: 260,
          render: (row) =>
            getUserName(row),
        },
      ],
      [
        selectedUsers,
        showMasterData,
        toggleUser,
      ]
    );


  /* ============================================================
     MASTER TABLE COLUMNS
     ============================================================ */

  const masterDataColumns =
    useMemo(
      () => [
        {
          key: "__select",
          label: "Full Access",
          sortable: false,
          filterable: false,
          width: 110,

          render: (row) => {
            const masterCode =
              getMasterCode(row);

            return (
              <div className="flex justify-end md:justify-center py-1">
                <input
                  type="checkbox"
                  className="h-6 w-6 md:h-4 md:w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  checked={checkedMasterData.has(
                    masterCode
                  )}
                  onClick={(e) =>
                    e.stopPropagation()
                  }
                  onChange={() =>
                    toggleMasterData(
                      masterCode
                    )
                  }
                />
              </div>
            );
          },
        },

        {
          key: "moduleName",
          label: "Module",
          sortable: true,
          width: 180,
        },

        {
          key: "subMenu",
          label: "Sub Menu",
          sortable: true,
          width: 180,
        },

        {
          key: "particular",
          label: "Menu Name",
          sortable: true,
          width: 340,
        },
      ],
      [
        checkedMasterData,
        toggleMasterData,
      ]
    );


  /* ============================================================
     TABLE DATA
     ============================================================ */

  const userTableData =
    useMemo(
      () =>
        (Array.isArray(users)
          ? users
          : []
        ).map(
          (row, index) => ({
            ...row,
            userCode:
              getUserCode(row),
            userName:
              getUserName(row),
            __idx: index,
          })
        ),
      [users]
    );


  const masterDataTableData =
    useMemo(
      () =>
        (Array.isArray(masterData)
          ? masterData
          : []
        ).map(
          (row, index) => ({
            ...row,
            __idx: index,
          })
        ),
      [masterData]
    );


  /* ============================================================
     INFO
     ============================================================ */

  const handlePDFGuide =
    () => {
      if (pdfLink) {
        window.open(
          pdfLink,
          "_blank"
        );
      }

      setOpenGuide(false);
    };


  const handleVideoGuide =
    () => {
      if (videoLink) {
        window.open(
          videoLink,
          "_blank"
        );
      }

      setOpenGuide(false);
    };


  /* ============================================================
     RENDER
     ============================================================ */

  return (
    <div className="global-ref-main-div-ui">
      {(loading ||
        saving ||
        loadingMasterData) && (
        <LoadingSpinner />
      )}

      {/* ======================================================
          HEADER
          ====================================================== */}
      <div className="global-ref-header-ui !py-2">
        <div className="w-full flex flex-col gap-1 md:grid md:grid-cols-3 md:items-center md:gap-0">

          {/* TITLE */}
          <div className="w-full md:w-auto flex md:justify-start">
            <h1 className="global-ref-headertext-ui w-full md:w-auto truncate text-center md:text-left text-[18px] leading-tight">
              {documentTitle}
            </h1>
          </div>

          {/* CENTER SPACER */}
          <div className="hidden md:flex justify-center w-full" />

          {/* BUTTONS */}
          <div className="w-full md:w-auto flex md:justify-end">
            <div className="w-full md:w-auto flex items-center justify-center md:justify-end gap-2 flex-wrap">

              <button
                type="button"
                onClick={
                  handleViewRights
                }
                disabled={
                  selectedUsers.length ===
                    0 ||
                  showMasterData
                }
                className="flex items-center justify-center h-7 w-8 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md bg-blue-600 text-white shadow-sm hover:bg-blue-700 hover:shadow active:scale-95 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FontAwesomeIcon
                  icon={faEye}
                />

                <span className="hidden sm:inline ml-1">
                  View Rights
                </span>
              </button>

              <button
                type="button"
                onClick={
                  handleApply
                }
                disabled={
                  !showMasterData ||
                  saving
                }
                className="flex items-center justify-center h-7 w-8 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md bg-blue-600 text-white shadow-sm hover:bg-blue-700 hover:shadow active:scale-95 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FontAwesomeIcon
                  icon={faCheck}
                />

                <span className="hidden sm:inline ml-1">
                  Apply
                </span>
              </button>

              <button
                type="button"
                onClick={
                  handleReset
                }
                className="flex items-center justify-center h-7 w-8 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md bg-blue-600 text-white shadow-sm hover:bg-blue-700 hover:shadow active:scale-95 transition-all duration-150"
              >
                <FontAwesomeIcon
                  icon={faUndo}
                />

                <span className="hidden sm:inline ml-1">
                  Reset
                </span>
              </button>

              <div
                ref={guideRef}
                className="relative"
              >
                <button
                  type="button"
                  onClick={() =>
                    setOpenGuide(
                      (value) =>
                        !value
                    )
                  }
                  className="bg-blue-600 text-white h-7 w-8 sm:w-auto sm:h-8 sm:px-4 rounded-md flex items-center justify-center gap-1 shadow-sm hover:bg-blue-700 hover:shadow active:scale-95 transition-all duration-150"
                >
                  <FontAwesomeIcon
                    icon={
                      faInfoCircle
                    }
                    className="text-[12px]"
                  />

                  <span className="hidden sm:inline ml-1 text-[11px] font-medium">
                    Info
                  </span>

                  <FontAwesomeIcon
                    icon={
                      faChevronDown
                    }
                    className={`hidden sm:inline text-[10px] opacity-80 transition-transform duration-200 ${
                      isOpenGuide
                        ? "rotate-180"
                        : ""
                    }`}
                  />
                </button>

                {isOpenGuide && (
                  <div className="absolute right-0 mt-2 w-52 rounded-md shadow-xl bg-white ring-1 ring-black/10 z-[60] overflow-hidden">

                    <button
                      type="button"
                      onClick={
                        handlePDFGuide
                      }
                      disabled={
                        !pdfLink
                      }
                      className="block w-full text-left px-4 py-2 text-xs hover:bg-blue-50 border-b border-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FontAwesomeIcon
                        icon={
                          faFilePdf
                        }
                        className="mr-2 text-red-500"
                      />
                      PDF Guide
                    </button>

                    <button
                      type="button"
                      onClick={
                        handleVideoGuide
                      }
                      disabled={
                        !videoLink
                      }
                      className="block w-full text-left px-4 py-2 text-xs hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FontAwesomeIcon
                        icon={
                          faVideo
                        }
                        className="mr-2 text-blue-500"
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


      {/* ======================================================
          BODY
          ====================================================== */}
      <div className="mt-10">
        <div className="flex flex-col md:flex-row gap-4">

          {/* ==================================================
              USERS PANEL
              ================================================== */}
          <div
            className={`w-full md:w-1/2 ${
              mobileStep ===
              "users"
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
                    onClick={
                      toggleSelectAllUsers
                    }
                    disabled={
                      showMasterData ||
                      allUserCodes.length ===
                        0
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

                  {showMasterData && (
                    <button
                      type="button"
                      onClick={() =>
                        setMobileStep(
                          "master"
                        )
                      }
                      className="md:hidden inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-sm font-medium"
                    >
                      Master Data

                      <FontAwesomeIcon
                        icon={
                          faArrowLeft
                        }
                        className="rotate-180"
                      />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 min-h-0">
                <SearchGlobalReferenceTable
                  docType={
                    docType
                  }
                  columns={
                    userColumns
                  }
                  data={
                    userTableData
                  }
                  isLoading={
                    loading
                  }
                  itemsPerPage={
                    50
                  }
                  showFilters={
                    true
                  }
                  onRowClick={(
                    row
                  ) =>
                    toggleUser(
                      getUserCode(
                        row
                      )
                    )
                  }
                  onRowDoubleClick={(
                    row
                  ) =>
                    toggleUser(
                      getUserCode(
                        row
                      )
                    )
                  }
                  mobileSelectable={
                    true
                  }
                  selectedRowChecker={(
                    row
                  ) =>
                    selectedUsers.includes(
                      getUserCode(
                        row
                      )
                    )
                  }
                  tableSize="Half"
                  className="h-full"
                />
              </div>
            </div>
          </div>


          {/* ==================================================
              MASTER DATA PANEL
              ================================================== */}
          <div
            className={`w-full md:w-1/2 ${
              mobileStep ===
              "master"
                ? "block"
                : "hidden md:block"
            }`}
          >
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 h-full flex flex-col">

              <div className="flex items-center justify-between mb-2 gap-3">
                <h2 className="text-lg font-semibold text-gray-700">
                  Master Data
                </h2>

                <div className="flex items-center gap-2">

                  {showMasterData && (
                    <button
                      type="button"
                      onClick={
                        toggleSelectAllMasterData
                      }
                      disabled={
                        allMasterCodes.length ===
                        0
                      }
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FontAwesomeIcon
                        icon={
                          allMasterSelected
                            ? faSquare
                            : faCheckSquare
                        }
                      />

                      {allMasterSelected
                        ? "Unselect All"
                        : "Select All"}
                    </button>
                  )}

                  {showMasterData && (
                    <button
                      type="button"
                      onClick={() =>
                        setMobileStep(
                          "users"
                        )
                      }
                      className="md:hidden inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-700 text-sm font-medium"
                    >
                      <FontAwesomeIcon
                        icon={
                          faArrowLeft
                        }
                      />
                      Back
                    </button>
                  )}
                </div>
              </div>


              {showMasterData && (
                <div className="mb-3">
                  <div className="inline-flex max-w-full items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-2 py-1.5">

                    <FontAwesomeIcon
                      icon={
                        faShieldAlt
                      }
                      className="text-blue-600"
                    />

                    <div className="min-w-0">

                      <div className="text-[10px] font-semibold uppercase tracking-wide text-blue-700">
                        Selected User
                        {selectedUserDetails.length !==
                        1
                          ? "s"
                          : ""}
                      </div>

                      <div className="mt-1 flex flex-wrap gap-1.5">

                        {selectedUserDetails.length ===
                        1 ? (
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
                              {
                                selectedUserDetails.length
                              }{" "}
                              users selected
                            </span>

                            {selectedUserDetails
                              .slice(
                                0,
                                2
                              )
                              .map(
                                (
                                  user
                                ) => (
                                  <span
                                    key={getUserCode(
                                      user
                                    )}
                                    className="inline-flex items-center rounded-full border border-blue-200 bg-white px-2 py-0.5 text-[11px] text-blue-700"
                                  >
                                    {getUserCode(
                                      user
                                    )}
                                  </span>
                                )
                              )}

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

                {showMasterData ? (
                  <SearchGlobalReferenceTable
                    docType={
                      docType
                    }
                    columns={
                      masterDataColumns
                    }
                    data={
                      masterDataTableData
                    }
                    isLoading={
                      loadingMasterData
                    }
                    itemsPerPage={
                      50
                    }
                    showFilters={
                      true
                    }
                    onRowClick={(
                      row
                    ) =>
                      toggleMasterData(
                        getMasterCode(
                          row
                        )
                      )
                    }
                    onRowDoubleClick={(
                      row
                    ) =>
                      toggleMasterData(
                        getMasterCode(
                          row
                        )
                      )
                    }
                    mobileSelectable={
                      true
                    }
                    selectedRowChecker={(
                      row
                    ) =>
                      checkedMasterData.has(
                        getMasterCode(
                          row
                        )
                      )
                    }
                    tableSize="Half"
                    className="h-full"
                  />
                ) : (
                  <div className="h-full min-h-[320px] flex items-center justify-center text-center text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
                    <div>
                      <FontAwesomeIcon
                        icon={
                          faDatabase
                        }
                        className="text-xl mb-2 text-gray-400"
                      />

                      <h3 className="font-medium text-sm mb-1">
                        Master Data Selection Hidden
                      </h3>

                      <p className="text-xs px-4">
                        Select user(s)
                        from the users
                        table and click
                        "View Rights".
                      </p>

                      <button
                        type="button"
                        onClick={
                          handleViewRights
                        }
                        disabled={
                          selectedUsers.length ===
                          0
                        }
                        className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <FontAwesomeIcon
                          icon={
                            faEye
                          }
                        />
                        View Rights
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>


        {/* ====================================================
            STATUS
            ==================================================== */}

        {selectedUsers.length >
          0 && (
          <div className="mt-3 bg-blue-50 p-2 rounded text-xs">
            {showMasterData
              ? `Assigning Master Data Access to ${selectedUsers.length} selected user(s). Select items and click Apply.`
              : `${selectedUsers.length} user(s) selected. Click "View Rights" to continue.`}
          </div>
        )}

        {showMasterData && (
          <div className="mt-2 bg-green-50 p-2 rounded text-xs">
            {`${checkedMasterData.size} master data item(s) selected for Full Access.`}
          </div>
        )}
      </div>
    </div>
  );
}
