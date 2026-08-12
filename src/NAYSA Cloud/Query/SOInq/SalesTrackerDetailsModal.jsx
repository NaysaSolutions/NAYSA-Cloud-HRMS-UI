import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChartLine,
  faClock,
  faFileAlt,
  faFileInvoiceDollar,
  faMoneyBillWave,
  faProjectDiagram,
  faReceipt,
  faTimes,
  faTruck,
} from "@fortawesome/free-solid-svg-icons";

import { postRequest } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

import SalesTrackerDocumentTree from "./SalesTrackerDocumentTree.jsx";
import SalesTrackerInvoiceTab from "./SalesTrackerInvoiceTab.jsx";
import SalesTrackerSettlementTab from "./SalesTrackerSettlementTab.jsx";
import SalesTrackerTimelineTab from "./SalesTrackerTimelineTab.jsx";

const tabs = [
  { key: "flow", label: "Flow", longLabel: "Document Flow", icon: faProjectDiagram },
  { key: "timeline", label: "Timeline", longLabel: "Timeline", icon: faClock },
  { key: "invoices", label: "Invoices / AR", longLabel: "Invoices / AR", icon: faFileInvoiceDollar },
  { key: "collections", label: "Collections", longLabel: "Collections", icon: faMoneyBillWave },
  { key: "documents", label: "Documents", longLabel: "Documents", icon: faFileAlt },
  { key: "notes", label: "Notes", longLabel: "Notes", icon: faReceipt },
];

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

const toNumber = (value) => Number(value || 0);
const currencySymbol = (currency = "PHP") => (String(currency || "").toUpperCase() === "PHP" ? "₱" : currency || "");
const formatAmount = (value) => toNumber(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatCurrency = (value, currency = "PHP") => `${currencySymbol(currency)} ${formatAmount(value)}`;
const formatQty = (value) => toNumber(value).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 4 });
const formatDate = (value) => (value ? String(value).slice(0, 10) : "-");
const getStatusKey = (value = "") => String(value || "").toUpperCase().replace(/\s+/g, "_");

const getStatusMeta = (value = "") => {
  const status = getStatusKey(value);
  if (status.includes("CANCEL")) return { pct: 0, cls: "border-slate-200 bg-slate-100 text-slate-700", dot: "bg-slate-500" };
  if (status.includes("CLOSED") || status.includes("FULLY")) return { pct: 100, cls: "border-emerald-200 bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" };
  if (status.includes("OVERDUE")) return { pct: 80, cls: "border-red-200 bg-red-50 text-red-700", dot: "bg-red-500" };
  if (status.includes("COLLECT")) return { pct: status.includes("PARTIAL") ? 85 : 70, cls: "border-violet-200 bg-violet-50 text-violet-700", dot: "bg-violet-500" };
  if (status.includes("INVOICE")) return { pct: status.includes("PARTIAL") ? 55 : 45, cls: "border-amber-200 bg-amber-50 text-amber-700", dot: "bg-amber-500" };
  if (status.includes("DELIVER")) return { pct: status.includes("PARTIAL") ? 30 : 10, cls: "border-blue-200 bg-blue-50 text-blue-700", dot: "bg-blue-500" };
  return { pct: 0, cls: "border-slate-200 bg-slate-100 text-slate-700", dot: "bg-slate-400" };
};

const SalesTrackerDetailsModal = ({ isOpen, onClose, selectedRow, filters }) => {
  const [activeTab, setActiveTab] = useState("flow");
  const [isLoading, setIsLoading] = useState(false);
  const [details, setDetails] = useState(null);

  const payload = useMemo(() => ({
    json_data: {
      branchCode: filters?.branchCode || selectedRow?.branchCode || "",
      custCode: filters?.custCode || selectedRow?.custCode || "",
      salesRepCode: filters?.salesRepCode || selectedRow?.salesRepCode || "",
      dateBasis: filters?.dateBasis || "SO_DATE",
      startDate: filters?.startDate || "",
      endDate: filters?.endDate || "",
      status: filters?.status || "",
      searchText: filters?.searchText || "",
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
      setActiveTab("flow");
      loadDetails();
    }
  }, [isOpen, loadDetails]);

  if (!isOpen) return null;

  const header = details?.header || selectedRow || {};
  const currency = header.currCode || header.currency || "PHP";
  const statusMeta = getStatusMeta(header.currentStatus || header.status);
  const stages = buildStages(header);

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-950/35 p-3 backdrop-blur-[2px] md:p-5">
      <style>{`
        @keyframes naysaSalesModalIn {
          from { opacity: 0; transform: translate3d(18px, 0, 0) scale(0.985); }
          to { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
        }
        @keyframes naysaTabIn {
          from { opacity: 0; transform: translate3d(0, 6px, 0); }
          to { opacity: 1; transform: translate3d(0, 0, 0); }
        }
      `}</style>

      <div
        className="relative flex max-h-[92vh] w-full max-w-[1280px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        style={{ animation: "naysaSalesModalIn 180ms ease-out" }}
      >
        {isLoading && <LoadingSpinner />}

        <div className="border-b border-slate-200 bg-white px-5 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sales Order</div>
                <h2 className="truncate text-lg font-bold tracking-tight text-slate-900">{header.soNo || "Selected SO"}</h2>
                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-extrabold ${statusMeta.cls}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dot}`} />
                  {header.currentStatus || "No Status"}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-slate-500">Complete document trail from order through collection.</p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button type="button" onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600">
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
          </div>
        </div>

        <div className="grid items-stretch gap-3 border-b border-slate-200 bg-slate-50/70 p-3 lg:grid-cols-2 xl:grid-cols-[1fr_1.35fr_260px]">
          <div className="min-h-[150px] rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <SectionTitle title="Customer Details" />
            <div className="mt-2.5 grid grid-cols-1 gap-1.5 text-[11px]">
              <InfoLine label="Customer" value={header.custName || header.customerName || header.custCode} />
              <InfoLine label="Ship To" value={header.shiptoName || header.shipToName || "-"} />
              <InfoLine label="Salesman" value={header.salesRepName || header.salesman || "-"} />
              <InfoLine label="Terms" value={header.billtermCode || header.terms || "-"} />
            </div>
          </div>

          <div className="min-h-[150px] rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <SectionTitle title="Lifecycle Progress" />
              <div className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-extrabold text-blue-700">{statusMeta.pct}% Completed</div>
            </div>
            <StageProgress stages={stages} percent={statusMeta.pct} />
          </div>

          <div className="min-h-[150px] rounded-xl border border-slate-200 bg-white p-3 shadow-sm lg:col-span-2 xl:col-span-1">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-700"><FontAwesomeIcon icon={faChartLine} /></span>
              <div className="text-right">
                <div className="text-[11px] font-extrabold uppercase text-slate-500">AR Balance</div>
                <div className={`text-lg font-bold tabular-nums ${toNumber(header.balanceAmount) > 0 ? "text-red-600" : "text-emerald-600"}`}>{formatCurrency(header.balanceAmount, currency)}</div>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1 text-[10px]">
              <MiniAmount label="SO" value={header.soAmount} currency={currency} />
              <MiniAmount label="SI" value={header.invoiceAmount} currency={currency} />
              <MiniAmount label="DR Quantity" value={header.drQuantity} type="qty" />
              <MiniAmount label="Collected" value={header.collectionAmount} currency={currency} />
            </div>
          </div>
        </div>

        <div className="border-b border-slate-200 bg-white px-4 py-2.5">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="inline-flex w-full gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:w-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`group relative inline-flex h-7 shrink-0 items-center justify-center gap-1.5 rounded-lg px-2 text-[10px] font-extrabold transition-all duration-200 ${
                    activeTab === tab.key
                      ? "bg-white text-blue-700 shadow-sm ring-1 ring-slate-200"
                      : "text-slate-500 hover:bg-white/70 hover:text-slate-800"
                  }`}
                >
                  <FontAwesomeIcon icon={tab.icon} className={`text-[12px] transition-transform duration-200 ${activeTab === tab.key ? "scale-110" : "group-hover:scale-105"}`} />
                  <span className="hidden sm:inline">{tab.longLabel}</span>
                  <span className="sm:hidden">{tab.label}</span>
                  {activeTab === tab.key && <span className="absolute inset-x-3 -bottom-[5px] h-0.5 rounded-full bg-blue-600" />}
                </button>
              ))}
            </div>

            <div className="text-[11px] font-semibold text-slate-400">
              {tabs.find((tab) => tab.key === activeTab)?.longLabel || "Details"}
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto bg-slate-50/40 p-3">
          <div key={activeTab} style={{ animation: "naysaTabIn 160ms ease-out" }}>
            {activeTab === "flow" && <SalesTrackerDocumentTree rows={details?.documentTree || []} header={header} currency={currency} />}
            {activeTab === "timeline" && <SalesTrackerTimelineTab rows={details?.timeline || []} currency={currency} />}
            {activeTab === "invoices" && <SalesTrackerInvoiceTab rows={details?.invoices || []} currency={currency} />}
            {activeTab === "collections" && <SalesTrackerSettlementTab rows={details?.settlements || []} currency={currency} />}
            {activeTab === "documents" && <DocumentList details={details} currency={currency} />}
            {activeTab === "notes" && <NotesPanel header={header} />}
          </div>
        </div>
      </div>
    </div>
  );
};

const SectionTitle = ({ title }) => (
  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{title}</div>
);

const InfoLine = ({ label, value }) => (
  <div className="grid grid-cols-[78px_minmax(0,1fr)] items-start gap-2 leading-4">
    <div className="font-medium text-slate-500">{label}</div>
    <div className="min-w-0 break-words font-semibold text-slate-800">{value || "-"}</div>
  </div>
);

const MiniAmount = ({ label, value, currency = "PHP", type = "amount" }) => (
  <div className="rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2 text-right">
    <div className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
    <div className="mt-0.5 truncate text-xs font-bold tabular-nums text-slate-800">{type === "qty" ? formatQty(value) : formatCurrency(value, currency)}</div>
  </div>
);

const StageProgress = ({ stages, percent }) => (
  <div className="px-1 py-1">
    <div className="relative flex items-start justify-between gap-1.5">
      <div className="absolute left-4 right-4 top-[13px] h-0.5 rounded-full bg-slate-200" />
      <div className="absolute left-4 top-[13px] h-0.5 rounded-full bg-blue-600 transition-all duration-300" style={{ width: `calc((100% - 32px) * ${Math.max(0, Math.min(100, percent)) / 100})` }} />
      {stages.map((stage) => (
        <div key={stage.key} className="relative z-10 flex min-w-0 flex-1 flex-col items-center text-center">
          <div className={`flex h-7 w-7 items-center justify-center rounded-full border-[3px] border-white text-white shadow-sm transition-all duration-200 ${stage.active ? "bg-blue-600" : "bg-slate-300"}`}>
            <FontAwesomeIcon icon={stage.icon} className="text-[10px]" />
          </div>
          <div className="mt-1 text-[10px] font-extrabold text-slate-700">{stage.label}</div>
          <div className="max-w-[70px] truncate text-[9px] text-slate-400">{stage.caption}</div>
        </div>
      ))}
    </div>
  </div>
);

const DocumentList = ({ details, currency }) => {
  const rows = [
    ...(details?.documentTree || []).flatMap((branch) => [
      branch.drNo ? { docType: "DR", docNo: branch.drNo, docDate: branch.drDate, amount: null, quantity: branch.drQuantity } : null,
      ...(branch.invoices || []).flatMap((si) => [
        { docType: "SI", docNo: si.siNo, docDate: si.siDate, amount: si.invoiceAmount },
        ...(si.settlements || []).map((doc) => ({ docType: doc.docType, docNo: doc.docNo, docDate: doc.docDate, amount: doc.appliedAmount })),
      ]),
    ]),
  ].filter(Boolean);

  if (!rows.length) return <EmptyMessage message="No linked document found." />;

  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
      {rows.map((row, index) => (
        <div key={`${row.docType}-${row.docNo}-${index}`} className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-100 hover:shadow-md">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-extrabold uppercase text-slate-500">{row.docType}</div>
              <div className="mt-0.5 text-xs font-extrabold text-blue-700">{row.docNo}</div>
              <div className="mt-0.5 text-[11px] text-slate-500">{formatDate(row.docDate)}</div>
            </div>
            <div className="text-right text-xs font-extrabold text-slate-800">
              {row.quantity !== undefined && row.quantity !== null ? `Qty ${formatQty(row.quantity)}` : formatCurrency(row.amount, currency)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const NotesPanel = ({ header }) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
    <div className="text-xs font-extrabold text-slate-800">Remarks / Notes</div>
    <div className="mt-2 rounded-lg border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-600">
      {header.remarks || header.notes || "No notes found for the selected SO."}
    </div>
  </div>
);

const EmptyMessage = ({ message }) => (
  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-xs font-medium text-slate-500">{message}</div>
);

const buildStages = (header) => {
  const statusMeta = getStatusMeta(header.currentStatus || header.status);
  const pct = statusMeta.pct;
  return [
    { key: "SO", label: "SO", caption: formatDate(header.soDate), icon: faProjectDiagram, active: pct >= 0 },
    { key: "DR", label: "DR", caption: `${formatQty(header.drQuantity)} qty`, icon: faTruck, active: pct >= 25 },
    { key: "SI", label: "SI", caption: formatAmount(header.invoiceAmount), icon: faFileInvoiceDollar, active: pct >= 45 },
    { key: "AR", label: "AR", caption: formatAmount(header.balanceAmount), icon: faChartLine, active: pct >= 70 },
    { key: "CR", label: "CR", caption: formatAmount(header.collectionAmount), icon: faMoneyBillWave, active: pct >= 85 },
  ];
};

export default SalesTrackerDetailsModal;
