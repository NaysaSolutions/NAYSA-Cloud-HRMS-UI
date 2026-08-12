import { useState, useEffect, useCallback, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFileLines,
  faPrint,
  faFileExport,
  faInfoCircle,
  faUser,
  faCalendarAlt,
  faChevronDown,
  faFileExcel,
  faNoteSticky,
  faUndo,
  faChartLine,
} from "@fortawesome/free-solid-svg-icons";

import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { fetchData } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import { exportGenericHistoryExcel } from "@/NAYSA Cloud/Global/report";
import {
  useTopCompanyRow,
  useTopUserRow,
  useTopBranchRow,
} from "@/NAYSA Cloud/Global/top1RefTable";
import { exportFSLSReportExcel } from "@/NAYSA Cloud/Global/birReport";
import { useSelectedHSColConfig } from "@/NAYSA Cloud/Global/selectedData";
import {
  formatNumber,
  parseFormattedNumber,
  useSwalErrorAlert,
} from "@/NAYSA Cloud/Global/behavior.jsx";
import SearchGlobalReportTable from "@/NAYSA Cloud/Lookup/SearchGlobalReportTable.jsx";
import BranchLookupModal from "@/NAYSA Cloud/Lookup/SearchBranchRef";
import CustomerMastLookupModal from "@/NAYSA Cloud/Lookup/SearchCustMast";
import CutoffLookupModal from "@/NAYSA Cloud/Lookup/SearchCutoffRef";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";

const ENDPOINT = "getOUTAXInquiry";
const ENDPOINT_Att = "getOUTAXAtt";

export default function OUTAXINQ() {
  const { user, companyInfo, currentUserRow } = useAuth();

  const [state, setState] = useState({
    branchCode: "",
    branchName: "",
    custCode: "",
    custName: "",
    startingCutoff: "",
    startingCutoffName: "",
    endingCutoff: "",
    endingCutoffName: "",
    rows: [],
    originalRows: [],
    rows_Att: [],
    cols: [],
    cols_Att: [],
    tblFSLS_dat: [],
    tblFSLS_att: [],
    tblFSLS_fileName: "",
    baseAmount: "0.00",
    vatAmount: "0.00",
    showBranchModal: false,
    ShowCustomerModal: false,
    showCutoffModal: false,
    cutoffModalType: "",
    isLoading: false,
    showSpinner: false,
    guideOpen: false,
    showExportMenu: false,
    showGenerateMenu: false,
  });

  const updateState = (u) => setState((p) => ({ ...p, ...u }));

  const {
    branchCode,
    branchName,
    custCode,
    custName,
    startingCutoff,
    startingCutoffName,
    endingCutoff,
    endingCutoffName,
    rows,
    originalRows,
    rows_Att,
    cols,
    cols_Att,
    tblFSLS_dat,
    tblFSLS_att,
    tblFSLS_fileName,
    baseAmount,
    vatAmount,
    showBranchModal,
    ShowCustomerModal,
    showCutoffModal,
    cutoffModalType,
    isLoading,
    showSpinner,
    guideOpen,
    showExportMenu,
    showGenerateMenu,
  } = state;

  const summaryTableRef = useRef(null);
  const detailedTableRef = useRef(null);
  const detailedSectionRef = useRef(null);
  const exportMenuRef = useRef(null);
  const generateMenuRef = useRef(null);

  useEffect(() => {
    let t;
    if (isLoading) t = setTimeout(() => updateState({ showSpinner: true }), 200);
    else updateState({ showSpinner: false });
    return () => clearTimeout(t);
  }, [isLoading]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (
        exportMenuRef.current &&
        !exportMenuRef.current.contains(e.target) &&
        showExportMenu
      ) {
        updateState({ showExportMenu: false });
      }
      if (
        generateMenuRef.current &&
        !generateMenuRef.current.contains(e.target) &&
        showGenerateMenu
      ) {
        updateState({ showGenerateMenu: false });
      }
    };

    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [showExportMenu, showGenerateMenu]);

  const loadedColsRef = useRef(false);
  useEffect(() => {
    if (loadedColsRef.current) return;

    let alive = true;
    (async () => {
      try {
        const result = await useSelectedHSColConfig(ENDPOINT);
        const resultAtt = await useSelectedHSColConfig(ENDPOINT_Att);

        if (!alive) return;

        updateState({
          cols: Array.isArray(result) ? result.map((c) => ({ ...c })) : [],
          cols_Att: Array.isArray(resultAtt) ? resultAtt.map((c) => ({ ...c })) : [],
        });

        loadedColsRef.current = true;
      } catch (e) {
        console.error("Load column config failed:", e);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const filterReset = useCallback(() => {
    updateState({
      rows: [],
      originalRows: [],
      rows_Att: [],
      tblFSLS_dat: [],
      tblFSLS_att: [],
      tblFSLS_fileName: "",
      baseAmount: "0.00",
      vatAmount: "0.00",
    });
  }, []);

  const loadDefaults = useCallback(async () => {
    updateState({ showSpinner: true });
    try {
      const [hsCompany, hsUser] = await Promise.all([
        useTopCompanyRow(),
        useTopUserRow(user?.USER_CODE),
      ]);

      if (hsCompany) {
        updateState({
          startingCutoff: hsCompany.cutoffCode,
          startingCutoffName: hsCompany.cutoffName,
          endingCutoff: hsCompany.cutoffCode,
          endingCutoffName: hsCompany.cutoffName,
        });
      }

      if (hsUser) {
        const hsBranch = await useTopBranchRow(hsUser.branchCode);
        updateState({
          branchCode: hsUser.branchCode,
          branchName: hsBranch?.branchName || hsUser.branchName,
        });
      }
    } catch (err) {
      console.error("Error loading defaults:", err);
    } finally {
      updateState({ showSpinner: false });
    }
  }, [user?.USER_CODE]);

  const handleReset = useCallback(() => {
    updateState({
      custCode: "",
      custName: "",
      startingCutoff: companyInfo?.cutoffCode || "",
      startingCutoffName: companyInfo?.cutoffName || "",
      endingCutoff: companyInfo?.cutoffCode || "",
      endingCutoffName: companyInfo?.cutoffName || "",
    });

    filterReset();
    summaryTableRef.current?.clearAllState();
    detailedTableRef.current?.clearAllState();
  }, [companyInfo, filterReset]);

  function useNormalizeDat(data) {
    return data.map((row) => Object.values(row).join("")).join("\r\n");
  }

  const computeTotals = useCallback((list = []) => {
    if (!Array.isArray(list) || list.length === 0) {
      updateState({
        vatAmount: "0.00",
        baseAmount: "0.00",
      });
      return;
    }

    const acc = list.reduce(
      (a, r) => {
        a.vatAmount += parseFormattedNumber(r.vatAmt) || 0;
        a.baseAmount += parseFormattedNumber(r.baseAmt) || 0;
        return a;
      },
      { vatAmount: 0, baseAmount: 0 }
    );

    updateState({
      vatAmount: formatNumber(acc.vatAmount),
      baseAmount: formatNumber(acc.baseAmount),
    });
  }, []);

  const doFind = useCallback(async () => {
    updateState({ isLoading: true });
    try {
      const resp = await fetchData(ENDPOINT, {
        json_data: { json_data: { branchCode, custCode, startingCutoff, endingCutoff } },
      });

      const parsed = resp?.data?.[0]?.result ? JSON.parse(resp.data[0].result) : [];
      const dt1 = parsed?.[0]?.dt1 ?? [];
      const dtFSLS = parsed?.[0]?.dtFSLS ?? [];
      const dtFSLS_att = parsed?.[0]?.fFSLS_att ?? [];
      const rowsAttData =
        Array.isArray(dtFSLS_att) && dtFSLS_att.length > 0 ? dtFSLS_att[0].data : [];

      const safeRows = Array.isArray(dt1) ? dt1 : [];
      const safeRowsAtt = Array.isArray(rowsAttData) ? rowsAttData : [];

      if (safeRows.length === 0 && safeRowsAtt.length === 0) {
        filterReset();
        updateState({
          custCode: "",
          custName: "",
        });
        useSwalErrorAlert("Output VAT Inquiry", "No records found.");
        return;
      }

      updateState({
        rows: safeRows,
        originalRows: safeRows,
        rows_Att: safeRowsAtt,
        tblFSLS_dat: Array.isArray(dtFSLS) ? dtFSLS : [],
        tblFSLS_att: Array.isArray(dtFSLS_att) ? dtFSLS_att : [],
        tblFSLS_fileName: parsed?.[0]?.fFSLS_name || "",
      });

      computeTotals(safeRows);
    } catch (e) {
      console.error("Find failed:", e);
    } finally {
      updateState({ isLoading: false });
    }
  }, [branchCode, custCode, startingCutoff, endingCutoff, computeTotals, filterReset]);

  useEffect(() => {
    if (!user?.USER_CODE) return;
    (async () => {
      await loadDefaults();
      handleReset();
    })();
  }, [user?.USER_CODE, loadDefaults, handleReset]);

  const handleViewTop = useCallback(
    (row) => {
      const filteredRows = originalRows.filter((r) => r.custCode === row.custCode);

      updateState({
        custName: row.corpName,
        custCode: row.custCode,
        rows: filteredRows,
      });

      computeTotals(filteredRows);

      requestAnimationFrame(() => {
        detailedSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    },
    [originalRows, computeTotals]
  );

  const doExport = useCallback(async () => {
    if (!Array.isArray(rows) || rows.length === 0) return;

    try {
      updateState({ isLoading: true });

      const exportData = {
        Data: {
          "Output VAT Detailed": rows,
          "Output VAT Summary": rows_Att,
        },
      };

      const columnConfigsMap = {
        "Output VAT Detailed": cols,
        "Output VAT Summary": cols_Att,
      };

      const payload = {
        ReportName: "VAT Output Inquiry Report",
        UserCode: currentUserRow?.userName,
        Branch: branchCode || "",
        JsonData: exportData,
        companyName: companyInfo?.compName,
        companyAddress: companyInfo?.compAddr,
        companyTelNo: companyInfo?.telNo,
      };

      await exportGenericHistoryExcel(payload, columnConfigsMap);
    } catch (e) {
      console.error("Export failed:", e);
    } finally {
      updateState({ isLoading: false });
    }
  }, [rows, rows_Att, cols, cols_Att, branchCode, currentUserRow?.userName, companyInfo]);

  const doExportAttachment = useCallback(
    async (kind) => {
      if (!Array.isArray(rows) || rows.length === 0) return;

      try {
        updateState({ isLoading: true });

        const tblAtt = kind === "FSLS" ? tblFSLS_att : tblFSLS_att;
        if (!tblAtt || tblAtt.length === 0) {
          console.warn(`No attachment data for ${kind}`);
          useSwalErrorAlert("Output VAT Inquiry", "No attachment data found.");
          return;
        }

        const first = tblAtt[0];
        const payload = {
          title: first.title,
          tin: first.tin,
          agentName: first.agentName,
          fileName: first.fileName,
          addr: first.addr,
          data: first.data,
        };

        exportFSLSReportExcel("FSLS", payload, { slice8to11: false });
      } catch (e) {
        console.error(`Export ${kind} attachment failed:`, e);
      } finally {
        updateState({ isLoading: false, showExportMenu: false });
      }
    },
    [rows, tblFSLS_att]
  );

  const doGenerate = useCallback(
    (kind) => {
      if (!Array.isArray(rows) || rows.length === 0) return;

      try {
        updateState({ isLoading: true });

        const src = kind === "FSLS" ? tblFSLS_dat : tblFSLS_dat;
        const filename = kind === "FSLS" ? tblFSLS_fileName : tblFSLS_fileName;
        const datText = useNormalizeDat(src).trim();

        const blob = new Blob([datText], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error(`Download ${kind} failed:`, err);
        useSwalErrorAlert("Output VAT Inquiry", `Failed to generate ${kind} file.`);
      } finally {
        updateState({ isLoading: false, showGenerateMenu: false });
      }
    },
    [rows, tblFSLS_dat, tblFSLS_fileName]
  );

  const onAction = (id) => {
    switch (id) {
      case "find":
        return doFind();
      case "reset":
        return handleReset();
      case "print":
        return window.print();
      case "export-query":
        return doExport();
      case "export-FSLS-att":
        return doExportAttachment("FSLS");
      case "gen-FSLS":
        return doGenerate("FSLS");
      case "guide":
        return updateState({
          guideOpen: !guideOpen,
          showExportMenu: false,
          showGenerateMenu: false,
        });
      case "pdf":
        return window.open("/public/NAYSA Output VAT Inquiry.pdf", "_blank");
      default:
        return;
    }
  };

  return (
    <div className="global-ref-main-div-ui">
      {showSpinner && <LoadingSpinner />}

      <div className="global-ref-header-ui">
        <div className="w-full flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="w-full md:w-auto flex md:justify-start">
            <h1 className="global-ref-headertext-ui w-full md:w-auto truncate text-center md:text-left">
              Output VAT Query
            </h1>
          </div>

          <div className="w-full md:w-auto flex md:justify-end">
            <div className="w-full md:w-auto overflow-visible">
              <div className="flex flex-nowrap items-center justify-center md:justify-end gap-2">
                <button
                  onClick={() => onAction("find")}
                  className="shrink-0 px-3 py-2 text-xs font-medium rounded-md text-white bg-blue-600 hover:opacity-90"
                >
                  <span className="inline-flex items-center gap-2">
                    <FontAwesomeIcon icon={faFileLines} />
                    <span className="hidden lg:inline">Find</span>
                  </span>
                </button>

                <button
                  onClick={() => onAction("reset")}
                  className="shrink-0 px-3 py-2 text-xs font-medium rounded-md text-white bg-blue-600 hover:opacity-90"
                >
                  <span className="inline-flex items-center gap-2">
                    <FontAwesomeIcon icon={faUndo} />
                    <span className="hidden lg:inline">Reset</span>
                  </span>
                </button>

                <button
                  onClick={() => onAction("print")}
                  className="shrink-0 px-3 py-2 text-xs font-medium rounded-md text-white bg-blue-600 hover:opacity-90"
                >
                  <span className="inline-flex items-center gap-2">
                    <FontAwesomeIcon icon={faPrint} />
                    <span className="hidden lg:inline">Print</span>
                  </span>
                </button>

                <div className="relative shrink-0" ref={exportMenuRef}>
                  <button
                    onClick={() =>
                      updateState({
                        showExportMenu: !showExportMenu,
                        showGenerateMenu: false,
                        guideOpen: false,
                      })
                    }
                    className="px-3 py-2 text-xs font-medium rounded-md text-white bg-blue-600 hover:opacity-90 flex items-center"
                  >
                    <FontAwesomeIcon icon={faFileExport} />
                    <span className="hidden lg:inline ml-2">Export</span>
                    <FontAwesomeIcon icon={faChevronDown} className="ml-2 text-[10px]" />
                  </button>

                  {showExportMenu && (
                    <div className="absolute right-0 mt-2 w-52 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                      <button
                        onClick={() => onAction("export-query")}
                        className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 flex items-center gap-2"
                      >
                        <FontAwesomeIcon icon={faFileExcel} className="text-green-600" />
                        <span>Export Query</span>
                      </button>
                      <button
                        onClick={() => onAction("export-FSLS-att")}
                        className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 flex items-center gap-2"
                      >
                        <FontAwesomeIcon icon={faFileExcel} className="text-green-600" />
                        <span>Export SLP Attachment</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="relative shrink-0" ref={generateMenuRef}>
                  <button
                    onClick={() =>
                      updateState({
                        showGenerateMenu: !showGenerateMenu,
                        showExportMenu: false,
                        guideOpen: false,
                      })
                    }
                    className="px-3 py-2 text-xs font-medium rounded-md text-white bg-blue-600 hover:opacity-90 flex items-center"
                  >
                    <FontAwesomeIcon icon={faFileLines} />
                    <span className="hidden lg:inline ml-2">Generate</span>
                    <FontAwesomeIcon icon={faChevronDown} className="ml-2 text-[10px]" />
                  </button>

                  {showGenerateMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                      <button
                        onClick={() => onAction("gen-FSLS")}
                        className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 flex items-center gap-2"
                      >
                        <FontAwesomeIcon icon={faNoteSticky} className="text-yellow-600" />
                        <span>Generate SLS</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="relative shrink-0">
                  <button
                    onClick={() => onAction("guide")}
                    className="px-3 py-2 text-xs font-medium rounded-md text-white bg-blue-600 hover:opacity-90"
                  >
                    <FontAwesomeIcon icon={faInfoCircle} />
                    <span className="hidden lg:inline ml-2">Guide</span>
                  </button>

                  {guideOpen && (
                    <div className="absolute right-0 mt-2 w-40 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                      <button
                        onClick={() => onAction("pdf")}
                        className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100"
                      >
                        <FontAwesomeIcon icon={faFileLines} className="mr-2" />
                        PDF Guide
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-32 sm:mt-24 px-1">
        <div id="summary" className="global-tran-tab-div-ui">
          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-gray-200">
              <section className="p-5">
                <h3 className="flex items-center gap-2 text-gray-800 font-semibold mb-4">
                  <FontAwesomeIcon className="text-blue-600" icon={faUser} />
                  Customer Details
                </h3>

                <div className="space-y-3">
                  <FieldRenderer
                    type="lookup"
                    id="branchName"
                    name="branchName"
                    label="Branch"
                    value={branchName}
                    readOnly
                    disabled={isLoading}
                    onLookup={() => updateState({ showBranchModal: true })}
                  />

                  <FieldRenderer
                    type="lookup"
                    id="custCode"
                    name="custCode"
                    label="Customer Code"
                    value={custCode}
                    disabled={isLoading}
                    onChange={(e) => updateState({ custCode: e.target.value })}
                    onLookup={() => updateState({ ShowCustomerModal: true })}
                  />

                  <FieldRenderer
                    type="text"
                    id="custName"
                    name="custName"
                    label="Customer Name"
                    value={custName}
                    readOnly
                    disabled
                  />
                </div>
              </section>

              <section className="p-5">
                <h3 className="flex items-center gap-2 text-gray-800 font-semibold mb-4">
                  <FontAwesomeIcon className="text-blue-600" icon={faCalendarAlt} />
                  Date Range
                </h3>

                <div className="space-y-3">
                  <FieldRenderer
                    type="lookup"
                    id="startingCutoffName"
                    name="startingCutoffName"
                    label="Starting Cut-off"
                    value={startingCutoffName}
                    readOnly
                    disabled={isLoading}
                    onLookup={() =>
                      updateState({
                        showCutoffModal: true,
                        cutoffModalType: "starting",
                      })
                    }
                  />

                  <FieldRenderer
                    type="lookup"
                    id="endingCutoffName"
                    name="endingCutoffName"
                    label="Ending Cut-off"
                    value={endingCutoffName}
                    readOnly
                    disabled={isLoading}
                    onLookup={() =>
                      updateState({
                        showCutoffModal: true,
                        cutoffModalType: "ending",
                      })
                    }
                  />
                </div>
              </section>

              <aside className="p-5 bg-gray-50">
                <h3 className="flex items-center gap-2 text-gray-800 font-semibold mb-4">
                  <FontAwesomeIcon className="text-blue-600" icon={faChartLine} />
                  Output VAT Summary
                </h3>

                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Base Amount:</span>
                    <span className="font-semibold text-gray-800">{baseAmount}</span>
                  </div>
                  <div className="border-t pt-3 flex items-center justify-between">
                    <span className="text-gray-700">VAT Amount:</span>
                    <span className="font-bold text-blue-600">{vatAmount}</span>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>

        <div className="global-tran-tab-div-ui">
          <div className="global-tran-tab-nav-ui">
            <div className="flex flex-row sm:flex-row">
              <button className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">
                Summary
              </button>
            </div>
          </div>

          <div className="global-tran-table-main-div-ui">
            <SearchGlobalReportTable
              ref={summaryTableRef}
              columns={cols_Att}
              data={rows_Att}
              itemsPerPage={50}
              docType="Output VAT Summary"
              rightActionLabel="View"
              onRowAction={handleViewTop}
            />
          </div>
        </div>

        <div
          ref={detailedSectionRef}
          className="global-tran-tab-div-ui scroll-mt-24 sm:scroll-mt-20"
        >
          <div className="global-tran-tab-nav-ui">
            <div className="flex flex-row sm:flex-row">
              <button className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">
                Detailed
              </button>
            </div>
          </div>

          <div className="global-tran-table-main-div-ui">
            <SearchGlobalReportTable
              ref={detailedTableRef}
              columns={cols}
              data={rows}
              itemsPerPage={50}
              rightActionLabel="View"
              docType="Output VAT Detailed"
              onRowAction={(row) => {
                const url = `${window.location.origin}${row.pathUrl}`;
                window.open(url, "_blank", "noopener,noreferrer");
              }}
            />
          </div>
        </div>
      </div>

      {showBranchModal && (
        <BranchLookupModal
          isOpen={showBranchModal}
          onClose={(selectedBranch) => {
            if (selectedBranch) {
              filterReset();
              updateState({
                branchCode: selectedBranch.branchCode,
                branchName: selectedBranch.branchName,
              });
            }
            updateState({ showBranchModal: false });
          }}
        />
      )}

      {ShowCustomerModal && (
        <CustomerMastLookupModal
          isOpen={ShowCustomerModal}
          onClose={(selectedCustomer) => {
            if (selectedCustomer) {
              filterReset();
              updateState({
                custCode: selectedCustomer.custCode,
                custName: selectedCustomer.custName,
              });
            }
            updateState({ ShowCustomerModal: false });
          }}
        />
      )}

      {showCutoffModal && (
        <CutoffLookupModal
          isOpen={showCutoffModal}
          onClose={(selectedCutoff) => {
            if (selectedCutoff) {
              if (cutoffModalType === "starting") {
                filterReset();
                updateState({
                  startingCutoff: selectedCutoff.cutoffCode,
                  startingCutoffName: selectedCutoff.cutoffName,
                  endingCutoff: selectedCutoff.cutoffCode,
                  endingCutoffName: selectedCutoff.cutoffName,
                });
              } else {
                if (selectedCutoff.cutoffCode < startingCutoff) {
                  useSwalErrorAlert("", "", "endingCutoff");
                  filterReset();
                  updateState({
                    endingCutoff: startingCutoff,
                    endingCutoffName: startingCutoffName,
                  });
                  updateState({ showCutoffModal: false, cutoffModalType: "" });
                  return;
                }

                filterReset();
                updateState({
                  endingCutoff: selectedCutoff.cutoffCode,
                  endingCutoffName: selectedCutoff.cutoffName,
                });
              }
            }
            updateState({ showCutoffModal: false, cutoffModalType: "" });
          }}
        />
      )}
    </div>
  );
}
