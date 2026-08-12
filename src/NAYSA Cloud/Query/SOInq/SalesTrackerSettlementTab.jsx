import React from "react";

const toNumber = (value) => Number(value || 0);
const formatAmount = (value, currency = "PHP") => `${currency} ${toNumber(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatDate = (value) => (value ? String(value).slice(0, 10) : "-");

const SalesTrackerSettlementTab = ({ rows = [], currency = "PHP" }) => {
  if (!rows.length) return <EmptyMessage message="No collection, credit memo, or debit memo found." />;

  return (
    <div className="overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[980px] text-xs">
        <thead className="sticky top-0 z-10 bg-slate-50 shadow-sm">
          <tr>
            <Header>Doc Type</Header>
            <Header>Doc No</Header>
            <Header>Doc Date</Header>
            <Header>SI No</Header>
            <Header>Effect</Header>
            <Header align="right">Applied Amount</Header>
            <Header>Remarks</Header>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, index) => (
            <tr key={`${row.docType}-${row.docId || row.docNo}-${index}`} className="hover:bg-blue-50/40">
              <Cell><DocBadge value={row.docType} /></Cell>
              <Cell strong blue>{row.docNo}</Cell>
              <Cell>{formatDate(row.docDate)}</Cell>
              <Cell strong>{row.siNo}</Cell>
              <Cell>{row.balanceEffect}</Cell>
              <Amount>{formatAmount(row.appliedAmount, currency)}</Amount>
              <Cell>{row.remarks}</Cell>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const DocBadge = ({ value }) => {
  const type = String(value || "").toUpperCase();
  const cls = type === "ARDM"
    ? "border-orange-200 bg-orange-50 text-orange-700"
    : type === "ARCM"
      ? "border-violet-200 bg-violet-50 text-violet-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";
  return <span className={`rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${cls}`}>{type || "DOC"}</span>;
};

const Header = ({ children, align }) => <th className={`border-b border-slate-200 px-3 py-3 text-[11px] font-extrabold uppercase tracking-wide text-slate-600 ${align === "right" ? "text-right" : "text-left"}`}>{children}</th>;
const Cell = ({ children, strong, blue }) => <td className={`px-3 py-3 ${strong ? "font-extrabold" : "font-medium"} ${blue ? "text-blue-700" : "text-slate-700"}`}>{children}</td>;
const Amount = ({ children }) => <td className="px-3 py-3 text-right font-extrabold tabular-nums text-slate-800">{children}</td>;
const EmptyMessage = ({ message }) => <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-sm font-medium text-slate-500">{message}</div>;

export default SalesTrackerSettlementTab;
