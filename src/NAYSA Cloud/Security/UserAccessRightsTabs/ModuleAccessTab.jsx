import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faList,
  faArrowLeft,
  faUserShield,
  faSquare,
  faCheckSquare,
  faLockOpen,
  faEye,
} from "@fortawesome/free-solid-svg-icons";

import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";

import {
  useSwalSuccessAlert,
  useSwalErrorAlert,
} from "@/NAYSA Cloud/Global/behavior.jsx";

import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";


/* ============================================================
   Permission helpers
   ============================================================ */

const DEFAULT_PERMISSIONS = {
  access: false,
  fullAccess: false,
  readOnly: false,
};


const truthy = (value) =>
  value === true ||
  value === 1 ||
  value === "1" ||
  String(
    value || ""
  ).toUpperCase() === "Y" ||
  String(
    value || ""
  ).toLowerCase() ===
    "true";


const normalizeRows = (data) => {
  try {
    if (
      Array.isArray(
        data?.data
      ) &&
      data.data[0]
        ?.result
    ) {
      const parsed =
        typeof data
          .data[0]
          .result ===
        "string"
          ? JSON.parse(
              data.data[0]
                .result
            )
          : data.data[0]
              .result;

      return Array.isArray(
        parsed
      )
        ? parsed
        : [];
    }

    if (
      Array.isArray(
        data?.data
      )
    ) {
      return data.data;
    }

    if (
      Array.isArray(data)
    ) {
      return data;
    }

    if (
      Array.isArray(
        data?.result
      )
    ) {
      return data.result;
    }

    if (
      typeof data?.result ===
      "string"
    ) {
      const parsed =
        JSON.parse(
          data.result
        );

      return Array.isArray(
        parsed
      )
        ? parsed
        : [];
    }
  } catch (error) {
    console.error(
      "normalizeRows failed:",
      error
    );

    return [];
  }

  return [];
};


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


const getMenuCode = (row = {}) =>
  row.menuCode ??
  row.MENU_CODE ??
  row.menu_code ??
  row.code ??
  "";


const getMenuName = (row = {}) =>
  row.menuName ??
  row.MENU_NAME ??
  row.menu_name ??
  row.name ??
  "";


const getModuleName = (row = {}) =>
  row.moduleName ??
  row.MODULE_NAME ??
  row.module ??
  row.MODULE ??
  "";


const getSubMenu = (row = {}) =>
  row.subMenu ??
  row.SUB_MENU ??
  row.sub_menu ??
  row.submenu ??
  "";


/*
|--------------------------------------------------------------------------
| Convert API row to permission
|--------------------------------------------------------------------------
|
| Expected GetUserMenuAccess result:
|
| {
|   selectedMenu: 1,
|   permissionType: "FULL" | "READ",
|   userCode: "AGA",
|   moduleName: "...",
|   subMenu: "...",
|   menuCode: "...",
|   menuName: "..."
| }
|
*/
const permissionFromType =
  (
    selected,
    permissionType
  ) => {
    if (!selected) {
      return {
        ...DEFAULT_PERMISSIONS,
      };
    }

    const type =
      String(
        permissionType ||
          "FULL"
      ).toUpperCase();

    if (
      type === "READ"
    ) {
      return {
        access: true,
        fullAccess: false,
        readOnly: true,
      };
    }

    return {
      access: true,
      fullAccess: true,
      readOnly: false,
    };
  };


const permissionLabel =
  (permission) => {
    if (
      !permission?.access
    ) {
      return "No Access";
    }

    if (
      permission?.fullAccess
    ) {
      return "Full Access";
    }

    if (
      permission?.readOnly
    ) {
      return "Read Only";
    }

    return "No Access";
  };


/* ============================================================
   Permission toggle
   No Access -> Read Only -> Full Access -> No Access
   ============================================================ */

const AccessToggleButton = ({
  permission,
  onCycle,
}) => {
  const state =
    !permission?.access
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
        title={`Click to cycle: No Access → Read Only → Full Access. Current: ${labels[state]}`}
        onClick={(
          event
        ) => {
          event.stopPropagation();

          onCycle(
            state
          );
        }}
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all min-w-[86px] justify-center ${styles[state]}`}
      >
        {state ===
          "full" && (
          <FontAwesomeIcon
            icon={
              faLockOpen
            }
            className="text-[10px]"
          />
        )}

        {state ===
          "read" && (
          <FontAwesomeIcon
            icon={faEye}
            className="text-[10px]"
          />
        )}

        {labels[state]}
      </button>
    </div>
  );
};


/* ============================================================
   ModuleAccessTab
   USER-BASED, no roles
   ============================================================ */

const ModuleAccessTab =
  forwardRef(
    (
      {
        users = [],
        tableSize = "Half",
        setSaving: setParentSaving,
      },
      ref
    ) => {

      const [
        selectedUsers,
        setSelectedUsers,
      ] = useState([]);

      const [
        menus,
        setMenus,
      ] = useState([]);

      const [
        permissionMap,
        setPermissionMap,
      ] = useState({});

      const [
        showMenus,
        setShowMenus,
      ] = useState(false);

      const [
        loadingMenus,
        setLoadingMenus,
      ] = useState(false);

      const [
        saving,
        setSaving,
      ] = useState(false);

      const [
        mobileStep,
        setMobileStep,
      ] = useState("users");

      const [
        tableFilter,
        setTableFilter,
      ] = useState(null);


      /* ========================================================
         Derived data
         ======================================================== */

      const normalizedUsers =
        useMemo(
          () =>
            (
              Array.isArray(
                users
              )
                ? users
                : []
            )
              .map(
                (
                  row,
                  index
                ) => ({
                  ...row,
                  userCode:
                    getUserCode(
                      row
                    ),
                  userName:
                    getUserName(
                      row
                    ),
                  __idx:
                    index,
                })
              )
              .filter(
                (row) =>
                  row.userCode
              ),
          [users]
        );


      const selectedUserDetails =
        useMemo(
          () =>
            normalizedUsers.filter(
              (row) =>
                selectedUsers.includes(
                  row.userCode
                )
            ),
          [
            normalizedUsers,
            selectedUsers,
          ]
        );


      const normalizedMenus =
        useMemo(
          () =>
            (
              Array.isArray(
                menus
              )
                ? menus
                : []
            ).map(
              (
                row,
                index
              ) => ({
                ...row,
                __idx:
                  index,
                menuCode:
                  getMenuCode(
                    row
                  ),
                menuName:
                  getMenuName(
                    row
                  ),
                moduleName:
                  getModuleName(
                    row
                  ),
                subMenu:
                  getSubMenu(
                    row
                  ),
              })
            ),
          [menus]
        );


      const selectedMenuCount =
        useMemo(
          () =>
            Object.values(
              permissionMap
            ).filter(
              (permission) =>
                permission?.access
            ).length,
          [permissionMap]
        );


      const fullAccessCount =
        useMemo(
          () =>
            Object.values(
              permissionMap
            ).filter(
              (permission) =>
                permission?.fullAccess
            ).length,
          [permissionMap]
        );


      const readOnlyCount =
        useMemo(
          () =>
            Object.values(
              permissionMap
            ).filter(
              (permission) =>
                permission?.readOnly
            ).length,
          [permissionMap]
        );


      const fullAccessMenus =
        useMemo(
          () =>
            normalizedMenus.filter(
              (menu) =>
                permissionMap[
                  menu.menuCode
                ]?.fullAccess
            ),
          [
            normalizedMenus,
            permissionMap,
          ]
        );


      const readOnlyMenus =
        useMemo(
          () =>
            normalizedMenus.filter(
              (menu) =>
                permissionMap[
                  menu.menuCode
                ]?.readOnly
            ),
          [
            normalizedMenus,
            permissionMap,
          ]
        );


      const filteredMenus =
        useMemo(() => {
          if (
            tableFilter ===
            "FULL"
          ) {
            return fullAccessMenus;
          }

          if (
            tableFilter ===
            "READ"
          ) {
            return readOnlyMenus;
          }

          return normalizedMenus;
        }, [
          tableFilter,
          normalizedMenus,
          fullAccessMenus,
          readOnlyMenus,
        ]);


      const allMenuCodes =
        useMemo(
          () =>
            normalizedMenus
              .map(
                (menu) =>
                  menu.menuCode
              )
              .filter(
                Boolean
              ),
          [normalizedMenus]
        );


      const allMenusSelected =
        allMenuCodes.length >
          0 &&
        allMenuCodes.every(
          (menuCode) =>
            permissionMap[
              menuCode
            ]?.access
        );


      const allUserCodes =
        useMemo(
          () =>
            normalizedUsers.map(
              (user) =>
                user.userCode
            ),
          [normalizedUsers]
        );


      const allUsersSelected =
        allUserCodes.length >
          0 &&
        selectedUsers.length ===
          allUserCodes.length;


      const getPermission =
        useCallback(
          (menuCode) =>
            permissionMap[
              menuCode
            ] ||
            DEFAULT_PERMISSIONS,
          [permissionMap]
        );


      /* ========================================================
         User selection
         ======================================================== */

      const toggleUser =
        useCallback(
          (userCode) => {
            if (
              showMenus
            ) {
              return;
            }

            setSelectedUsers(
              (previous) =>
                previous.includes(
                  userCode
                )
                  ? previous.filter(
                      (code) =>
                        code !==
                        userCode
                    )
                  : [
                      ...previous,
                      userCode,
                    ]
            );
          },
          [showMenus]
        );


      const toggleSelectAllUsers =
        useCallback(() => {
          if (
            showMenus
          ) {
            return;
          }

          setSelectedUsers(
            (previous) =>
              previous.length ===
              allUserCodes.length
                ? []
                : [
                    ...allUserCodes,
                  ]
          );
        }, [
          showMenus,
          allUserCodes,
        ]);


      /* ========================================================
         Load menu access for selected users
         ======================================================== */

      const loadUserMenus =
        useCallback(
          async (
            userCodes
          ) => {
            setLoadingMenus(
              true
            );

            setShowMenus(
              false
            );

            setMenus([]);
            setPermissionMap(
              {}
            );

            setTableFilter(
              null
            );

            try {
              if (
                !Array.isArray(
                  userCodes
                ) ||
                userCodes.length ===
                  0
              ) {
                await useSwalErrorAlert(
                  "No User Selected",
                  "Please select at least one user to continue."
                );

                return;
              }


              /*
              |--------------------------------------------------------------------------
              | Expected API
              |--------------------------------------------------------------------------
              |
              | POST /getUserMenuAccess
              |
              | {
              |   json_data: {
              |     dt2: [
              |       { userCode: "AGA" },
              |       { userCode: "CALVIN" }
              |     ]
              |   }
              | }
              |
              | The backend should return ALL HS_MENU rows plus the actual
              | USER_CODE / selectedMenu / permissionType values.
              |
              */
              const { data } =
                await apiClient.post(
                  "/getUserMenuAccess",
                  {
                    json_data: {
                      dt2:
                        userCodes.map(
                          (
                            userCode
                          ) => ({
                            userCode,
                          })
                        ),
                    },
                  }
                );


              const rawMenus =
                Array.isArray(
                  data?.data
                    ?.menus
                )
                  ? data.data
                      .menus
                  : normalizeRows(
                      data
                    );


              const menuMap =
                new Map();


              /*
              |--------------------------------------------------------------------------
              | Multiple-user logic
              |--------------------------------------------------------------------------
              |
              | For each menu:
              |
              | - FULL is shown only when ALL selected users have FULL.
              | - READ is shown only when ALL selected users have access
              |   and at least one is READ.
              | - Otherwise it initially shows No Access.
              |
              | Saving applies the final matrix equally to every selected user.
              |
              */
              rawMenus.forEach(
                (row) => {
                  const menuCode =
                    getMenuCode(
                      row
                    );

                  if (
                    !menuCode
                  ) {
                    return;
                  }


                  if (
                    !menuMap.has(
                      menuCode
                    )
                  ) {
                    menuMap.set(
                      menuCode,
                      {
                        ...row,
                        menuCode,
                        menuName:
                          getMenuName(
                            row
                          ),
                        moduleName:
                          getModuleName(
                            row
                          ),
                        subMenu:
                          getSubMenu(
                            row
                          ),
                        accessByUser:
                          new Map(),
                      }
                    );
                  }


                  const entry =
                    menuMap.get(
                      menuCode
                    );

                  const rowUserCode =
                    String(
                      row.userCode ??
                        row.USER_CODE ??
                        row.user_code ??
                        ""
                    )
                      .trim()
                      .toUpperCase();


                  if (
                    rowUserCode
                  ) {
                    entry.accessByUser.set(
                      rowUserCode,
                      {
                        selected:
                          truthy(
                            row.selectedMenu ??
                              row.SELECTED_MENU ??
                              row.selected_menu
                          ),
                        permissionType:
                          String(
                            row.permissionType ??
                              row.PERMISSION_TYPE ??
                              row.permission_type ??
                              "FULL"
                          ).toUpperCase(),
                      }
                    );
                  }
                }
              );


              const normalized =
                Array.from(
                  menuMap.values()
                );


              const nextPermissionMap =
                {};


              normalized.forEach(
                (menu) => {
                  const states =
                    userCodes.map(
                      (
                        userCode
                      ) => {
                        const key =
                          String(
                            userCode
                          )
                            .trim()
                            .toUpperCase();

                        return (
                          menu.accessByUser.get(
                            key
                          ) || {
                            selected:
                              false,
                            permissionType:
                              "FULL",
                          }
                        );
                      }
                    );


                  const allHaveAccess =
                    states.every(
                      (state) =>
                        state.selected
                    );


                  if (
                    !allHaveAccess
                  ) {
                    nextPermissionMap[
                      menu.menuCode
                    ] = {
                      ...DEFAULT_PERMISSIONS,
                    };

                    return;
                  }


                  const allFull =
                    states.every(
                      (state) =>
                        state.permissionType ===
                        "FULL"
                    );


                  nextPermissionMap[
                    menu.menuCode
                  ] =
                    permissionFromType(
                      true,
                      allFull
                        ? "FULL"
                        : "READ"
                    );
                }
              );


              setMenus(
                normalized.map(
                  (menu) => {
                    const {
                      accessByUser,
                      ...rest
                    } = menu;

                    return rest;
                  }
                )
              );

              setPermissionMap(
                nextPermissionMap
              );

              setShowMenus(
                true
              );

              setMobileStep(
                "menus"
              );
            } catch (error) {
              console.error(
                "getUserMenuAccess failed:",
                error
              );

              const detail =
                error
                  ?.response
                  ?.data
                  ?.message ||
                error
                  ?.response
                  ?.data
                  ?.error ||
                error
                  ?.message ||
                "Unable to load module access for the selected user(s).";

              await useSwalErrorAlert(
                "Error",
                detail
              );
            } finally {
              setLoadingMenus(
                false
              );
            }
          },
          []
        );


      const handleViewMenus =
        useCallback(
          async () => {
            if (
              selectedUsers.length ===
              0
            ) {
              await useSwalErrorAlert(
                "No User Selected",
                "Please select at least one user to continue."
              );

              return;
            }

            await loadUserMenus(
              selectedUsers
            );
          },
          [
            selectedUsers,
            loadUserMenus,
          ]
        );


      /* ========================================================
         Permission updates
         ======================================================== */

      const applyPermissionPreset =
        useCallback(
          (
            menuCode,
            preset
          ) => {
            if (
              !menuCode
            ) {
              return;
            }

            setPermissionMap(
              (previous) => ({
                ...previous,

                [menuCode]:
                  preset ===
                  "FULL"
                    ? {
                        access:
                          true,
                        fullAccess:
                          true,
                        readOnly:
                          false,
                      }
                    : preset ===
                      "READ"
                    ? {
                        access:
                          true,
                        fullAccess:
                          false,
                        readOnly:
                          true,
                      }
                    : {
                        ...DEFAULT_PERMISSIONS,
                      },
              })
            );
          },
          []
        );


      const toggleSelectAllMenus =
        useCallback(() => {
          setPermissionMap(
            (previous) => {
              const next = {
                ...previous,
              };

              if (
                allMenusSelected
              ) {
                allMenuCodes.forEach(
                  (
                    menuCode
                  ) => {
                    next[
                      menuCode
                    ] = {
                      ...DEFAULT_PERMISSIONS,
                    };
                  }
                );
              } else {
                allMenuCodes.forEach(
                  (
                    menuCode
                  ) => {
                    next[
                      menuCode
                    ] = {
                      access:
                        true,
                      fullAccess:
                        true,
                      readOnly:
                        false,
                    };
                  }
                );
              }

              return next;
            }
          );
        }, [
          allMenuCodes,
          allMenusSelected,
        ]);


      const applyBulkPreset =
        useCallback(
          (preset) => {
            setPermissionMap(
              (previous) => {
                const next = {
                  ...previous,
                };

                allMenuCodes.forEach(
                  (
                    menuCode
                  ) => {
                    next[
                      menuCode
                    ] =
                      preset ===
                      "FULL"
                        ? {
                            access:
                              true,
                            fullAccess:
                              true,
                            readOnly:
                              false,
                          }
                        : {
                            access:
                              true,
                            fullAccess:
                              false,
                            readOnly:
                              true,
                          };
                  }
                );

                return next;
              }
            );
          },
          [allMenuCodes]
        );


      /* ========================================================
         Save USER-BASED access
         ======================================================== */

      const handleSaveAccess =
        useCallback(
          async () => {
            if (
              selectedUsers.length ===
              0
            ) {
              await useSwalErrorAlert(
                "No User Selected",
                "Select at least one user, then click Save."
              );

              return;
            }


            if (
              !showMenus
            ) {
              await useSwalErrorAlert(
                "Nothing to Save",
                "Click View Modules first, then modify and save."
              );

              return;
            }


            /*
            |--------------------------------------------------------------------------
            | dt1 = all granted menus and their permission type
            |--------------------------------------------------------------------------
            */
            const dt1 =
              normalizedMenus
                .filter(
                  (menu) =>
                    permissionMap[
                      menu
                        .menuCode
                    ]?.access
                )
                .map(
                  (menu) => {
                    const permission =
                      permissionMap[
                        menu
                          .menuCode
                      ] ||
                      DEFAULT_PERMISSIONS;

                    return {
                      menuCode:
                        menu.menuCode,

                      permissionType:
                        permission.fullAccess
                          ? "FULL"
                          : "READ",
                    };
                  }
                );


            /*
            |--------------------------------------------------------------------------
            | dt2 = selected users
            |--------------------------------------------------------------------------
            */
            const dt2 =
              selectedUsers.map(
                (
                  userCode
                ) => ({
                  userCode,
                })
              );


            setSaving(true);
            setParentSaving?.(
              true
            );


            try {
              const payload = {
                json_data: {
                  dt1,
                  dt2,
                },
              };


              /*
              |--------------------------------------------------------------------------
              | Expected API
              |--------------------------------------------------------------------------
              |
              | POST /upsertUserMenuAccess
              |
              | This replaces menu access for every selected user.
              |
              */
              const { data: response } =
                await apiClient.post(
                  "/upsertUserMenuAccess",
                  payload
                );


              const ok =
                response?.success ===
                  true ||
                response?.data
                  ?.status ===
                  "success" ||
                response?.message
                  ?.toLowerCase?.()
                  .includes(
                    "saved"
                  ) ||
                response?.errorcount ===
                  0;


              if (!ok) {
                throw new Error(
                  response
                    ?.message ||
                    "Error executing User Menu Access Upsert."
                );
              }


              await useSwalSuccessAlert(
                "Saved!",
                `Access rights have been updated for ${selectedUsers.length} user(s).`
              );


              await loadUserMenus(
                selectedUsers
              );
            } catch (error) {
              console.error(
                "upsertUserMenuAccess failed:",
                error
              );

              const detail =
                error
                  ?.response
                  ?.data
                  ?.message ||
                error
                  ?.response
                  ?.data
                  ?.error ||
                error
                  ?.message ||
                "Error executing User Menu Access Upsert.";


              await useSwalErrorAlert(
                "Save Failed",
                detail
              );
            } finally {
              setSaving(
                false
              );

              setParentSaving?.(
                false
              );
            }
          },
          [
            selectedUsers,
            showMenus,
            normalizedMenus,
            permissionMap,
            loadUserMenus,
            setParentSaving,
          ]
        );


      /* ========================================================
         Reset
         ======================================================== */

      const handleReset =
        useCallback(() => {
          setSelectedUsers(
            []
          );

          setMenus([]);
          setPermissionMap(
            {}
          );

          setShowMenus(
            false
          );

          setMobileStep(
            "users"
          );

          setTableFilter(
            null
          );
        }, []);


      /* ========================================================
         Expose methods to UserAccessRights.jsx
         ======================================================== */

      useImperativeHandle(
        ref,
        () => ({
          viewModules:
            handleViewMenus,

          save:
            handleSaveAccess,

          saveAccess:
            handleSaveAccess,

          reset:
            handleReset,

          getExportData:
            () => {
              const rows =
                normalizedMenus.map(
                  (menu) => {
                    const permission =
                      permissionMap[
                        menu
                          .menuCode
                      ] ||
                      DEFAULT_PERMISSIONS;

                    return {
                      users:
                        selectedUsers.join(
                          ", "
                        ),

                      moduleName:
                        menu.moduleName ||
                        "",

                      subMenu:
                        menu.subMenu ||
                        "",

                      menuCode:
                        menu.menuCode ||
                        "",

                      menuName:
                        menu.menuName ||
                        "",

                      permission:
                        permissionLabel(
                          permission
                        ),
                    };
                  }
                );

              return {
                fileName:
                  "User Access Rights",

                rows,

                columns: [
                  {
                    key: "users",
                    label:
                      "Users",
                  },
                  {
                    key: "moduleName",
                    label:
                      "Module",
                  },
                  {
                    key: "subMenu",
                    label:
                      "Sub Menu",
                  },
                  {
                    key: "menuCode",
                    label:
                      "Menu Code",
                  },
                  {
                    key: "menuName",
                    label:
                      "Menu Name",
                  },
                  {
                    key: "permission",
                    label:
                      "Permission",
                  },
                ],
              };
            },
        })
      );


      /* ========================================================
         User columns
         ======================================================== */

      const userColumns =
        useMemo(
          () => [
            {
              key: "__select",
              label:
                "Select",
              sortable:
                false,
              filterable:
                false,
              width: 90,

              render:
                (row) => {
                  const userCode =
                    row.userCode;

                  const isSelected =
                    selectedUsers.includes(
                      userCode
                    );

                  return (
                    <div className="flex justify-center py-0.5">
                      <input
                        type="checkbox"
                        checked={
                          isSelected
                        }
                        disabled={
                          showMenus
                        }
                        onChange={(
                          event
                        ) => {
                          event.stopPropagation();

                          toggleUser(
                            userCode
                          );
                        }}
                        onClick={(
                          event
                        ) =>
                          event.stopPropagation()
                        }
                        className="h-4 w-4 cursor-pointer accent-blue-600 rounded disabled:cursor-not-allowed"
                      />
                    </div>
                  );
                },
            },

            {
              key: "userCode",
              label:
                "User Code",
              sortable:
                true,
              width: 160,
            },

            {
              key: "userName",
              label:
                "Username",
              sortable:
                true,
              width: 260,
            },
          ],
          [
            selectedUsers,
            showMenus,
            toggleUser,
          ]
        );


      /* ========================================================
         Menu columns
         ======================================================== */

      const menuColumns =
        useMemo(
          () => [
            {
              key: "__access",
              label:
                "Permission",
              sortable:
                false,
              filterable:
                false,
              width: 130,

              render:
                (row) => {
                  const permission =
                    getPermission(
                      row.menuCode
                    );

                  const handleCycle =
                    (
                      currentState
                    ) => {
                      if (
                        currentState ===
                        "none"
                      ) {
                        applyPermissionPreset(
                          row.menuCode,
                          "READ"
                        );
                      } else if (
                        currentState ===
                        "read"
                      ) {
                        applyPermissionPreset(
                          row.menuCode,
                          "FULL"
                        );
                      } else {
                        applyPermissionPreset(
                          row.menuCode,
                          "NONE"
                        );
                      }
                    };

                  return (
                    <AccessToggleButton
                      permission={
                        permission
                      }
                      onCycle={
                        handleCycle
                      }
                    />
                  );
                },
            },

            {
              key: "moduleName",
              label:
                "Module",
              sortable:
                true,
              width: 180,
            },

            {
              key: "subMenu",
              label:
                "Sub Menu",
              sortable:
                true,
              width: 190,
            },

            {
              key: "menuCode",
              label:
                "Menu Code",
              sortable:
                true,
              width: 120,
            },

            {
              key: "menuName",
              label:
                "Menu Name",
              sortable:
                true,
              width: 300,
            },
          ],
          [
            getPermission,
            applyPermissionPreset,
          ]
        );


      /* ========================================================
         Render
         ======================================================== */

      return (
        <div className="w-full md:pt-10">

          {/* MOBILE BACK */}
          <div className="md:hidden mb-3">
            {mobileStep ===
              "menus" && (
              <button
                type="button"
                onClick={() =>
                  setMobileStep(
                    "users"
                  )
                }
                className="text-blue-600 text-sm font-medium flex items-center gap-2"
              >
                <FontAwesomeIcon
                  icon={
                    faArrowLeft
                  }
                />
                Back to Users
              </button>
            )}
          </div>


          <div className="flex flex-col md:flex-row md:items-stretch gap-4">


            {/* ==================================================
                USERS
                ================================================== */}
            <div
              className={`w-full md:w-[35%] ${
                mobileStep ===
                "users"
                  ? "block"
                  : "hidden md:block"
              }`}
            >
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 h-full flex flex-col">

                <div className="flex items-center justify-between mb-3 gap-2">

                  <div>
                    <h2 className="text-lg font-semibold text-gray-800">
                      Users
                    </h2>

                    <p className="text-xs text-gray-500">
                      Select one or more users, then configure their access.
                    </p>
                  </div>


                  <div className="flex flex-col items-end gap-1">

                    <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                      {
                        selectedUsers.length
                      }{" "}
                      selected
                    </span>

                    <button
                      type="button"
                      onClick={
                        toggleSelectAllUsers
                      }
                      disabled={
                        showMenus ||
                        allUserCodes.length ===
                          0
                      }
                      className="text-[10px] text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                    >
                      {allUsersSelected
                        ? "Unselect All"
                        : "Select All"}
                    </button>

                  </div>
                </div>


                <div className="flex-1 min-h-0">
                  <SearchGlobalReferenceTable
                    docType="UserAccRight"
                    columns={
                      userColumns
                    }
                    data={
                      normalizedUsers
                    }
                    isLoading={
                      false
                    }
                    itemsPerPage={
                      10
                    }
                    showFilters={
                      true
                    }
                    onRowDoubleClick={(
                      row
                    ) =>
                      toggleUser(
                        row.userCode
                      )
                    }
                    onRowClick={(
                      row
                    ) =>
                      toggleUser(
                        row.userCode
                      )
                    }
                    mobileSelectable={
                      true
                    }
                    selectedRowChecker={(
                      row
                    ) =>
                      selectedUsers.includes(
                        row.userCode
                      )
                    }
                    tableSize={
                      tableSize
                    }
                    className="h-full"
                  />
                </div>

              </div>
            </div>


            {/* ==================================================
                ACCESS MATRIX
                ================================================== */}
            <div
              className={`w-full md:w-[65%] ${
                mobileStep ===
                "menus"
                  ? "block"
                  : "hidden md:block"
              }`}
            >
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 h-full flex flex-col">

                <div className="flex flex-col gap-3 mb-3">

                  <div className="flex flex-col gap-2">

                    <div>
                      <h2 className="text-lg font-semibold text-gray-800">
                        User Access Matrix
                      </h2>

                      <p className="text-xs text-gray-500">
                        Access is assigned directly to the selected user(s). Master Data and Reports are included because this matrix is built from HS_MENU.
                      </p>
                    </div>


                    {!showMenus && (
                      <button
                        type="button"
                        onClick={
                          handleViewMenus
                        }
                        disabled={
                          selectedUsers.length ===
                          0
                        }
                        className="self-start inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-[11px] font-medium hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <FontAwesomeIcon
                          icon={
                            faEye
                          }
                        />
                        View Modules
                      </button>
                    )}


                    {showMenus && (
                      <div className="grid grid-cols-3 gap-1.5">

                        <button
                          type="button"
                          onClick={
                            toggleSelectAllMenus
                          }
                          className="inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-[11px] font-medium hover:bg-blue-100 transition-colors"
                        >
                          <FontAwesomeIcon
                            icon={
                              allMenusSelected
                                ? faSquare
                                : faCheckSquare
                            }
                            className="shrink-0"
                          />

                          <span className="truncate">
                            {allMenusSelected
                              ? "Unselect All"
                              : "Select All"}
                          </span>
                        </button>


                        <button
                          type="button"
                          onClick={() =>
                            applyBulkPreset(
                              "FULL"
                            )
                          }
                          className="inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-[11px] font-medium hover:bg-blue-100 transition-colors"
                        >
                          <FontAwesomeIcon
                            icon={
                              faLockOpen
                            }
                            className="shrink-0"
                          />
                          <span className="truncate">
                            All Full
                          </span>
                        </button>


                        <button
                          type="button"
                          onClick={() =>
                            applyBulkPreset(
                              "READ"
                            )
                          }
                          className="inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 text-[11px] font-medium hover:bg-amber-100 transition-colors"
                        >
                          <FontAwesomeIcon
                            icon={
                              faEye
                            }
                            className="shrink-0"
                          />
                          <span className="truncate">
                            All Read
                          </span>
                        </button>

                      </div>
                    )}
                  </div>


                  {showMenus && (
                    <>
                      {/* SUMMARY */}
                      <div className="grid grid-cols-3 gap-2">

                        <div
                          onClick={() =>
                            setTableFilter(
                              null
                            )
                          }
                          className={`rounded-xl border p-2 transition-all ${
                            tableFilter ===
                            null
                              ? "border-gray-400 bg-gray-100 ring-2 ring-gray-300"
                              : "border-gray-100 bg-gray-50 hover:border-gray-300 hover:bg-gray-100 cursor-pointer"
                          }`}
                        >
                          <p className="text-[9px] uppercase tracking-wide text-gray-500 font-semibold leading-tight">
                            Total Menus
                          </p>

                          <p className="text-base font-bold text-gray-800">
                            {
                              normalizedMenus.length
                            }
                          </p>
                        </div>


                        <div
                          onClick={() =>
                            setTableFilter(
                              tableFilter ===
                                "FULL"
                                ? null
                                : "FULL"
                            )
                          }
                          className={`rounded-xl border p-2 transition-all cursor-pointer ${
                            tableFilter ===
                            "FULL"
                              ? "border-blue-400 bg-blue-100 ring-2 ring-blue-300"
                              : "border-blue-100 bg-blue-50 hover:border-blue-300 hover:bg-blue-100"
                          }`}
                        >
                          <p className="text-[9px] uppercase tracking-wide text-blue-600 font-semibold leading-tight">
                            Full Access
                          </p>

                          <p className="text-base font-bold text-blue-700">
                            {
                              fullAccessCount
                            }
                          </p>
                        </div>


                        <div
                          onClick={() =>
                            setTableFilter(
                              tableFilter ===
                                "READ"
                                ? null
                                : "READ"
                            )
                          }
                          className={`rounded-xl border p-2 transition-all cursor-pointer ${
                            tableFilter ===
                            "READ"
                              ? "border-amber-400 bg-amber-100 ring-2 ring-amber-300"
                              : "border-amber-100 bg-amber-50 hover:border-amber-300 hover:bg-amber-100"
                          }`}
                        >
                          <p className="text-[9px] uppercase tracking-wide text-amber-600 font-semibold leading-tight">
                            Read Only
                          </p>

                          <p className="text-base font-bold text-amber-700">
                            {
                              readOnlyCount
                            }
                          </p>
                        </div>

                      </div>


                      {/* SELECTED USERS */}
                      <div className="inline-flex max-w-full items-center gap-2 rounded-md border border-blue-100 bg-blue-50 px-3 py-2">

                        <FontAwesomeIcon
                          icon={
                            faUserShield
                          }
                          className="text-blue-600 text-sm shrink-0"
                        />

                        <div className="flex items-center gap-2 min-w-0 flex-wrap">

                          <span className="text-[10px] font-semibold uppercase tracking-wide text-blue-700 shrink-0">
                            Selected User
                            {selectedUserDetails.length !==
                            1
                              ? "s"
                              : ""}
                          </span>


                          {selectedUserDetails.length ===
                          0 ? (
                            <span className="text-xs text-gray-500">
                              None
                            </span>
                          ) : selectedUserDetails.length ===
                            1 ? (
                            <span className="inline-flex items-center rounded-full border border-blue-200 bg-white px-2 py-0.5 text-xs font-medium text-blue-800 max-w-[280px] truncate">
                              {
                                selectedUserDetails[0]
                                  .userCode
                              }{" "}
                              -{" "}
                              {
                                selectedUserDetails[0]
                                  .userName
                              }
                            </span>
                          ) : (
                            <>
                              <span className="inline-flex items-center rounded-full border border-blue-200 bg-white px-2 py-0.5 text-xs font-medium text-blue-800">
                                {
                                  selectedUserDetails.length
                                }{" "}
                                users
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
                                      key={
                                        user.userCode
                                      }
                                      className="inline-flex items-center rounded-full border border-blue-200 bg-white px-2 py-0.5 text-[11px] text-blue-700"
                                    >
                                      {
                                        user.userCode
                                      }
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
                    </>
                  )}
                </div>


                {showMenus ? (
                  <div className="flex-1 min-h-0 flex flex-col gap-2">

                    <div className="flex-1 min-h-0">
                      <SearchGlobalReferenceTable
                        docType="UserAccRight"
                        columns={
                          menuColumns
                        }
                        data={
                          filteredMenus
                        }
                        isLoading={
                          loadingMenus
                        }
                        itemsPerPage={
                          50
                        }
                        showFilters={
                          true
                        }
                        onRowDoubleClick={() => {}}
                        onRowClick={() => {}}
                        mobileSelectable={
                          true
                        }
                        selectedRowChecker={(
                          row
                        ) =>
                          getPermission(
                            row.menuCode
                          ).access
                        }
                        tableSize={
                          tableSize
                        }
                        className="h-full"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="h-full min-h-[320px] flex items-center justify-center text-center text-gray-500 bg-gray-50 rounded-xl border border-gray-200">

                    <div>
                      <FontAwesomeIcon
                        icon={
                          faList
                        }
                        className="text-xl mb-2 text-gray-400"
                      />

                      <h3 className="font-medium text-sm mb-1">
                        Access Matrix Hidden
                      </h3>

                      <p className="text-xs px-4">
                        Select user(s) and click "View Modules" to configure their access rights.
                      </p>
                    </div>

                  </div>
                )}
              </div>
            </div>
          </div>


          {selectedUsers.length >
            0 && (
            <div className="mt-3 bg-blue-50 p-2 rounded text-xs text-blue-800">
              {showMenus
                ? `Configuring access for ${selectedUsers.length} selected user(s).`
                : `${selectedUsers.length} user(s) selected. Click View Modules to continue.`}
            </div>
          )}


          {showMenus &&
            selectedMenuCount >
              0 && (
              <div className="mt-2 bg-green-50 p-2 rounded text-xs text-green-800">
                {`${selectedMenuCount} menu(s) granted access.`}
              </div>
            )}


          {(saving ||
            loadingMenus) && (
            <LoadingSpinner />
          )}
        </div>
      );
    }
  );


export default ModuleAccessTab;
