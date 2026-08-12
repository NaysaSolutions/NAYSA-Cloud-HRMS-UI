import { useEffect, useState, useRef, useCallback, forwardRef } from "react";
import { fetchData } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMagnifyingGlass,
  faUser,
  faCalendarAlt,
  faChartLine,
} from "@fortawesome/free-solid-svg-icons";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import {exportGenericHistoryExcel} from "@/NAYSA Cloud/Global/report";
import BranchLookupModal from "@/NAYSA Cloud/Lookup/SearchBranchRef";
import CustomerMastLookupModal from "@/NAYSA Cloud/Lookup/SearchCustMast";
import CutoffLookupModal from "@/NAYSA Cloud/Lookup/SearchCutoffRef";
import { useSelectedHSColConfig } from "@/NAYSA Cloud/Global/selectedData";
import { formatNumber, parseFormattedNumber } from "@/NAYSA Cloud/Global/behavior.jsx";
import SearchGlobalReportTable from "@/NAYSA Cloud/Lookup/SearchGlobalReportTable.jsx";
import { useSwalErrorAlert } from "@/NAYSA Cloud/Global/behavior.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";

const ENDPOINT = "getARInquiry";

/** Light global cache so the tab remembers its UI state across mounts */
function getGlobalCache() {
  if (typeof window !== "undefined") {
    if (!window.__NAYSA_ARINQ_CACHE__) window.__NAYSA_ARINQ_CACHE__ = {};
    return window.__NAYSA_ARINQ_CACHE__;
  }
  return {};
}

const ARInquiryTab = forwardRef(function ARInquiryTab({ registerActions }, ref) {
  const { user,companyInfo, currentUserRow, refsLoaded, refsLoading } = useAuth();
  const baseKey = "AR_INQUIRY";
  const hydratedRef = useRef(false);

  const [state, setState] = useState({
    branchCode: currentUserRow.branchCode,
    branchName: currentUserRow.branchName,
    custCode: "",
    custName: "",
    startingCutoff: companyInfo.cutoffCode,
    startingCutoffName: companyInfo.cutoffName,
    endingCutoff: companyInfo.cutoffCode,
    endingCutoffName: companyInfo.cutoffName,
    arInquiryData: [],
    columnConfig: [],
    beginningBalance: "0.00",
    totalDebit: "0.00",
    totalCredit: "0.00",
    endingBalance: "0.00",
    showBranchModal: false,
    showCustomerModal: false,
    showCutoffModal: false,
    cutoffModalType: "",
    isLoading: false,
    showSpinner: false,
  });

  const [exporting, setExporting] = useState(false);
  const updateState = (u) => setState((p) => ({ ...p, ...u }));

  const {
    branchCode, branchName, custCode, custName,
    startingCutoff, startingCutoffName,
    endingCutoff, endingCutoffName,
    arInquiryData, columnConfig,
    beginningBalance, totalDebit, totalCredit, endingBalance,
    showBranchModal, showCustomerModal, showCutoffModal, cutoffModalType,
    isLoading, showSpinner,
  } = state;

  // ---- table refs/state caching (filters/sort/page/scroll) ----
  const tableRef = useRef(null);
  const tableStateRef = useRef({ filters: {}, sortConfig: { key: null, direction: null }, currentPage: 1 });

  // keep export values in refs (avoid async state race)
  const dataRefs = useRef({ arInquiry: [] });
  const colRefs  = useRef({ arInquiry: [] });
  useEffect(() => { dataRefs.current.arInquiry = arInquiryData; }, [arInquiryData]);
  useEffect(() => { colRefs.current.arInquiry = columnConfig; }, [columnConfig]);

  // smooth spinner
  useEffect(() => {
    let t;
    if (isLoading) t = setTimeout(() => updateState({ showSpinner: true }), 200);
    else updateState({ showSpinner: false });
    return () => clearTimeout(t);
  }, [isLoading]);

  // load columns once
  const loadedColsRef = useRef(false);
  useEffect(() => {
    if (loadedColsRef.current) return;
    let alive = true;
    (async () => {
      try {
        const cols = await useSelectedHSColConfig(ENDPOINT);
        if (!alive || !Array.isArray(cols)) return;
        setState((prev) => {
          const same = prev.columnConfig.length === cols.length &&
                       prev.columnConfig.every((c, i) => c.key === cols[i].key);
          return same ? prev : { ...prev, columnConfig: cols.map(c => ({ ...c })) };
        });
        loadedColsRef.current = true;
      } catch (e) {
        console.error("Load column config failed:", e);
      }
    })();
    return () => { alive = false; };
  }, []);

 

  const filterReset = () => {
    updateState({
      arInquiryData: [],
      beginningBalance: "0.00",
      totalDebit: "0.00",
      totalCredit: "0.00",
      endingBalance: "0.00",
    });
  };


  const handleReset = useCallback(async () => {
    updateState({
      custCode: "",
      custName: "",
      startingCutoff: companyInfo.cutoffCode,
      startingCutoffName: companyInfo.cutoffName,
      endingCutoff: companyInfo.cutoffCode,
      endingCutoffName: companyInfo.cutoffName,
    });

    filterReset();
    tableRef.current?.clearAllState();
  }, []);

  // totals
  const calculateTotals = useCallback((rows = []) => {
    if (!Array.isArray(rows) || rows.length === 0) {
      updateState({
        totalDebit: "0.00",
        totalCredit: "0.00",
        endingBalance: beginningBalance,
      });
      return;
    }
    const totals = rows.reduce(
      (acc, row) => {
        acc.debit += parseFormattedNumber(row.debit) || 0;
        acc.credit += parseFormattedNumber(row.credit) || 0;
        return acc;
      },
      { debit: 0, credit: 0 }
    );
    const beg = parseFormattedNumber(beginningBalance) || 0;
    const end = beg + totals.debit - totals.credit;
    updateState({
      totalDebit: formatNumber(totals.debit),
      totalCredit: formatNumber(totals.credit),
      endingBalance: formatNumber(end),
    });
  }, [beginningBalance]);




  // find (rows only)
const fetchRecord = useCallback(async () => {
  updateState({ isLoading: true });

  try {
    const response = await fetchData(ENDPOINT, {
      json_data: { json_data: { branchCode, custCode, startingCutoff, endingCutoff } },
    });

    const custData = response?.data?.[0]?.result
      ? JSON.parse(response.data[0].result)
      : [];

    const rows = custData?.[0]?.dt1 ?? [];
    const safeRows = Array.isArray(rows) ? rows : [];

    if (safeRows.length === 0) {
      updateState({
        arInquiryData: [],
        beginningBalance: "0.00",
        totalDebit: "0.00",
        totalCredit: "0.00",
        endingBalance: "0.00",
        custCode:"",
        custName:"",
      });

      useSwalErrorAlert("AR Inquiry", "No records found.");
      return;
    }

    updateState({ arInquiryData: safeRows });
    calculateTotals(safeRows);
  } catch (err) {
    console.error("Error fetching data:", err);
  } finally {
    updateState({ isLoading: false });
  }
}, [branchCode, custCode, startingCutoff, endingCutoff, calculateTotals]);




  // -------- hydrate from cache or load defaults once --------
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (hydratedRef.current) return;

      const cache = getGlobalCache();
      const snap = cache[baseKey];

      const hasValidCache =
        !!snap &&
        (snap.branchCode ||
         snap.startingCutoff ||
         (Array.isArray(snap.arInquiryData) && snap.arInquiryData.length > 0));

      if (hasValidCache) {
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            branchCode: snap.branchCode ?? prev.branchCode,
            branchName: snap.branchName ?? prev.branchName,
            custCode: snap.custCode ?? prev.custCode,
            custName: snap.custName ?? prev.custName,
            startingCutoff: snap.startingCutoff ?? prev.startingCutoff,
            startingCutoffName: snap.startingCutoffName ?? prev.startingCutoffName,
            endingCutoff: snap.endingCutoff ?? prev.endingCutoff,
            endingCutoffName: snap.endingCutoffName ?? prev.endingCutoffName,
            arInquiryData: Array.isArray(snap.arInquiryData) ? snap.arInquiryData : prev.arInquiryData,
            columnConfig: Array.isArray(snap.columnConfig) ? snap.columnConfig : prev.columnConfig,
            beginningBalance: snap.beginningBalance ?? prev.beginningBalance,
            totalDebit: snap.totalDebit ?? prev.totalDebit,
            totalCredit: snap.totalCredit ?? prev.totalCredit,
            endingBalance: snap.endingBalance ?? prev.endingBalance,
          }));
          // hydrate table UI state (filters/sort/page)
          tableStateRef.current = snap.table || tableStateRef.current;
          hydratedRef.current = true;
        }
        return;
      }

      // wait for user, then load defaults once
      if (!user?.USER_CODE) return;
      await handleReset();
      hydratedRef.current = true;
    };
    run();
    return () => { cancelled = true; };
  }, [user?.USER_CODE, handleReset]);

  // -------- snapshot into cache whenever important things change --------
  useEffect(() => {
    if (!hydratedRef.current) return; // avoid writing empty snapshot before hydration
    const cache = getGlobalCache();
    const prev = cache[baseKey] || {};
    cache[baseKey] = {
      ...prev,
      branchCode,
      branchName,
      custCode,
      custName,
      startingCutoff,
      startingCutoffName,
      endingCutoff,
      endingCutoffName,
      arInquiryData,
      columnConfig,
      beginningBalance,
      totalDebit,
      totalCredit,
      endingBalance,
      table: tableStateRef.current, // <- filters/sort/page live here
      // keep any existing scroll position
      scroll: prev.scroll || { top: 0, left: 0 },
    };
  }, [
    branchCode, branchName, custCode, custName,
    startingCutoff, startingCutoffName, endingCutoff, endingCutoffName,
    arInquiryData, columnConfig, beginningBalance, totalDebit, totalCredit, endingBalance,
  ]);

  // -------- restore & persist scroll position of the table --------
  useEffect(() => {
    const cache = getGlobalCache();
    const snap = cache[baseKey] || {};
    const targetTop = Number(snap?.scroll?.top) || 0;
    const targetLeft = Number(snap?.scroll?.left) || 0;

    let tries = 0;
    const maxTries = 8;

    const tryRestore = () => {
      const scroller = tableRef.current?.scrollRef?.current;
      if (!scroller) {
        if (tries++ < maxTries) requestAnimationFrame(tryRestore);
        return;
      }

      // wait until content is measurable
      const ready =
        scroller.scrollHeight > scroller.clientHeight ||
        scroller.scrollWidth > scroller.clientWidth;

      if (!ready && tries++ < maxTries) {
        requestAnimationFrame(tryRestore);
        return;
      }

      scroller.scrollTop = targetTop;
      scroller.scrollLeft = targetLeft;
    };

    // run twice to ensure DOM paint done
    requestAnimationFrame(() => requestAnimationFrame(tryRestore));

    // save on scroll
    const scroller = tableRef.current?.scrollRef?.current;
    if (!scroller) return;
    const onScroll = () => {
      const cacheNow = getGlobalCache();
      const prev = cacheNow[baseKey] || {};
      cacheNow[baseKey] = {
        ...prev,
        scroll: { top: scroller.scrollTop, left: scroller.scrollLeft },
      };
    };
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => scroller.removeEventListener("scroll", onScroll);
  }, [arInquiryData.length, columnConfig.length]);

  // export
  const handleExport = useCallback(async () => {
    const rows = dataRefs.current.arInquiry;
    const colsInq = colRefs.current.arInquiry;
    if (!Array.isArray(rows) || rows.length === 0) return;

    setExporting(true);
    try {



  const exportData = {
        "Data" : {
          "AR Query Detailed" : rows
        }
      }

      const columnConfigsMap = {
          "AR Query Detailed": colsInq 
      };


      const payload = {
        ReportName: "AR Inquiry Report",
        UserCode: currentUserRow?.userName,
        Branch: branchCode || "",
        JsonData: exportData,
        companyName:companyInfo?.compName,
        companyAddress:companyInfo?.compAddr,
        companyTelNo:companyInfo?.telNo
      };
    

      await exportGenericHistoryExcel(payload, columnConfigsMap);



      // const sheetConfigs = [makeSheet("AR Inquiry Report", rows, colsInq)];
      // const sheets = exportBuildJsonSheets(sheetConfigs);
      // const jsonResult = exportToTabbedJson(sheets);
      // const payload = {
      //   Branch: branchCode,
      //   ReportName: sheetConfigs[0].sheetName,
      //   UserCode: user?.USER_CODE,
      //   JsonData: jsonResult,
      // };
      // await exportHistoryExcel("/exportHistoryReport", JSON.stringify(payload), setExporting, payload.ReportName);




    } catch (e) {
      console.error("❌ Export failed:", e);
    } finally {
      setExporting(false);
    }
  }, [branchCode, user]);

  // register action bar handlers
  useEffect(() => {
    registerActions?.({
      onFind: fetchRecord,
      onReset: handleReset,
      onPrint: () => window.print(),
      onExport: handleExport,
      onViewDoc: undefined,
    });
  }, [registerActions, fetchRecord, handleReset, handleExport]);

  const handleViewRow = useCallback((row) => {
    const url = `${window.location.origin}${row.pathUrl}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  // initial table UI state from cache (if any)
  const initialTableState = getGlobalCache()[baseKey]?.table || undefined;

  return (
    <div>
      {(showSpinner || exporting) && <LoadingSpinner />}

      {/* === Filters + Summary (Redesigned) === */}
    <div id="summary" className="global-tran-tab-div-ui">
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-gray-200">
            {/* Customer Details */}
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
                  onLookup={() => updateState({ showCustomerModal: true })}
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

            {/* Date Range */}
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

            {/* Financial Summary */}
            <aside className="p-5 bg-gray-50">
              <h3 className="flex items-center gap-2 text-gray-800 font-semibold mb-4">
                <FontAwesomeIcon className="text-blue-600" icon={faChartLine} />
                AR Balance Summary
              </h3>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Beginning Balance:</span>
                  <span className="font-semibold text-gray-800">{beginningBalance}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Total Debit:</span>
                  <span className="font-semibold text-red-600">{totalDebit}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Total Credit:</span>
                  <span className="font-semibold text-green-600">{totalCredit}</span>
                </div>
                <div className="border-t pt-3 flex items-center justify-between">
                  <span className="text-gray-700">Ending Balance:</span>
                  <span className="font-bold text-blue-600">{endingBalance}</span>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>

      {/* === Table Section (unchanged layout, minor tidy) === */}
      <div id="summary" className="global-tran-tab-div-ui">
        <div className="global-tran-tab-nav-ui">
          <div className="flex flex-row sm:flex-row">
            <button className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">
              Transaction Details
            </button>
          </div>
        </div>

      <div className="global-tran-table-main-div-ui">
        
            <SearchGlobalReportTable
              ref={tableRef}
              columns={columnConfig}
              data={arInquiryData}
              itemsPerPage={50}
              showFilters={true}
              rightActionLabel="View"
              onRowAction={handleViewRow}
              className="mt-2"
              initialState={initialTableState}
              docType="AR Inquiry Report"
              onStateChange={(tbl) => {
                tableStateRef.current = tbl;
                const cache = getGlobalCache();
                const prev = cache[baseKey] || {};
                cache[baseKey] = { ...prev, table: tbl };
              }}
            />
        
        </div>

      </div>

      {/* === Modals (unchanged) === */}
      {showBranchModal && (
        <BranchLookupModal
          isOpen={showBranchModal}
          onClose={(selectedBranch) => {
            if (selectedBranch) {
              filterReset(),
              updateState({
                branchCode: selectedBranch.branchCode,
                branchName: selectedBranch.branchName,
              });
            }
            updateState({ showBranchModal: false });
          }}
        />
      )}

      {showCustomerModal && (
        <CustomerMastLookupModal
          isOpen={showCustomerModal}
          onClose={(selectedCustomer) => {
            if (selectedCustomer) {
              filterReset(),
              updateState({
                custCode: selectedCustomer.custCode,
                custName: selectedCustomer.custName,
                arInquiryData: [],
                beginningBalance: "0.00",
                totalDebit: "0.00",
                totalCredit: "0.00",
                endingBalance: "0.00",
              });
            }
            updateState({ showCustomerModal: false });
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
                  // validate ending cutoff
                  if (selectedCutoff.cutoffCode < startingCutoff) {
                    useSwalErrorAlert("","","endingCutoff");
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
});

export default ARInquiryTab;
