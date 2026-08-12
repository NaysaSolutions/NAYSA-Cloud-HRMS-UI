
import { useEffect, useState, useRef, useCallback, forwardRef, useMemo } from "react";
import { fetchData } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMagnifyingGlass,
  faUser,
  faSliders,
  faTableList,
  faCalendarDays,
} from "@fortawesome/free-solid-svg-icons";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import {exportGenericHistoryExcel} from "@/NAYSA Cloud/Global/report";
import BranchLookupModal from "@/NAYSA Cloud/Lookup/SearchBranchRef";
import CustomerMastLookupModal from "@/NAYSA Cloud/Lookup/SearchCustMast";
import COAMastLookupModal from "@/NAYSA Cloud/Lookup/SearchCOAMast.jsx";
import { useSelectedHSColConfig } from "@/NAYSA Cloud/Global/selectedData";
import { formatNumber, parseFormattedNumber } from "@/NAYSA Cloud/Global/behavior.jsx";
import SearchGlobalReportTable from "@/NAYSA Cloud/Lookup/SearchGlobalReportTable.jsx";
import { useSwalErrorAlert } from "@/NAYSA Cloud/Global/behavior.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import DateFormatInput from '@/NAYSA Cloud/Global/DateFormatInput.jsx';

import {
  useGetCurrentDayV2,
  useformatToDatev2
} from '@/NAYSA Cloud/Global/dates';

const ENDPOINT = "getARAging";
const COLS_KEY_BOTTOM = "getARAging";    // detail columns
const COLS_KEY_TOP    = "getARInquiryS"; // summary columns (for totals)

/** Light global cache */
function getGlobalCache() {
  if (typeof window !== "undefined") {
    if (!window.__NAYSA_ARAGE_CACHE__) window.__NAYSA_ARAGE_CACHE__ = {};
    return window.__NAYSA_ARAGE_CACHE__;
  }
  return {};
}

/** Column-config loader with fallback to direct API call */
async function getHSColsSafe(endpointKey) {
  try {
    const cols = await useSelectedHSColConfig(endpointKey);
    if (Array.isArray(cols)) return cols;
  } catch (e) {
    console.warn("useSelectedHSColConfig failed; falling back to /getHSColConfig:", e);
  }

  try {
    const res = await fetchData("getHSColConfig", { params: { endpoint: endpointKey } });
    const data = Array.isArray(res?.data) ? res.data : (res?.data?.data ?? []);
    if (!Array.isArray(data)) throw new Error("Invalid getHSColConfig response shape");
    return data;
  } catch (e) {
    const res2 = await fetchData("getHSColConfig", { endpoint: endpointKey });
    const data2 = Array.isArray(res2?.data) ? res2.data : (res2?.data?.data ?? []);
    if (!Array.isArray(data2)) throw new Error("Invalid getHSColConfig (POST) response shape");
    return data2;
  }
}

/** De-dup + 429 backoff */
function useRequestCoalescer() {
  const inflightMap = useRef(new Map());
  const resultCache = useRef(new Map());

  const requestOnce = useCallback(async (key, fn, { attempts = 3 } = {}) => {
    if (resultCache.current.has(key)) return resultCache.current.get(key);
    if (inflightMap.current.has(key)) return inflightMap.current.get(key);

    const run = async () => {
      let lastErr;
      for (let i = 0; i < attempts; i++) {
        try {
          const res = await fn();
          resultCache.current.set(key, res);
          return res;
        } catch (e) {
          lastErr = e;
          const status = e?.response?.status ?? e?.status;
          if (status !== 429 || i === attempts - 1) throw e;
          const ra = Number(e?.response?.headers?.["retry-after"]);
          const backoff = Number.isFinite(ra) ? ra * 1000 : 500 * 2 ** i;
          await new Promise((r) => setTimeout(r, backoff));
        }
      }
      throw lastErr;
    };

    const p = run().finally(() => inflightMap.current.delete(key));
    inflightMap.current.set(key, p);
    return p;
  }, []);

  return { requestOnce, inflightMap, resultCache };
}

const ARAgingSummaryTab = forwardRef(function ARAgingSummaryTab({ registerActions }, ref) {
  const { user,companyInfo, currentUserRow, refsLoaded, refsLoading } = useAuth();
  const baseKey = "AR_AGING";
  const hydratedRef = useRef(false);

  const [state, setState] = useState({
    branchCode: currentUserRow.branchCode,
    branchName: currentUserRow.branchName,
    custCode: "",
    custName: "",
    refDate: useGetCurrentDayV2(),
    arAgingDataUnfiltered: [],  // detail (for export)
    arAgingData: [],            // detail table rows
    arAgingDataS: [],           // summary table rows (from getARInquiryS)
    columnConfig: [],           // detail columns
    columnConfigS: [],          // summary columns
    acctCode: "",
    acctName: "",
    showBranchModal: false,
    showCustomerModal: false,
    showAccountModal: false,
    isLoading: false,
    showSpinner: false,
  });
  const updateState = (u) => setState((p) => ({ ...p, ...u }));
  const {
    branchCode, branchName, custCode, custName, refDate,
    arAgingData, arAgingDataS, columnConfig, columnConfigS, arAgingDataUnfiltered,
    acctCode, acctName, isLoading, showSpinner,
    showBranchModal, showCustomerModal, showAccountModal,
  } = state;

  // refs for tables and their UI states
  const tableRefTop = useRef(null);
  const tableRefBottom = useRef(null);
  const tableStateTopRef = useRef({ filters: {}, sortConfig: { key: null, direction: null }, currentPage: 1 });
  const tableStateBottomRef = useRef({ filters: {}, sortConfig: { key: null, direction: null }, currentPage: 1 });

  // spinner smoothing
  useEffect(() => {
    let t;
    if (isLoading) t = setTimeout(() => updateState({ showSpinner: true }), 200);
    else updateState({ showSpinner: false });
    return () => clearTimeout(t);
  }, [isLoading]);



  const handleReset = useCallback(async () => {
    updateState({
      custCode: "",
      custName: "",
      acctCode: "",
      acctName: "",
      refDate: useGetCurrentDayV2(),
      arAgingData: [],
      arAgingDataS: [],
      arAgingDataUnfiltered: [],
    });
  }, []);

  const { requestOnce } = useRequestCoalescer();

  // load columns once
  const loadedColsOnceRef = useRef(false);
  useEffect(() => {
    if (loadedColsOnceRef.current) return;
    let alive = true;

    (async () => {
      try {
        const [colsBottom, colsTop] = await Promise.all([
          requestOnce(`cols:${COLS_KEY_BOTTOM}`, () => getHSColsSafe(COLS_KEY_BOTTOM)),
          requestOnce(`cols:${COLS_KEY_TOP}`,    () => getHSColsSafe(COLS_KEY_TOP)),
        ]);
        if (!alive) return;

        setState(prev => ({
          ...prev,
          columnConfig:  Array.isArray(colsBottom) ? colsBottom.map(c => ({ ...c })) : [],
          columnConfigS: Array.isArray(colsTop)    ? colsTop.map(c => ({ ...c }))    : [],
        }));

        loadedColsOnceRef.current = true;
      } catch (e) {
        console.error("Load column config failed:", e);
      }
    })();

    return () => { alive = false; };
  }, [requestOnce]);



  // fetch both summary & detail
  const fetchRecord = useCallback(async () => {
  updateState({ isLoading: true });

  try {
    const response = await requestOnce(
      `rows:${ENDPOINT}:${branchCode}:${custCode}:${refDate}:${acctCode}`,
      () =>
        fetchData(ENDPOINT, {
          json_data: { json_data: { branchCode, custCode, refDate, acctCode } },
        })
    );

    const custData = response?.data?.[0]?.result
      ? JSON.parse(response.data[0].result)
      : [];

    const rowsBottom = custData?.[0]?.dt1 ?? [];
    const rowsTop = custData?.[0]?.dt2 ?? [];

    const safeRowsBottom = Array.isArray(rowsBottom) ? rowsBottom : [];
    const safeRowsTop = Array.isArray(rowsTop) ? rowsTop : [];

     console.log(safeRowsBottom)
    if (safeRowsBottom.length === 0 && safeRowsTop.length === 0) {
      updateState({
        arAgingData: [],
        arAgingDataUnfiltered: [],
        arAgingDataS: [],
        custCode:"",
        custName:"",
      });

       useSwalErrorAlert("AR Aging", "No records found.");
      return;
    }

    updateState({
      arAgingData: safeRowsBottom,
      arAgingDataUnfiltered: safeRowsBottom,
      arAgingDataS: safeRowsTop,
    });
  } catch (err) {
    console.error("Error fetching data:", err);
  } finally {
    updateState({ isLoading: false });
  }
}, [branchCode, custCode, refDate, acctCode, requestOnce]);



  // fetch detail per selected summary row
  const fetchRecordperCustomer = useCallback(async (selectedCustomer) => {
    updateState({ isLoading: true });
    try {
      const response = await fetchData(ENDPOINT, {
        json_data: { json_data: { branchCode, custCode: selectedCustomer, refDate, acctCode } },
      });
      const custData = response?.data?.[0]?.result ? JSON.parse(response.data[0].result) : [];
      const rowsBottom = custData?.[0]?.dt1 ?? [];
      updateState({ arAgingData: Array.isArray(rowsBottom) ? rowsBottom : [] });
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      updateState({ isLoading: false });
    }
  }, [branchCode, refDate, acctCode]);

  // hydrate from cache / defaults
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (hydratedRef.current) return;
      const cache = getGlobalCache();
      const snap = cache[baseKey];

      const hasValidCache =
        !!snap &&
        (snap.branchCode ||
         snap.refDate ||
         snap.acctCode ||
         (Array.isArray(snap.arAgingData) && snap.arAgingData.length > 0) ||
         (Array.isArray(snap.arAgingDataS) && snap.arAgingDataS.length > 0));

      if (hasValidCache) {
        if (!cancelled) {
          setState(prev => ({
            ...prev,
            branchCode: snap.branchCode ?? prev.branchCode,
            branchName: snap.branchName ?? prev.branchName,
            custCode: snap.custCode ?? prev.custCode,
            custName: snap.custName ?? prev.custName,
            refDate: snap.refDate ?? prev.refDate,
            acctCode: snap.acctCode ?? prev.acctCode,
            acctName: snap.acctName ?? prev.acctName,
            arAgingData:  Array.isArray(snap.arAgingData)  ? snap.arAgingData  : prev.arAgingData,
            arAgingDataS: Array.isArray(snap.arAgingDataS) ? snap.arAgingDataS : prev.arAgingDataS,
            columnConfig:  Array.isArray(snap.columnConfig)  ? snap.columnConfig  : prev.columnConfig,
            columnConfigS: Array.isArray(snap.columnConfigS) ? snap.columnConfigS : prev.columnConfigS,
          }));
          tableStateTopRef.current    = snap.tableTop    || tableStateTopRef.current;
          tableStateBottomRef.current = snap.tableBottom || tableStateBottomRef.current;
          hydratedRef.current = true;
        }
        return;
      }

      if (!user?.USER_CODE) return;
      await handleReset();
      hydratedRef.current = true;
    };
    run();
    return () => { cancelled = true; };
  }, [user?.USER_CODE, handleReset]);

  // snapshot to cache
  useEffect(() => {
    if (!hydratedRef.current) return;
    const cache = getGlobalCache();
    const prev = cache[baseKey] || {};
    cache[baseKey] = {
      ...prev,
      branchCode, branchName, custCode, custName, refDate,
      acctCode, acctName,
      arAgingData, arAgingDataS,
      columnConfig, columnConfigS,
      tableTop: tableStateTopRef.current,
      tableBottom: tableStateBottomRef.current,
      scrollTop: prev.scrollTop || { top: 0, left: 0 },
      scrollBottom: prev.scrollBottom || { top: 0, left: 0 },
    };
  }, [
    branchCode, branchName, custCode, custName,
    refDate, acctCode, acctName,
    arAgingData, arAgingDataS, columnConfig, columnConfigS,
  ]);

  // restore & persist scroll: TOP
  useEffect(() => {
    const cache = getGlobalCache();
    const snap = cache[baseKey] || {};
    const targetTop = Number(snap?.scrollTop?.top) || 0;
    const targetLeft = Number(snap?.scrollTop?.left) || 0;

    let tries = 0;
    const maxTries = 8;

    const tryRestore = () => {
      const scroller = tableRefTop.current?.scrollRef?.current;
      if (!scroller) {
        if (tries++ < maxTries) requestAnimationFrame(tryRestore);
        return;
      }
      const ready = scroller.scrollHeight > scroller.clientHeight || scroller.scrollWidth > scroller.clientWidth;
      if (!ready && tries++ < maxTries) {
        requestAnimationFrame(tryRestore);
        return;
      }
      scroller.scrollTop = targetTop;
      scroller.scrollLeft = targetLeft;
    };

    requestAnimationFrame(() => requestAnimationFrame(tryRestore));

    const scroller = tableRefTop.current?.scrollRef?.current;
    if (!scroller) return;
    const onScroll = () => {
      const cacheNow = getGlobalCache();
      const prev = cacheNow[baseKey] || {};
      cacheNow[baseKey] = { ...prev, scrollTop: { top: scroller.scrollTop, left: scroller.scrollLeft } };
    };
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => scroller.removeEventListener("scroll", onScroll);
  }, [arAgingDataS.length, columnConfigS.length]);

  // restore & persist scroll: BOTTOM
  useEffect(() => {
    const cache = getGlobalCache();
    const snap = cache[baseKey] || {};
    const targetTop = Number(snap?.scrollBottom?.top) || 0;
    const targetLeft = Number(snap?.scrollBottom?.left) || 0;

    let tries = 0;
    const maxTries = 8;

    const tryRestore = () => {
      const scroller = tableRefBottom.current?.scrollRef?.current;
      if (!scroller) {
        if (tries++ < maxTries) requestAnimationFrame(tryRestore);
        return;
      }
      const ready = scroller.scrollHeight > scroller.clientHeight || scroller.scrollWidth > scroller.clientWidth;
      if (!ready && tries++ < maxTries) {
        requestAnimationFrame(tryRestore);
        return;
      }
      scroller.scrollTop = targetTop;
      scroller.scrollLeft = targetLeft;
    };

    requestAnimationFrame(() => requestAnimationFrame(tryRestore));

    const scroller = tableRefBottom.current?.scrollRef?.current;
    if (!scroller) return;
    const onScroll = () => {
      const cacheNow = getGlobalCache();
      const prev = cacheNow[baseKey] || {};
      cacheNow[baseKey] = { ...prev, scrollBottom: { top: scroller.scrollTop, left: scroller.scrollLeft } };
    };
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => scroller.removeEventListener("scroll", onScroll);
  }, [arAgingData.length, columnConfig.length]);

  // export
  const handleExport = useCallback(async () => {
    try {
      updateState({ isLoading: true });
    

        const exportData = {
              "Data" : {
                "AR Aging Summary" : arAgingDataS,
                "AR Aging Detailed" : arAgingDataUnfiltered,
              }
            }
      
        const columnConfigsMap = {
                "AR Aging Summary" : columnConfigS,
                "AR Aging Detailed" : columnConfig,
              }
            
        const payload = {
              ReportName: "AR Aging Report",
              UserCode: currentUserRow?.userName,
              Branch: branchCode || "",
              JsonData: exportData,
              companyName:companyInfo?.compName,
              companyAddress:companyInfo?.compAddr,
              companyTelNo:companyInfo?.telNo
            };
          
      
        await exportGenericHistoryExcel(payload, columnConfigsMap);



    } catch (e) {
      console.error("❌ Export failed:", e);
    } finally {
      updateState({ isLoading: false });
    }
  }, [arAgingDataUnfiltered, arAgingDataS, columnConfig, columnConfigS, branchCode, refDate, user]);

  // register actions
  useEffect(() => {
    registerActions?.({
      onFind: fetchRecord,
      onReset: handleReset,
      onPrint: () => window.print(),
      onExport: handleExport,
      onViewDoc: undefined,
    });
  }, [registerActions, fetchRecord, handleReset, handleExport]);

  const handleViewTop = useCallback((row) => {
    fetchRecordperCustomer(row.custCode);
    updateState({ custName: row.custName, custCode: row.custCode });
  }, [fetchRecordperCustomer]);

  const handleViewRow = useCallback((row) => {
    const url = `${window.location.origin}${row.pathUrl}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  // —— Totals for Filter Summary (from SUMMARY rows: getARInquiryS) ——
  // Outstanding Balance = sum(amountDue)
  // Current             = sum(dayCurrent)
  // Amount Due          = sum(amountDue - dayCurrent)
  const sums = useMemo(() => {
    const rows = Array.isArray(arAgingDataS) ? arAgingDataS : [];
    let outstanding = 0, current = 0, amountDue = 0;

    for (const r of rows) {
      const amt = (typeof parseFormattedNumber === "function"
        ? parseFormattedNumber(r?.amountDue)
        : Number(r?.amountDue)) || 0;

      const cur = (typeof parseFormattedNumber === "function"
        ? parseFormattedNumber(r?.dayCurrent)
        : Number(r?.dayCurrent)) || 0;

      outstanding += isNaN(amt) ? 0 : amt;
      current     += isNaN(cur) ? 0 : cur;
      amountDue   += (isNaN(amt) ? 0 : amt) - (isNaN(cur) ? 0 : cur);
    }

    const fmt = (n) =>
      typeof formatNumber === "function"
        ? formatNumber(n)
        : (n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return {
      outstanding: fmt(outstanding),
      current: fmt(current),
      amountDue: fmt(amountDue),
    };
  }, [arAgingDataS]);

  // initial UI states
  const initialStateTop = getGlobalCache()[baseKey]?.tableTop || undefined;
  const initialStateBottom = getGlobalCache()[baseKey]?.tableBottom || undefined;

  return (
    <div>
      {showSpinner && <LoadingSpinner />}

      {/* === Redesigned Filters Card (3-panel) === */}
      <div className="global-tran-tab-div-ui">
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-gray-200">
            {/* Customer / Account / Date */}
            <section className="p-5">
              <h3 className="flex items-center gap-2 text-gray-800 font-semibold mb-4">
                <FontAwesomeIcon className="text-blue-600" icon={faUser} />
                Customer & Account
              </h3>

              <div className="space-y-3">
                <FieldRenderer
                  id="branchName"
                  name="branchName"
                  label="Branch"
                  type="lookup"
                  value={branchName || ""}
                  readOnly
                  disabled={isLoading}
                  onLookup={() => updateState({ showBranchModal: true })}
                />

                <div className="relative w-full">
                  <div
                    className={`flex items-stretch global-ref-textbox-ui ${
                      !isLoading
                        ? "global-ref-textbox-enabled"
                        : "global-ref-textbox-disabled"
                    }`}
                  >
                    <DateFormatInput
                      id="refDate"
                      className="peer flex-grow bg-transparent border-none px-3 focus:outline-none cursor-pointer"
                      value={refDate}
                      disabled={isLoading}
                      updateState={updateState}
                    />
                  </div>
                  <label htmlFor="refDate" className="global-ref-floating-label">
                    Reference Date
                  </label>
                </div>

                <FieldRenderer
                  id="acctName"
                  name="acctName"
                  label="AR Account"
                  type="lookup"
                  value={acctName || ""}
                  readOnly
                  disabled={isLoading}
                  onLookup={() => updateState({ showAccountModal: true })}
                />
              </div>
            </section>

            {/* Customer Fields */}
            <section className="p-5">
              <h3 className="flex items-center gap-2 text-gray-800 font-semibold mb-4">
                <FontAwesomeIcon className="text-blue-600" icon={faSliders} />
                Filters
              </h3>

              <div className="space-y-3">
                <FieldRenderer
                  id="custCode"
                  name="custCode"
                  label="Customer Code"
                  type="lookup"
                  value={custCode || ""}
                  disabled={isLoading}
                  onChange={(val) => updateState({ custCode: val })}
                  onLookup={() => updateState({ showCustomerModal: true })}
                />

                <FieldRenderer
                  id="custName"
                  name="custName"
                  label="Customer Name"
                  type="text"
                  value={custName || ""}
                  disabled
                  readOnly
                />
              </div>
            </section>

            {/* Filter Summary */}
            <aside className="p-5 bg-gray-50">
              <h3 className="flex items-center gap-2 text-gray-800 font-semibold mb-4">
                <FontAwesomeIcon className="text-blue-600" icon={faTableList} />
                Filter Summary
              </h3>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Amount Due:</span>
                  <span className="font-semibold text-blue-600">{sums.outstanding}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Current:</span>
                  <span className="font-semibold text-blue-600">{sums.current}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Over Due:</span>
                  <span className="font-semibold text-blue-600">{sums.amountDue}</span>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>

      {/* Summary (TOP) */}
      <div className="global-tran-tab-div-ui">
        <div className="global-tran-tab-nav-ui">
          <div className="flex flex-row sm:flex-row">
            <button className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">Summary</button>
          </div>
        </div>


        <div className="global-tran-table-main-div-ui">
            <SearchGlobalReportTable
              ref={tableRefTop}
              columns={columnConfigS}
              data={arAgingDataS}
              itemsPerPage={50}
              showFilters={true}
              rightActionLabel="View"
              onRowAction={handleViewTop}
              className="mt-2"
              docType="AR Aging Summary"
              initialState={initialStateTop}
              onStateChange={(tbl) => {
                tableStateTopRef.current = tbl;
                const cache = getGlobalCache();
                const prev = cache[baseKey] || {};
                cache[baseKey] = { ...prev, tableTop: tbl };
              }}
            />
          </div>
      </div>

      {/* Detailed (BOTTOM) */}
      <div className="global-tran-tab-div-ui">
        <div className="global-tran-tab-nav-ui">
          <div className="flex flex-row sm:flex-row">
            <button className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">Detailed</button>
          </div>
        </div>

        <div className="global-tran-table-main-div-ui">
            <SearchGlobalReportTable
              ref={tableRefBottom}
              columns={columnConfig}
              data={arAgingData}
              itemsPerPage={50}
              showFilters={true}
              rightActionLabel="View"
              onRowAction={handleViewRow}
              className="mt-2"
              docType="AR Advances Detailed"
              initialState={initialStateBottom}
              onStateChange={(tbl) => {
                tableStateBottomRef.current = tbl;
                const cache = getGlobalCache();
                const prev = cache[baseKey] || {};
                cache[baseKey] = { ...prev, tableBottom: tbl };
              }}
            />
          </div>
      </div>

      {/* Modals */}
      {showBranchModal && (
        <BranchLookupModal
          isOpen={showBranchModal}
          onClose={(selectedBranch) => {
            if (selectedBranch) {
              updateState({
                branchCode: selectedBranch.branchCode,
                branchName: selectedBranch.branchName,
                acctCode: "",
                acctName: "",
                arAgingData: [],
                arAgingDataS: [],
                arAgingDataUnfiltered: [],
              });
            }
            updateState({ showBranchModal: false });
          }}
        />
      )}

      {showAccountModal && (
        <COAMastLookupModal
          isOpen={showAccountModal}
          customParam={"ARGL"}
          onClose={(selectedAccount) => {
            if (selectedAccount) {
              updateState({
                acctCode: selectedAccount.acctCode,
                acctName: selectedAccount.acctName,
                arAgingData: [],
                arAgingDataS: [],
                arAgingDataUnfiltered: [],
              });
            }
            updateState({ showAccountModal: false });
          }}
        />
      )}

      {showCustomerModal && (
        <CustomerMastLookupModal
          isOpen={showCustomerModal}
          onClose={(selectedCustomer) => {
            if (selectedCustomer) {
              updateState({
                custCode: selectedCustomer.custCode,
                custName: selectedCustomer.custName,
                arAgingData: [],
                arAgingDataS: [],
                arAgingDataUnfiltered: [],
              });
            }
            updateState({ showCustomerModal: false });
          }}
        />
      )}
    </div>
  );
});

export default ARAgingSummaryTab;
