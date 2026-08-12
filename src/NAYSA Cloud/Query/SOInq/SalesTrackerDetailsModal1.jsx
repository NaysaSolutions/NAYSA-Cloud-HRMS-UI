import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChartLine,
  faExpandAlt,
  faFileInvoiceDollar,
  faHistory,
  faMoneyBillWave,
  faPrint,
  faProjectDiagram,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";

import { postRequest } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

import SalesTrackerDocumentTree from "./SalesTrackerDocumentTree.jsx";
import SalesTrackerInvoiceTab from "./SalesTrackerInvoiceTab.jsx";
import SalesTrackerSettlementTab from "./SalesTrackerSettlementTab.jsx";
import SalesTrackerTimelineTab from "./SalesTrackerTimelineTab.jsx";

const parseDetails = (response) => {
  const resultStr = response?.data?.[0]?.result;
  if (!resultStr) return null;
  try {
    return JSON.parse(resultStr);
  } catch (error) {
    console.error("Sales Tracker detail parse error:", error, resultStr);
    return null;
  }
};

const formatAmount = (value) =>
  Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const formatDate = (value) => (value ? String(value).slice(0, 10) : "");

const tabs = [
  { key: "tree", label: "Document Tree", icon: faProjectDiagram },
  { key: "invoices", label: "Invoices", icon: faFileInvoiceDollar },
  { key: "settlements", label: "Settlements", icon: faMoneyBillWave },
  { key: "timeline", label: "Timeline", icon: faHistory },
  { key: "notes", label: "Notes", icon: faHistory },
];

const tabButtonClass = (activeTab, tab) =>
  `inline-flex h-9 items-center justify-center gap-2 rounded-t-md border px-4 text-[12px] font-bold transition ${
    activeTab === tab
      ? "border-slate-200 border-b-white bg-white text-blue-700 shadow-sm"
      : "border-transparent bg-slate-100 text-slate-600 hover:border-slate-200 hover:bg-white hover:text-blue-700"
  }`;

const SalesTrackerDetailsModal = ({ isOpen, onClose, selectedRow, filters }) => {
  const [activeTab, setActiveTab] = useState("tree");
  const [isLoading, setIsLoading] = useState(false);
  const [details, setDetails] = useState(null);

  const payload = useMemo(() => ({
    json_data: {
      branchCode: filters?.branchCode || selectedRow?.branchCode || "",
      custCode: filters?.custCode || selectedRow?.custCode || "",
      salesRepCode: filters?.salesRepCode || "",
      startDate: filters?.startDate || "",
      endDate: filters?.endDate || "",
      status: filters?.status || "",
      soId: selectedRow?.soId || "",
      soNo: selectedRow?.soNo || selectedRow?.parentSoNo || "",
    },
  }), [filters, selectedRow]);

  const loadDetails = useCallback(async () => {
    if (!selectedRow) return;
    setIsLoading(true);
    try {
      const response = await postRequest("getSalesTrackerDetails", payload);
      setDetails(parseDetails(response));
    } catch (error) {
      console.error("Sales Tracker detail error:", error);
      setDetails(null);
    } finally {
      setIsLoading(false);
    }
  }, [payload, selectedRow]);

  useEffect(() => {
    if (isOpen) {
      setActiveTab("tree");
      loadDetails();
    }
  }, [isOpen, loadDetails]);

  if (!isOpen) return null;

  const header = details?.header || selectedRow || {};
  const summary = details?.summary || header || {};
  const currency = header.currCode || header.currency || "PHP";

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/45 p-3">
      <div className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        {isLoading && <LoadingSpinner />}

        <div className="flex items-center justify-between border-b bg-gradient-to-r from-blue-50 to-white px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-gray-800">Sales Document Details</h2>
            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2">
              <span className="truncate text-lg font-extrabold text-blue-700">
                {header.soNo || "Selected SO"}
              </span>
              <StatusBadge value={header.currentStatus || header.status} />
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-2 text-gray-500 hover:bg-white">
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        <div className="grid gap-4 border-b border-slate-200 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(190px,220px)]">
          <div className="space-y-3">
            <InfoLine label="Customer" value={header.custName || header.customerName || header.custCode} />
            <InfoLine label="Salesman" value={header.salesman || header.salesRepName} />
          </div>
          <div className="space-y-3 border-slate-200 lg:border-l lg:pl-8">
            <InfoLine label="SO Date" value={formatDate(header.soDate)} />
            <InfoLine label="Terms" value={header.terms || header.paytermName || header.paytermCode} />
            <InfoLine label="Currency" value={currency} />
          </div>
          <OutstandingBalanceCard value={summary.balanceAmount} currency={currency} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50">
          <div className="flex min-w-0 flex-wrap gap-1 px-3 pt-3">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={tabButtonClass(activeTab, tab.key)}
              >
                <FontAwesomeIcon icon={tab.icon} className="text-[12px]" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
          <div className="flex shrink-0 items-center gap-2 px-3 py-2">
            <button type="button" className="inline-flex items-center gap-2 rounded-md border border-blue-100 bg-white px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50">
              <FontAwesomeIcon icon={faExpandAlt} />
              <span className="hidden sm:inline">Expand All</span>
            </button>
            <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50" title="Print">
              <FontAwesomeIcon icon={faPrint} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto px-4 py-3">
          {activeTab === "tree" && <SalesTrackerDocumentTree rows={details?.documentTree || []} currency={currency} />}
          {activeTab === "invoices" && <SalesTrackerInvoiceTab rows={details?.invoices || []} />}
          {activeTab === "settlements" && <SalesTrackerSettlementTab rows={details?.settlements || []} />}
          {activeTab === "timeline" && <SalesTrackerTimelineTab rows={details?.timeline || []} />}
          {activeTab === "notes" && <EmptyMessage message={header.remarks || header.notes || "No notes found for the selected SO."} />}
        </div>

        <div className="border-t bg-gray-50 px-4 py-3">
          <div className="grid grid-cols-1 gap-2 sm:flex sm:justify-end">
            <button type="button" onClick={onClose} className="inline-flex items-center justify-center gap-1.5 rounded-md border bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100" disabled={isLoading}>
              <FontAwesomeIcon icon={faTimes} /> Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const InfoLine = ({ label, value }) => (
  <div className="grid grid-cols-[92px_12px_minmax(0,1fr)] items-start gap-2 text-xs leading-5">
    <div className="font-semibold text-slate-500">{label}</div>
    <div className="text-slate-400">:</div>
    <div className="min-w-0 whitespace-normal break-words font-bold text-slate-700">{value || "-"}</div>
  </div>
);

const OutstandingBalanceCard = ({ value, currency = "PHP" }) => (
  <div className="w-full max-w-[220px] justify-self-end rounded-lg border border-blue-100 border-t-2 border-t-blue-800 bg-white px-3 py-2 shadow-sm">
    <div className="flex items-center justify-between gap-2">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm text-blue-900">
        <FontAwesomeIcon icon={faChartLine} />
      </div>
      <span className="min-w-0 text-right text-[11px] font-extrabold uppercase text-blue-900">
        Outstanding AR Balance
      </span>
    </div>
    <div className="mt-1 truncate text-right text-xl font-extrabold tabular-nums text-blue-900">
      {currency} {formatAmount(value)}
    </div>
  </div>
);

const StatusBadge = ({ value }) => {
  const status = String(value || "").toUpperCase();
  let cls = "bg-slate-100 text-slate-700 border-slate-200";
  if (status.includes("CLOSED") || status.includes("FULLY")) cls = "bg-emerald-50 text-emerald-700 border-emerald-100";
  else if (status.includes("PENDING")) cls = "bg-blue-50 text-blue-700 border-blue-100";
  else if (status.includes("PARTIAL")) cls = "bg-emerald-50 text-emerald-700 border-emerald-100";
  else if (status.includes("CREDIT")) cls = "bg-violet-50 text-violet-700 border-violet-100";
  else if (status.includes("DEBIT") || status.includes("OVERDUE")) cls = "bg-red-50 text-red-700 border-red-100";
  return <span className={`inline-flex rounded-md border px-2.5 py-1 text-[10px] font-bold ${cls}`}>{value || "No Status"}</span>;
};

const EmptyMessage = ({ message }) => (
  <div className="rounded-lg border border-dashed bg-slate-50 p-8 text-center text-sm text-slate-500">{message}</div>
);

export default SalesTrackerDetailsModal;
