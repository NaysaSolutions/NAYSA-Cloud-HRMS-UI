
import React, { useState, useEffect } from "react";
import GlobalLookupModalv1 from "@/NAYSA Cloud/Lookup/SearchGlobalLookupv1.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faListAlt, faTableList } from "@fortawesome/free-solid-svg-icons";

const GlobalCombinedLookup = ({
  isOpen,
  title = "Lookup",
  onCancel,
  onClose,
  summaryColumns,
  detailColumns,
  summaryData: initialSummaryData,
  fetchDetailApi,
  summarySelectionMode = "multiple",
  tabTitles = ["Summary", "Details"]
}) => {
  const [activeTab, setActiveTab] = useState("Summary");
  const [summaryData, setSummaryData] = useState([]);
  const [detailData, setDetailData] = useState([]);
  const [loading, setLoading] = useState(false);

  const [selectedDetailCount, setSelectedDetailCount] = useState(0);
  const [detailKey, setDetailKey] = useState(0);
  const [loadedFingerprint, setLoadedFingerprint] = useState("");
  const [selectedSummaryIds, setSelectedSummaryIds] = useState([]);

  useEffect(() => {
    if (isOpen) {
      setSummaryData(initialSummaryData || []);
      setDetailData([]);
      setLoadedFingerprint("");
      setSelectedSummaryIds([]);
      setActiveTab("Summary");
    }
  }, [isOpen, initialSummaryData]);

  const handleTabDetailClick = () => {
    if (detailData.length === 0) return;
    setActiveTab("Detail");
  };

  const resetLoadedDetails = () => {
    if (detailData.length === 0 && !loadedFingerprint && selectedSummaryIds.length === 0) {
      return;
    }

    setDetailData([]);
    setLoadedFingerprint("");
    setSelectedSummaryIds([]);
    setSelectedDetailCount(0);
    setDetailKey(prev => prev + 1);
  };

  const handleSummaryAction = async (payload) => {
    const selectedIds = payload.data || [];
    if (selectedIds.length === 0) return;

    setSelectedSummaryIds(selectedIds);
    const currentFingerprint = selectedIds.sort().join(",");

    if (currentFingerprint === loadedFingerprint && detailData.length > 0) {
      setActiveTab("Detail");
      return;
    }

    setLoading(true);
    try {
      const res = await fetchDetailApi(selectedIds);
      const rawData = res?.data?.[0]?.result ? JSON.parse(res.data[0].result) : (res.data || res);
      const dataArray = Array.isArray(rawData) ? rawData : [];

      setDetailData(dataArray);
      setLoadedFingerprint(currentFingerprint);

      setSelectedDetailCount(0);
      setDetailKey(prev => prev + 1);
      setActiveTab("Detail");
    } catch (err) {
      console.error("Error updating detail data:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const isDetailEnabled = detailData.length > 0;

  const tabBaseClass =
    "flex h-8 w-40 items-center justify-center gap-2 rounded-md px-3 text-[11px] font-semibold transition-all";

  const TabHeader = (
    <div className="flex w-full flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 flex-col pl-2 sm:pl-3">
        <div className="global-lookup-headertext-ui leading-tight">{title}</div>
        <div className="mt-0.5 text-[10px] font-medium text-slate-400">
          Select a summary record, then load and confirm detail rows.
        </div>
      </div>

      <div className="flex items-center rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setActiveTab("Summary"); }}
        className={`${tabBaseClass} ${
          activeTab === "Summary"
            ? "bg-blue-50 text-blue-700 shadow-sm"
            : "text-slate-500 hover:bg-slate-50"
        }`}
      >
        <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] ${
          activeTab === "Summary" ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500"
        }`}>
          <FontAwesomeIcon icon={faListAlt} className="text-[9px]" />
        </span>
        {tabTitles[0]}
      </button>

      <button
        type="button"
        disabled={!isDetailEnabled}
        onClick={(e) => {
          e.stopPropagation();
          if (activeTab === "Detail") return;
          handleTabDetailClick();
        }}
        className={`${tabBaseClass} ${
          activeTab === "Detail"
            ? "bg-blue-50 text-blue-700 shadow-sm"
            : isDetailEnabled
              ? "text-slate-500 hover:bg-slate-50"
              : "text-slate-300"
        }`}
      >
        <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] ${
          activeTab === "Detail" ? "bg-blue-600 text-white" : isDetailEnabled ? "bg-slate-300 text-white" : "bg-slate-100 text-slate-300"
        }`}>
          <FontAwesomeIcon icon={faTableList} className="text-[9px]" />
        </span>
        {tabTitles[1]}
        {isDetailEnabled && (
          <span className="rounded-full bg-white px-1.5 py-0.5 text-[9px] text-blue-700 ring-1 ring-blue-100">
            {activeTab === "Detail" ? selectedDetailCount : detailData.length}
          </span>
        )}
      </button>
      </div>
    </div>
  );

  return (
    <>
      <div
        className={`transition-all duration-200 ${
          activeTab === "Summary"
            ? "block opacity-100"
            : "hidden opacity-0"
        }`}
      >
        <GlobalLookupModalv1
          isOpen={isOpen}
          title={TabHeader}
          endpoint={summaryColumns}
          data={summaryData}
          btnCaption={detailData.length > 0 ? `Update/View ${tabTitles[1]} ->` : `Load ${tabTitles[1]} ->`}
          singleSelect={summarySelectionMode === "single"}
          onSelectionReset={resetLoadedDetails}
          onClose={handleSummaryAction}
          onCancel={onCancel}
          modalMaxWidthClass="max-w-[86rem]"
          exportFileName={tabTitles[0]}
        />
      </div>

      <div
        className={`transition-all duration-200 ${
          activeTab === "Detail"
            ? "block opacity-100"
            : "hidden opacity-0"
        }`}
      >
        <GlobalLookupModalv1
          key={detailKey}
          isOpen={isOpen}
          title={TabHeader}
          endpoint={detailColumns}
          data={detailData}
          btnCaption="Confirm Final Selection"
          singleSelect={false}
          onSelectionChange={(rows) => setSelectedDetailCount(rows.length)}
          onClose={(finalPayload) => {
          const selectedIds = finalPayload.data || [];

          // 1. Map IDs back to full Detail objects
          // Note: Replace 'prId' or 'PRNo' with the actual primary key field name of your detail rows
          const selectedDetailRows =
            Array.isArray(finalPayload.records) && finalPayload.records.length > 0
              ? finalPayload.records
              : detailData.filter((row) => selectedIds.includes(row.groupId));

          // 2. Map loaded Summary IDs back to full Summary objects
          // Using the state 'selectedSummaryIds' we captured during handleSummaryAction
          const selectedSummaries = summaryData.filter((item) =>
            selectedSummaryIds.includes(item.groupId)
          );

          onClose({
            details: selectedDetailRows, // Now passes Array of Objects, not IDs
            summary: selectedSummaries   // Now passes the Header data
          });
        }}
          onCancel={onCancel}
          modalMaxWidthClass="max-w-[86rem]"
          exportFileName={tabTitles[1]}
        />
      </div>

      {loading && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-white/40">
          <LoadingSpinner />
        </div>
      )}
    </>
  );
};

export default GlobalCombinedLookup;
