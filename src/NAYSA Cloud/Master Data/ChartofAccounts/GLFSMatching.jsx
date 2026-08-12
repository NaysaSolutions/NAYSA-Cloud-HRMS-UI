import React, { useEffect, useMemo, useRef, useState, forwardRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { X } from "lucide-react";
import {
  faSave,
  faUndo,
  faInfoCircle,
  faChevronDown,
  faFilePdf,
  faVideo,
  faClipboardList,
  faMagnifyingGlass,
} from "@fortawesome/free-solid-svg-icons";

import ButtonBar from "@/NAYSA Cloud/Global/ButtonBar.jsx";
import RegistrationInfo from "@/NAYSA Cloud/Global/RegistrationInfo.jsx";

import {
  reftablesPDFGuide,
  reftablesVideoGuide,
} from "@/NAYSA Cloud/Global/reftable";

import {
  useSwalErrorAlert,
  useSwalSuccessAlert,
  useSwalErrorAlertAPI,
} from "@/NAYSA Cloud/Global/behavior.jsx";

import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable.jsx";
import SearchFSConso from "@/NAYSA Cloud/Lookup/SearchFSConso.jsx";

const DOC_TYPE = "GLFSMatching";

const GLFSMatching = forwardRef(function GLFSMatching(
  {
    embedded = false,
    activeTab = "glfsmatching",
    setActiveTab = () => {},
    tabs = [],
  },
  ref
) {
  const queryClient = useQueryClient();

  const guideRef = useRef(null);
  const pdfLink = reftablesPDFGuide?.[DOC_TYPE];
  const videoLink = reftablesVideoGuide?.[DOC_TYPE];

  const [isOpenGuide, setOpenGuide] = useState(false);
  const [rows, setRows] = useState([]);
  const [selectedRow, setSelectedRow] = useState(null);
  const [savingAll, setSavingAll] = useState(false);
  const [isRegModalOpen, setIsRegModalOpen] = useState(false);

  const [registrationInfo, setRegistrationInfo] = useState({
    registeredBy: "",
    registeredDate: "",
    lastUpdatedBy: "",
    lastUpdatedDate: "",
  });

  const [modals, setModals] = useState({
    fsConso: false,
  });

  const toggleModal = (name, isOpen) =>
    setModals((prev) => ({ ...prev, [name]: isOpen }));

  const { data: glfsList = [], isLoading: isListLoading } = useQuery({
    queryKey: ["glfsmatchingList"],
    queryFn: async () => {
      const { data } = await apiClient.get("/glfsmatching");
      const raw = data?.data?.[0]?.result || data?.[0]?.result || data?.result;
      return raw ? JSON.parse(raw) : [];
    },
  });

  useEffect(() => {
    const normalized = (glfsList || []).map((row, index) => ({
      ...row,
      acctCode: row.acctCode ?? "",
      acctName: row.acctName ?? "",
      fsConsoCode: row.fsConsoCode ?? "",
      fsConsoName: row.fsConsoName ?? "",
      __rowKey: `${row.acctCode || "ROW"}-${index}`,
      __isDirty: false,
    }));

    setRows(normalized);

    if (normalized.length > 0) {
      setSelectedRow(normalized[0].__rowKey);
      setRegistrationInfo({
        registeredBy: normalized[0].registeredBy || "",
        registeredDate: normalized[0].registeredDate || "",
        lastUpdatedBy: normalized[0].lastUpdatedBy || "",
        lastUpdatedDate: normalized[0].lastUpdatedDate || "",
      });
    } else {
      setSelectedRow(null);
      setRegistrationInfo({
        registeredBy: "",
        registeredDate: "",
        lastUpdatedBy: "",
        lastUpdatedDate: "",
      });
    }
  }, [glfsList]);

  const getRowKey = (row) => row.__rowKey;

  const handleRowSelect = (row) => {
    const rowKey = getRowKey(row);
    setSelectedRow(rowKey);
    setRegistrationInfo({
      registeredBy: row.registeredBy || "",
      registeredDate: row.registeredDate || "",
      lastUpdatedBy: row.lastUpdatedBy || "",
      lastUpdatedDate: row.lastUpdatedDate || "",
    });
  };

  const openRegistrationModal = (row) => {
    setRegistrationInfo({
      registeredBy: row.registeredBy || "",
      registeredDate: row.registeredDate || "",
      lastUpdatedBy: row.lastUpdatedBy || "",
      lastUpdatedDate: row.lastUpdatedDate || "",
    });
    setIsRegModalOpen(true);
  };

  const updateRow = (rowKey, field, value) => {
    setRows((prev) =>
      prev.map((row) =>
        getRowKey(row) === rowKey
          ? {
              ...row,
              [field]: value,
              __isDirty: true,
            }
          : row
      )
    );
  };

  const resetTable = () => {
    const normalized = (glfsList || []).map((row, index) => ({
      ...row,
      acctCode: row.acctCode ?? "",
      acctName: row.acctName ?? "",
      fsConsoCode: row.fsConsoCode ?? "",
      fsConsoName: row.fsConsoName ?? "",
      __rowKey: `${row.acctCode || "ROW"}-${index}`,
      __isDirty: false,
    }));

    setRows(normalized);

    if (normalized.length > 0) {
      setSelectedRow(normalized[0].__rowKey);
      setRegistrationInfo({
        registeredBy: normalized[0].registeredBy || "",
        registeredDate: normalized[0].registeredDate || "",
        lastUpdatedBy: normalized[0].lastUpdatedBy || "",
        lastUpdatedDate: normalized[0].lastUpdatedDate || "",
      });
    } else {
      setSelectedRow(null);
      setRegistrationInfo({
        registeredBy: "",
        registeredDate: "",
        lastUpdatedBy: "",
        lastUpdatedDate: "",
      });
    }
  };

  const validateRow = (row) => {
    if (!row.acctCode?.trim()) {
      useSwalErrorAlert("Validation Error", "Missing GL Account Code.");
      return false;
    }

    if (!row.fsConsoCode?.trim()) {
      useSwalErrorAlert(
        "Validation Error",
        `Please select FS Conso Code for Account Code: ${row.acctCode}`
      );
      return false;
    }

    return true;
  };

  const saveOneRow = async (row) => {
    const payload = {
      json_data: JSON.stringify({
        json_data: {
          acctCode: row.acctCode,
          fsConsoCode: row.fsConsoCode,
          action: "EDIT",
        },
      }),
    };

    const response = await apiClient.post("/upsertGLFSMatching", payload);
    const sqlRow = response?.data?.data?.[0];

    if (sqlRow?.errorcount > 0) {
      throw new Error(sqlRow?.errormsg || `Failed to save ${row.acctCode}`);
    }

    const status = response?.data?.status ?? response?.data?.data?.status;
    const success = response?.data?.success || status === "success" || !status;

    if (!success) {
      throw new Error(
        response?.data?.message ||
          response?.data?.data?.message ||
          `Failed to save ${row.acctCode}`
      );
    }
  };

  const handleSaveAll = async () => {
    const dirtyRows = rows.filter((r) => r.__isDirty);

    if (!dirtyRows.length) {
      return useSwalErrorAlert("No Changes", "There are no modified rows to save.");
    }

    try {
      setSavingAll(true);

      for (const row of dirtyRows) {
        if (!validateRow(row)) return;
        await saveOneRow(row);
      }

      await queryClient.invalidateQueries({ queryKey: ["glfsmatchingList"] });
      useSwalSuccessAlert(
        "Success!",
        "GL-FS Matching changes were saved successfully."
      );
    } catch (error) {
      useSwalErrorAlertAPI("Save Error", error?.message || error);
    } finally {
      setSavingAll(false);
    }
  };

  useEffect(() => {
    const handleClick = (e) => {
      if (guideRef.current && !guideRef.current.contains(e.target)) {
        setOpenGuide(false);
      }
    };

    const handleKey = (e) => {
      if (e.ctrlKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSaveAll();
      }
    };

    document.addEventListener("mousedown", handleClick);
    window.addEventListener("keydown", handleKey);

    return () => {
      document.removeEventListener("mousedown", handleClick);
      window.removeEventListener("keydown", handleKey);
    };
  }, [rows]);

  const selectedRowData = useMemo(() => {
    return rows.find((r) => getRowKey(r) === selectedRow) || null;
  }, [rows, selectedRow]);

  const updateSelectedRowField = (field, value) => {
    if (!selectedRowData) return;
    updateRow(getRowKey(selectedRowData), field, value);
  };

  const clearFsConsoFields = (rowKey) => {
    setRows((prev) =>
      prev.map((row) =>
        getRowKey(row) === rowKey
          ? {
              ...row,
              fsConsoCode: "",
              fsConsoName: "",
              __isDirty: true,
            }
          : row
      )
    );
  };

  const columns = useMemo(
    () => [
      // {
      //   key: "__actions",
      //   label: "Actions",
      //   width: 90,
      //   sortable: false,
      //   render: (row) => (
      //     <div className="flex gap-1 justify-center">
      //       <button
      //         onClick={(e) => {
      //           e.stopPropagation();
      //           openRegistrationModal(row);
      //         }}
      //         className="py-1 px-2 bg-indigo-100 text-indigo-600 rounded-md hover:bg-indigo-600 hover:text-white transition-colors"
      //         title="Registration Info"
      //       >
      //         <FontAwesomeIcon icon={faClipboardList} />
      //       </button>
      //     </div>
      //   ),
      // },
      {
        key: "acctCode",
        label: "GL Account Code",
        width: 180,
        sortable: true,
        requiredVisible: true ,
        render: (row) => (
          <span className="block px-2 py-1 text-[11px]">{row.acctCode || ""}</span>
        ),
      },
      {
        key: "acctName",
        label: "GL Account Name",
        width: 260,
        sortable: true,
        requiredVisible: true ,
        render: (row) => (
          <span className="block px-2 py-1 text-[11px]">{row.acctName || ""}</span>
        ),
      },
      {
        key: "fsConsoCode",
        label: "FS Conso Code",
        width: 180,
        sortable: true,
        render: (row) => {
          const rowKey = getRowKey(row);

          return (
            <div className="flex items-center gap-1 min-w-[160px]">
              <div
                className={`relative flex-1 rounded-md border border-gray-300 px-2 py-1 text-[11px] bg-gray-50 text-left ${
                  row.fsConsoCode ? "pr-8" : ""
                }`}
              >
                {row.fsConsoCode || "NO MATCHED FS CONSO"}
                {row.fsConsoCode && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearFsConsoFields(rowKey);
                    }}
                    title="Clear"
                    aria-label="Clear FS Conso Code"
                    className="absolute right-1 top-1/2 flex h-[18px] w-6 -translate-y-1/2 items-center justify-center rounded-md border-none bg-transparent text-slate-400 transition-colors hover:bg-slate-200/70 hover:text-slate-600 dark:text-slate-300 dark:hover:bg-slate-600/70 dark:hover:text-white"
                  >
                    <X style={{ width: "11px", height: "11px", strokeWidth: 2.5 }} />
                  </button>
                )}
              </div>
              <button
                type="button"
                className="h-7 sm:h-6 w-7 rounded-md bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-600 hover:text-white transition-colors"
                onClick={() => {
                  setSelectedRow(rowKey);
                  toggleModal("fsConso", true);
                }}
                title="Select FS Consolidation"
              >
                <FontAwesomeIcon icon={faMagnifyingGlass} />
              </button>
            </div>
          );
        },
      },
      {
        key: "fsConsoName",
        label: "FS Conso Name",
        width: 260,
        sortable: true,
        render: (row) => (
          <span className="block px-2 py-1 text-[11px]">{row.fsConsoName || ""}</span>
        ),
      },
    ],
    [rows]
  );

  return (
    <div className="global-ref-main-div-ui">
      {(isListLoading || savingAll) && <LoadingSpinner />}

      <div className="global-ref-header-ui">
        <div className="w-full flex flex-col gap-3 md:grid md:grid-cols-3 md:items-center md:gap-0">
          <div className="w-full md:w-auto flex">
            <h1 className="global-ref-headertext-ui w-full md:w-auto truncate text-center md:text-left">
              GL-FS Matching
            </h1>
          </div>

          <div className="w-full md:justify-center flex">
            {embedded && tabs?.length > 0 ? (
              <div className="w-full md:w-auto">
                <div className="flex flex-nowrap overflow-x-auto no-scrollbar border-b border-blue-300 dark:border-gray-700">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`shrink-0 whitespace-nowrap px-3 py-1 sm:py-2 sm:px-4 text-[10px] sm:text-[13px] font-bold transition-all border-b-2 rounded-md ${
                        activeTab === tab.id
                          ? "border-blue-700 text-blue-700 bg-blue-50/50"
                          : "border-transparent text-gray-500 hover:text-blue-500"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="w-full md:justify-center flex" />
            )}
          </div>

          <div className="w-full md:w-auto flex md:justify-end">
            <div className="w-full md:w-auto flex items-center justify-center md:justify-end gap-2 flex-wrap">
              <ButtonBar
                buttons={[
                  {
                    key: "save",
                    label: <span className="sm:inline ml-1">Save</span>,
                    icon: faSave,
                    onClick: handleSaveAll,
                    className:
                      "flex items-center justify-center h-7 w-14 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-all",
                  },
                  {
                    key: "reset",
                    label: <span className="sm:inline ml-1">Reset</span>,
                    icon: faUndo,
                    onClick: resetTable,
                    className:
                      "flex items-center justify-center h-7 w-14 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-all",
                  },
                ]}
              />

              <div ref={guideRef} className="relative">
                <button
                  onClick={() => setOpenGuide((v) => !v)}
                  className="bg-blue-600 text-white h-7 w-14 sm:w-auto sm:h-8 sm:px-4 rounded-md flex items-center justify-center gap-1 hover:bg-blue-700 transition-all"
                >
                  <FontAwesomeIcon icon={faInfoCircle} className="text-[12px]" />
                  <span className="sm:inline ml-1 text-[11px] font-medium">Info</span>
                  <FontAwesomeIcon
                    icon={faChevronDown}
                    className="hidden sm:inline text-[10px] opacity-80"
                  />
                </button>

                {isOpenGuide && (
                  <div className="absolute right-0 mt-2 w-52 rounded-md shadow-xl bg-white ring-1 ring-black/10 z-[60] dark:bg-gray-800 overflow-hidden">
                    <button
                      onClick={() => {
                        if (pdfLink) window.open(pdfLink, "_blank");
                        setOpenGuide(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-xs hover:bg-blue-50 dark:hover:bg-blue-900 border-b border-gray-100 dark:border-gray-700"
                    >
                      <FontAwesomeIcon icon={faFilePdf} className="mr-2 text-red-500" />
                      PDF Guide
                    </button>
                    <button
                      onClick={() => {
                        if (videoLink) window.open(videoLink, "_blank");
                        setOpenGuide(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-xs hover:bg-blue-50 dark:hover:bg-blue-900"
                    >
                      <FontAwesomeIcon icon={faVideo} className="mr-2 text-blue-500" />
                      Video Guide
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-20 flex flex-col gap-3">
        <div className="global-tran-table-main-div-ui">
          <SearchGlobalReferenceTable
            docType={DOC_TYPE}
            columns={columns}
            data={rows}
            isLoading={isListLoading}
            itemsPerPage={500}
            showFilters={true}
            onRowDoubleClick={handleRowSelect}
            onRowClick={handleRowSelect}
            selectedRowKey={selectedRow}
            rowKeyField="__rowKey"
            autoFillGrid="True"
          />
        </div>
      </div>

      {isRegModalOpen && (
        <div className="fixed inset-0 z-[110] bg-black/40 backdrop-blur-[1px] flex items-center justify-center px-4">
          <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <RegistrationInfo layout="stacked" data={registrationInfo} />
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <button
                onClick={() => setIsRegModalOpen(false)}
                className="px-4 py-2 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <SearchFSConso
        isOpen={modals.fsConso}
        onClose={(v) => {
          toggleModal("fsConso", false);
          if (!v || !selectedRowData) return;
          updateSelectedRowField("fsConsoCode", v.fsConsoCode || "");
          updateSelectedRowField("fsConsoName", v.fsConsoName || "");
        }}
      />
    </div>
  );
});

export default GLFSMatching;
