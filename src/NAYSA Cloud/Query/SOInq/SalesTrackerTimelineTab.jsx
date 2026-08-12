import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileInvoiceDollar, faMoneyBillWave, faProjectDiagram, faTruck, faUndo } from "@fortawesome/free-solid-svg-icons";

const toNumber = (value) => Number(value || 0);
const currencySymbol = (currency = "PHP") => (String(currency || "").toUpperCase() === "PHP" ? "₱" : currency || "");
const formatAmount = (value, currency = "PHP") => `${currencySymbol(currency)} ${toNumber(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatQty = (value) => toNumber(value).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 4 });
const formatDate = (value) => (value ? String(value).slice(0, 10) : "-");

const SalesTrackerTimelineTab = ({ rows = [], currency = "PHP" }) => {
  if (!rows.length) return <EmptyMessage message="No timeline record found." />;

  return (
    <div className="space-y-2 pr-1">
      {rows.map((row, index) => {
        const meta = getMeta(row.docType);
        return (
          <div key={`${row.docType}-${row.docId || row.docNo}-${index}`} className="relative pl-8">
            <div className="absolute left-[13px] top-0 h-full border-l border-slate-200" />
            <div className={`absolute left-[6px] top-3 flex h-4 w-4 items-center justify-center rounded-full border-[3px] border-white ${meta.dot}`} />
            <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-100 hover:shadow-md">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-lg ${meta.iconClass}`}><FontAwesomeIcon icon={meta.icon} /></span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] font-extrabold text-slate-600">{row.docType}</span>
                    <span className="text-xs font-extrabold text-blue-700">{row.docNo}</span>
                    <span className="text-[11px] font-semibold text-slate-400">{formatDate(row.docDate)}</span>
                  </div>
                  <div className="mt-1 text-[11px] font-medium text-slate-600">{row.activity}</div>
                </div>
                <div className="text-right text-xs font-extrabold tabular-nums text-slate-800">
                  {String(row.docType || "").toUpperCase() === "DR" ? `Qty ${formatQty(row.quantity || row.drQuantity)}` : formatAmount(row.amount || row.appliedAmount, currency)}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const getMeta = (docType) => {
  const type = String(docType || "").toUpperCase();
  if (type === "SO") return { icon: faProjectDiagram, dot: "bg-blue-500", iconClass: "bg-blue-50 text-blue-700" };
  if (type === "DR") return { icon: faTruck, dot: "bg-emerald-500", iconClass: "bg-emerald-50 text-emerald-700" };
  if (type === "SI") return { icon: faFileInvoiceDollar, dot: "bg-amber-500", iconClass: "bg-amber-50 text-amber-700" };
  if (type === "ARDM" || type === "ARCM") return { icon: faUndo, dot: "bg-violet-500", iconClass: "bg-violet-50 text-violet-700" };
  return { icon: faMoneyBillWave, dot: "bg-green-500", iconClass: "bg-green-50 text-green-700" };
};

const EmptyMessage = ({ message }) => <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-xs font-medium text-slate-500">{message}</div>;

export default SalesTrackerTimelineTab;
