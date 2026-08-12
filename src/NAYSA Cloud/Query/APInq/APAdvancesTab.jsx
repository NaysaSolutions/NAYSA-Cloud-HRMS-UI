

import { useEffect, useState, useRef, useCallback, forwardRef, useMemo } from "react";
import { fetchData } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUser,
  faSliders,
  faTableList,
} from "@fortawesome/free-solid-svg-icons";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import { exportGenericHistoryExcel } from "@/NAYSA Cloud/Global/report";
import BranchLookupModal from "@/NAYSA Cloud/Lookup/SearchBranchRef";
import PayeeMastLookupModal from "@/NAYSA Cloud/Lookup/SearchVendMast";
import { useTopUserRow, useTopBranchRow } from "@/NAYSA Cloud/Global/top1RefTable";
import { useSelectedHSColConfig } from "@/NAYSA Cloud/Global/selectedData";
import {
  formatNumber,
  parseFormattedNumber,
  useSwalErrorAlert,
} from "@/NAYSA Cloud/Global/behavior.jsx";
import SearchGlobalReportTable from "@/NAYSA Cloud/Lookup/SearchGlobalReportTable.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";

const ENDPOINT_DETAIL = "getAPAdvances";
const ENDPOINT_SUMMARY = "getAPAdvances";

/** Light global cache so the tab remembers its UI state across mounts */
function getGlobalCache() {
  if (typeof window !== "undefined") {
    if (!window.__NAYSA_APADV_CACHE__) window.__NAYSA_APADV_CACHE__ = {};
    return window.__NAYSA_APADV_CACHE__;
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
    const data = Array.isArray(res?.data) ? res.data : res?.data?.data ?? [];
    if (!Array.isArray(data)) throw new Error("Invalid getHSColConfig response shape");
    return data;
  } catch (_) {
    const res2 = await fetchData("getHSColConfig", { endpoint: endpointKey });
    const data2 = Array.isArray(res2?.data) ? res2.data : res2?.data?.data ?? [];
    if (!Array.isArray(data2)) throw new Error("Invalid getHSColConfig (POST) response shape");
    return data2;
  }
}

/** Small helper: deduplicate in-flight requests + 429-aware retry */
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

  return { requestOnce };
}

const APAdvancesTab = forwardRef(function APAdvancesTab({ registerActions }, ref) {
  const { user, companyInfo, currentUserRow } = useAuth();
  const baseKey = "AP_ADVANCES";
  const hydratedRef = useRef(false);

  const [state, setState] = useState({
    branchCode: "",
    branchName: "",
    vendCode: "",
    vendName: "",
    status: "Open",
    apAdvancesDataUnfiltered: [],
    apAdvancesData: [],
    apAdvancesDataS: [],
    columnConfig: [],
    columnConfigS: [],
    showBranchModal: false,
    showPayeeModal: false,
    isLoading: false,
    showSpinner: false,
  });

  const updateState = (u) => setState((p) => ({ ...p, ...u }));

  const {
    branchCode,
    branchName,
    vendCode,
    vendName,
    status,
    apAdvancesData,
    apAdvancesDataS,
    apAdvancesDataUnfiltered,
    columnConfig,
    columnConfigS,
    isLoading,
    showSpinner,
    showBranchModal,
    showPayeeModal,
  } = state;

  const tableRefTop = useRef(null);
  const tableRefBottom = useRef(null);

  const tableStateTopRef = useRef({
    filters: {},
    sortConfig: { key: null, direction: null },
    currentPage: 1,
  });

  const tableStateBottomRef = useRef({
    filters: {},
    sortConfig: { key: null, direction: null },
    currentPage: 1,
  });

  useEffect(() => {
    let t;
    if (isLoading) t = setTimeout(() => updateState({ showSpinner: true }), 200);
    else updateState({ showSpinner: false });
    return () => clearTimeout(t);
  }, [isLoading]);

  const loadDefaults = useCallback(async () => {
    updateState({ showSpinner: true });
    try {
      const hsUser = await useTopUserRow(user?.USER_CODE);
      if (hsUser) {
        const hsBranch = await useTopBranchRow(hsUser.branchCode);
        updateState({
          branchCode: hsUser.branchCode,
          branchName: hsBranch?.branchName || hsUser.branchName,
        });
      }
    } catch (err) {
      console.error("Error loading defaults data:", err);
    } finally {
      updateState({ showSpinner: false });
    }
  }, [user?.USER_CODE]);

  const filterReset = useCallback(() => {
    updateState({
      apAdvancesData: [],
      apAdvancesDataS: [],
      apAdvancesDataUnfiltered: [],
    });
  }, []);

  const handleReset = useCallback(async () => {
    updateState({
      vendCode: "",
      vendName: "",
      apAdvancesData: [],
      apAdvancesDataS: [],
      apAdvancesDataUnfiltered: [],
    });
  }, []);

  const { requestOnce } = useRequestCoalescer();

  const loadedColsOnceRef = useRef(false);
  useEffect(() => {
    if (loadedColsOnceRef.current) return;
    let alive = true;

    (async () => {
      try {
        const [colsBottom, colsTop] = await Promise.all([
          requestOnce(`cols:${ENDPOINT_DETAIL}`, () => getHSColsSafe(ENDPOINT_DETAIL)),
          requestOnce(`cols:${ENDPOINT_SUMMARY}`, () => getHSColsSafe(ENDPOINT_SUMMARY)),
        ]);

        if (!alive) return;

        setState((prev) => ({
          ...prev,
          columnConfig: Array.isArray(colsBottom) ? colsBottom.map((c) => ({ ...c })) : [],
          columnConfigS: Array.isArray(colsTop) ? colsTop.map((c) => ({ ...c })) : [],
        }));

        loadedColsOnceRef.current = true;
      } catch (e) {
        console.error("Load column configs failed:", e);
      }
    })();

    return () => {
      alive = false;
    };
  }, [requestOnce]);

  const fetchRecord = useCallback(async () => {
    updateState({ isLoading: true });

    try {
      const [detailRes, summaryRes] = await Promise.all([
        requestOnce(
          `rows:${ENDPOINT_DETAIL}:${branchCode}:${vendCode}:${status}`,
          () =>
            fetchData(ENDPOINT_DETAIL, {
              json_data: { json_data: { branchCode, vendCode, status } },
            })
        ),
        requestOnce(
          `rows:${ENDPOINT_SUMMARY}:${branchCode}:${vendCode}:${status}`,
          () =>
            fetchData(ENDPOINT_SUMMARY, {
              json_data: { json_data: { branchCode, vendCode, status } },
            })
        ),
      ]);

      const dtDetail = detailRes?.data?.[0]?.result
        ? JSON.parse(detailRes.data[0].result)
        : [];

      const dtSummary = summaryRes?.data?.[0]?.result
        ? JSON.parse(summaryRes.data[0].result)
        : [];

      const rowsBottom = Array.isArray(dtDetail?.[0]?.dt1) ? dtDetail[0].dt1 : [];
      const rowsTop = Array.isArray(dtSummary?.[0]?.dt2) ? dtSummary[0].dt2 : [];

      if (rowsBottom.length === 0 && rowsTop.length === 0) {
        updateState({
          apAdvancesData: [],
          apAdvancesDataUnfiltered: [],
          apAdvancesDataS: [],
        });

        useSwalErrorAlert("AP Advances", "No records found.");
        return;
      }

      updateState({
        apAdvancesData: rowsBottom,
        apAdvancesDataUnfiltered: rowsBottom,
        apAdvancesDataS: rowsTop,
      });
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      updateState({ isLoading: false });
    }
  }, [branchCode, vendCode, status, requestOnce]);

  const fetchRecordperPayee = useCallback(
    async (selectedPayee) => {
      updateState({ isLoading: true });
      try {
        const resp = await requestOnce(
          `rows:${ENDPOINT_DETAIL}:${branchCode}:${selectedPayee}:${status}`,
          () =>
            fetchData(ENDPOINT_DETAIL, {
              json_data: {
                json_data: { branchCode, vendCode: selectedPayee, status },
              },
            })
        );

        const dt = resp?.data?.[0]?.result ? JSON.parse(resp.data[0].result) : [];
        const rowsBottom = dt?.[0]?.dt1 ?? dt ?? [];

        updateState({
          apAdvancesData: Array.isArray(rowsBottom) ? rowsBottom : [],
          apAdvancesDataUnfiltered: Array.isArray(rowsBottom) ? rowsBottom : [],
        });
      } catch (e) {
        console.error("Error fetching detail:", e);
      } finally {
        updateState({ isLoading: false });
      }
    },
    [branchCode, status, requestOnce]
  );

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (hydratedRef.current) return;

      const cache = getGlobalCache();
      const snap = cache[baseKey];

      const hasValidCache =
        !!snap &&
        (snap.branchCode ||
          (Array.isArray(snap.apAdvancesData) && snap.apAdvancesData.length > 0) ||
          (Array.isArray(snap.apAdvancesDataS) && snap.apAdvancesDataS.length > 0));

      if (hasValidCache) {
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            branchCode: snap.branchCode ?? prev.branchCode,
            branchName: snap.branchName ?? prev.branchName,
            vendCode: snap.vendCode ?? prev.vendCode,
            vendName: snap.vendName ?? prev.vendName,
            status: snap.status ?? prev.status,
            apAdvancesData: Array.isArray(snap.apAdvancesData)
              ? snap.apAdvancesData
              : prev.apAdvancesData,
            apAdvancesDataS: Array.isArray(snap.apAdvancesDataS)
              ? snap.apAdvancesDataS
              : prev.apAdvancesDataS,
            columnConfig: Array.isArray(snap.columnConfig)
              ? snap.columnConfig
              : prev.columnConfig,
            columnConfigS: Array.isArray(snap.columnConfigS)
              ? snap.columnConfigS
              : prev.columnConfigS,
          }));

          tableStateTopRef.current = snap.tableTop || tableStateTopRef.current;
          tableStateBottomRef.current = snap.tableBottom || tableStateBottomRef.current;
          hydratedRef.current = true;
        }
        return;
      }

      if (!user?.USER_CODE) return;

      await loadDefaults();
      await handleReset();
      hydratedRef.current = true;
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [user?.USER_CODE, loadDefaults, handleReset]);

  useEffect(() => {
    if (!hydratedRef.current) return;

    const cache = getGlobalCache();
    const prev = cache[baseKey] || {};

    cache[baseKey] = {
      ...prev,
      branchCode,
      branchName,
      vendCode,
      vendName,
      status,
      apAdvancesData,
      apAdvancesDataS,
      columnConfig,
      columnConfigS,
      tableTop: tableStateTopRef.current,
      tableBottom: tableStateBottomRef.current,
      scrollTop: prev.scrollTop || { top: 0, left: 0 },
      scrollBottom: prev.scrollBottom || { top: 0, left: 0 },
    };
  }, [
    branchCode,
    branchName,
    vendCode,
    vendName,
    status,
    apAdvancesData,
    apAdvancesDataS,
    columnConfig,
    columnConfigS,
  ]);

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

    requestAnimationFrame(() => requestAnimationFrame(tryRestore));

    const scroller = tableRefTop.current?.scrollRef?.current;
    if (!scroller) return;

    const onScroll = () => {
      const cacheNow = getGlobalCache();
      const prev = cacheNow[baseKey] || {};
      cacheNow[baseKey] = {
        ...prev,
        scrollTop: { top: scroller.scrollTop, left: scroller.scrollLeft },
      };
    };

    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => scroller.removeEventListener("scroll", onScroll);
  }, [apAdvancesDataS.length, columnConfigS.length]);

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

    requestAnimationFrame(() => requestAnimationFrame(tryRestore));

    const scroller = tableRefBottom.current?.scrollRef?.current;
    if (!scroller) return;

    const onScroll = () => {
      const cacheNow = getGlobalCache();
      const prev = cacheNow[baseKey] || {};
      cacheNow[baseKey] = {
        ...prev,
        scrollBottom: { top: scroller.scrollTop, left: scroller.scrollLeft },
      };
    };

    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => scroller.removeEventListener("scroll", onScroll);
  }, [apAdvancesData.length, columnConfig.length]);

  const handleExport = useCallback(async () => {
    try {
      updateState({ isLoading: true });

      const exportData = {
        Data: {
          "AP Advances Summary": apAdvancesDataS,
          "AP Advances Application": apAdvancesDataUnfiltered,
        },
      };

      const columnConfigsMap = {
        "AP Advances Summary": columnConfigS,
        "AP Advances Application": columnConfig,
      };

      const payload = {
        ReportName: "AP Advances Report",
        UserCode: currentUserRow?.userName,
        Branch: branchCode || "",
        JsonData: exportData,
        companyName: companyInfo?.compName,
        companyAddress: companyInfo?.compAddr,
        companyTelNo: companyInfo?.telNo,
      };

      await exportGenericHistoryExcel(payload, columnConfigsMap);
    } catch (e) {
      console.error("❌ Export failed:", e);
    } finally {
      updateState({ isLoading: false });
    }
  }, [
    apAdvancesDataS,
    apAdvancesDataUnfiltered,
    columnConfigS,
    columnConfig,
    branchCode,
    currentUserRow?.userName,
    companyInfo,
  ]);

  useEffect(() => {
    registerActions?.({
      onFind: fetchRecord,
      onReset: handleReset,
      onPrint: () => window.print(),
      onExport: handleExport,
      onViewDoc: undefined,
    });
  }, [registerActions, fetchRecord, handleReset, handleExport]);

  const handleViewTop = useCallback(
    (row) => {
      fetchRecordperPayee(row.vendCode);
      updateState({ vendName: row.vendName, vendCode: row.vendCode });
    },
    [fetchRecordperPayee]
  );

  const handleViewRow = useCallback((row) => {
    const url = `${window.location.origin}${row.pathUrl}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  const totals = useMemo(() => {
    const rows = Array.isArray(apAdvancesDataS) ? apAdvancesDataS : [];
    let adv = 0;
    let appl = 0;
    let bal = 0;

    for (const r of rows) {
      const a =
        (typeof parseFormattedNumber === "function"
          ? parseFormattedNumber(r?.advancesAmount)
          : Number(r?.advancesAmount)) || 0;
      const p =
        (typeof parseFormattedNumber === "function"
          ? parseFormattedNumber(r?.appliedAmount)
          : Number(r?.appliedAmount)) || 0;
      const b =
        (typeof parseFormattedNumber === "function"
          ? parseFormattedNumber(r?.balance)
          : Number(r?.balance)) || 0;

      adv += isNaN(a) ? 0 : a;
      appl += isNaN(p) ? 0 : p;
      bal += isNaN(b) ? 0 : b;
    }

    const fmt =
      typeof formatNumber === "function"
        ? formatNumber
        : (n) =>
            (n || 0).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            });

    return { adv: fmt(adv), appl: fmt(appl), bal: fmt(bal) };
  }, [apAdvancesDataS]);

  const initialStateTop = getGlobalCache()[baseKey]?.tableTop || undefined;
  const initialStateBottom = getGlobalCache()[baseKey]?.tableBottom || undefined;

  return (
    <div>
      {showSpinner && <LoadingSpinner />}

      <div className="global-tran-tab-div-ui">
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-gray-200">
            <section className="p-5">
              <h3 className="flex items-center gap-2 text-gray-800 font-semibold mb-4">
                <FontAwesomeIcon className="text-blue-600" icon={faUser} />
                Payee Details
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

                <FieldRenderer
                  id="vendCode"
                  name="vendCode"
                  label="Payee Code"
                  type="lookup"
                  value={vendCode || ""}
                  disabled={isLoading}
                  onChange={(val) => updateState({ vendCode: val?.target ? val.target.value : val })}
                  onLookup={() => updateState({ showPayeeModal: true })}
                />

                <FieldRenderer
                  id="vendName"
                  name="vendName"
                  label="Payee Name"
                  type="text"
                  value={vendName || ""}
                  disabled
                  readOnly
                />
              </div>
            </section>

            <section className="p-5">
              <h3 className="flex items-center gap-2 text-gray-800 font-semibold mb-4">
                <FontAwesomeIcon className="text-blue-600" icon={faSliders} />
                Filters
              </h3>

              <div className="space-y-3">
                <FieldRenderer
                  id="advStatus"
                  name="advStatus"
                  label="Advances Status"
                  type="select"
                  value={status || ""}
                  disabled={isLoading}
                  onChange={(val) => updateState({ status: val?.target ? val.target.value : val })}
                  options={[
                    { label: "Open", value: "Open" },
                    { label: "Closed", value: "Closed" },
                    { label: "All", value: "All" },
                  ]}
                />
              </div>
            </section>

            <aside className="p-5 bg-gray-50">
              <h3 className="flex items-center gap-2 text-gray-800 font-semibold mb-4">
                <FontAwesomeIcon className="text-blue-600" icon={faTableList} />
                Filter Summary
              </h3>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="font-semibold text-gray-800">{status}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Advances Amount:</span>
                  <span className="font-semibold text-blue-600">{totals.adv}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Applied Amount:</span>
                  <span className="font-semibold text-blue-600">{totals.appl}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Balance:</span>
                  <span className="font-semibold text-blue-600">{totals.bal}</span>
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
            ref={tableRefTop}
            columns={columnConfigS}
            data={apAdvancesDataS}
            itemsPerPage={50}
            showFilters={true}
            rightActionLabel="View"
            onRowAction={handleViewTop}
            className="mt-2"
            initialState={initialStateTop}
            docType="AP Advances Summary"
            onStateChange={(tbl) => {
              tableStateTopRef.current = tbl;
              const cache = getGlobalCache();
              const prev = cache[baseKey] || {};
              cache[baseKey] = { ...prev, tableTop: tbl };
            }}
          />
        </div>
      </div>

      <div className="global-tran-tab-div-ui">
        <div className="global-tran-tab-nav-ui">
          <div className="flex flex-row sm:flex-row">
            <button className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">
              Detailed
            </button>
          </div>
        </div>

        <div className="global-tran-table-main-div-ui">
          <SearchGlobalReportTable
            ref={tableRefBottom}
            columns={columnConfig}
            data={apAdvancesData}
            itemsPerPage={50}
            showFilters={true}
            rightActionLabel="View"
            onRowAction={handleViewRow}
            className="mt-2"
            initialState={initialStateBottom}
            docType="AP Advances Detailed"
            onStateChange={(tbl) => {
              tableStateBottomRef.current = tbl;
              const cache = getGlobalCache();
              const prev = cache[baseKey] || {};
              cache[baseKey] = { ...prev, tableBottom: tbl };
            }}
          />
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

      {showPayeeModal && (
        <PayeeMastLookupModal
          isOpen={showPayeeModal}
          onClose={(selectedPayee) => {
            if (selectedPayee) {
              filterReset();
              updateState({
                vendCode: selectedPayee.vendCode,
                vendName: selectedPayee.vendName,
              });
            }
            updateState({ showPayeeModal: false });
          }}
        />
      )}
    </div>
  );
});

export default APAdvancesTab;
