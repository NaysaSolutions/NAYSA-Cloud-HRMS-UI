import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSave,
  faUndo,
  faBuilding,
  faUsers,
  faShield,
  faArrowLeft,
} from "@fortawesome/free-solid-svg-icons";

import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

import BranchAccessTab from "./UserAccessRightsTabs/BranchAccessTab";
import PaygroupAccessTab from "./UserAccessRightsTabs/PaygroupAccessTab";
import ModuleAccessTab from "./UserAccessRightsTabs/ModuleAccessTab";


const getUserType = (row = {}) =>
  String(
    row.userType ??
      row.USER_TYPE ??
      row.user_type ??
      ""
  )
    .trim()
    .toUpperCase();


const isRegularUser = (row = {}) => {
  const type = getUserType(row);

  return (
    [
      "REGULAR",
      "REGULAR USER",
      "REG",
      "R",
      "USER",
    ].includes(type) ||
    type.includes("REGULAR")
  );
};


const UserAccessRights = () => {
  const branchRef = useRef(null);
  const paygroupRef = useRef(null);
  const moduleRef = useRef(null);

  const [activeTab, setActiveTab] =
    useState("branch");

  const [
    showMobileMenu,
    setShowMobileMenu,
  ] = useState(true);

  const [users, setUsers] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const tableSize = "Half";


  /*
  |--------------------------------------------------------------------------
  | Access-rights tabs
  |--------------------------------------------------------------------------
  |
  | Master Data Access and Report Access are intentionally NOT separate
  | tabs. They are included under Module Access because ModuleAccessTab
  | works directly against HS_MENU.
  |
  */
  const tabs = useMemo(
    () => [
      {
        id: "branch",
        label: "Branch Access",
        icon: faBuilding,
      },
      {
        id: "paygroup",
        label: "Paygroup Access",
        icon: faUsers,
      },
      {
        id: "module",
        label: "Module Access",
        icon: faShield,
      },
    ],
    []
  );


  /*
  |--------------------------------------------------------------------------
  | Load configurable users
  |--------------------------------------------------------------------------
  |
  | Only Regular Users need configurable access rights.
  | System/Management/Security users use predefined access rules.
  |
  */
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

        const raw =
          data?.data?.[0]?.result;

        const rows =
          typeof raw === "string"
            ? JSON.parse(
                raw || "[]"
              )
            : Array.isArray(raw)
            ? raw
            : [];

        setUsers(
          rows.filter(
            (row) =>
              (row.userCode ||
                row.USER_CODE) &&
              isRegularUser(row)
          )
        );
      } catch (error) {
        console.error(
          "fetchUsers failed:",
          error
        );

        setUsers([]);
      } finally {
        setLoading(false);
      }
    }, []);


  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);


  const activeRef =
    activeTab === "branch"
      ? branchRef
      : activeTab === "paygroup"
      ? paygroupRef
      : moduleRef;


  const save = () =>
    activeRef.current?.save?.();


  const reset = () =>
    activeRef.current?.reset?.();


  const renderContent = () => {
    if (
      activeTab === "branch"
    ) {
      return (
        <BranchAccessTab
          ref={branchRef}
          users={users}
          tableSize={
            tableSize
          }
          setSaving={
            setSaving
          }
        />
      );
    }

    if (
      activeTab ===
      "paygroup"
    ) {
      return (
        <PaygroupAccessTab
          ref={
            paygroupRef
          }
          users={users}
          tableSize={
            tableSize
          }
          setSaving={
            setSaving
          }
        />
      );
    }

    return (
      <ModuleAccessTab
        ref={moduleRef}
        users={users}
        tableSize={
          tableSize
        }
        setSaving={
          setSaving
        }
      />
    );
  };


  const primaryBtn =
    "flex items-center justify-center h-7 sm:px-3 text-[10px] font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed";


  return (
    <div className="global-ref-main-div-ui">
      {(loading ||
        saving) && (
        <LoadingSpinner />
      )}


      {/* ======================================================
          MOBILE
          ====================================================== */}
      <div className="md:hidden pt-[30px]">
        <AnimatePresence
          mode="wait"
          initial={false}
        >
          {showMobileMenu ? (
            <motion.div
              key="mobile-menu"
              initial={{
                opacity: 0,
                x: -18,
              }}
              animate={{
                opacity: 1,
                x: 0,
              }}
              exit={{
                opacity: 0,
                x: 18,
              }}
              className="bg-white"
            >
              <div className="bg-blue-50 border-b border-blue-100 px-4 py-4">
                <h2 className="font-bold text-base text-blue-800 uppercase">
                  User Access Rights
                </h2>

                <p className="text-[11px] text-blue-600 mt-1">
                  Access is maintained directly by user. Master Data and Reports are included in Module Access.
                </p>
              </div>

              {tabs.map(
                (tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(
                        tab.id
                      );

                      setShowMobileMenu(
                        false
                      );
                    }}
                    className="w-full flex items-center gap-3 px-5 py-6 text-left text-sm border-b border-gray-200 bg-white hover:bg-blue-50"
                  >
                    <span className="text-blue-600 w-5 flex justify-center">
                      <FontAwesomeIcon
                        icon={
                          tab.icon
                        }
                      />
                    </span>

                    <span className="font-medium text-gray-900">
                      {tab.label}
                    </span>
                  </button>
                )
              )}
            </motion.div>
          ) : (
            <motion.div
              key={
                activeTab
              }
              initial={{
                opacity: 0,
                x: 18,
              }}
              animate={{
                opacity: 1,
                x: 0,
              }}
              className="min-h-screen bg-white"
            >
              <div className="sticky top-0 z-30 bg-blue-50 border-b px-4 py-3">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() =>
                      setShowMobileMenu(
                        true
                      )
                    }
                    className="text-blue-600 text-sm font-medium flex items-center gap-2"
                  >
                    <FontAwesomeIcon
                      icon={
                        faArrowLeft
                      }
                    />
                    Back
                  </button>

                  <div className="text-sm font-bold text-blue-800">
                    {
                      tabs.find(
                        (tab) =>
                          tab.id ===
                          activeTab
                      )?.label
                    }
                  </div>

                  <div className="w-[48px]" />
                </div>

                <div className="flex justify-center gap-2 mt-3">
                  <button
                    type="button"
                    className={
                      primaryBtn
                    }
                    onClick={
                      save
                    }
                  >
                    <FontAwesomeIcon
                      icon={
                        faSave
                      }
                    />
                    <span className="ml-1">
                      Save
                    </span>
                  </button>

                  <button
                    type="button"
                    className={
                      primaryBtn
                    }
                    onClick={
                      reset
                    }
                  >
                    <FontAwesomeIcon
                      icon={
                        faUndo
                      }
                    />
                    <span className="ml-1">
                      Reset
                    </span>
                  </button>
                </div>
              </div>

              <div className="p-3 pb-24">
                {renderContent()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>


      {/* ======================================================
          DESKTOP
          ====================================================== */}
      <div className="hidden md:block">

        <div className="global-ref-header-ui !py-2">
          <div className="w-full grid grid-cols-3 items-center">

            <h1 className="global-ref-headertext-ui text-[18px]">
              User Access Rights
            </h1>


            <div className="flex justify-center">
              <div className="flex border-b border-blue-300">

                {tabs.map(
                  (tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() =>
                        setActiveTab(
                          tab.id
                        )
                      }
                      className={`shrink-0 px-4 py-1.5 text-[12px] font-bold border-b-2 rounded-md ${
                        activeTab ===
                        tab.id
                          ? "border-blue-700 text-blue-700 bg-blue-50/50"
                          : "border-transparent text-gray-500 hover:text-blue-500"
                      }`}
                    >
                      {tab.label}
                    </button>
                  )
                )}

              </div>
            </div>


            <div className="flex justify-end gap-2">

              <button
                type="button"
                className={
                  primaryBtn
                }
                onClick={save}
              >
                <FontAwesomeIcon
                  icon={faSave}
                />
                <span className="ml-1">
                  Save
                </span>
              </button>

              <button
                type="button"
                className={
                  primaryBtn
                }
                onClick={reset}
              >
                <FontAwesomeIcon
                  icon={faUndo}
                />
                <span className="ml-1">
                  Reset
                </span>
              </button>

            </div>
          </div>
        </div>


        <div className="mt-10">
          <motion.div
            key={
              activeTab
            }
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            className="global-tran-tab-div-ui pt-2"
          >
            {renderContent()}
          </motion.div>
        </div>
      </div>
    </div>
  );
};


export default UserAccessRights;
