import React from "react";

const toNumber = (value) => Number(value || 0);
const formatAmount = (value, currency = "PHP") => `${currency} ${toNumber(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatDate = (value) => (value ? String(value).slice(0, 10) : "-");

const SalesTrackerInvoiceTab = ({ rows = [], currency = "PHP" }) => {
  if (!rows.length) return <EmptyMessage message="No invoice / AR record found." />;

  const totals = rows.reduce((acc, row) => ({
    invoiceAmount: acc.invoiceAmount + toNumber(row.invoiceAmount),
    collectionAmount: acc.collectionAmount + toNumber(row.collectionAmount),
    creditMemoAmount: acc.creditMemoAmount + toNumber(row.creditMemoAmount),
    debitMemoAmount: acc.debitMemoAmount + toNumber(row.debitMemoAmount),
    balanceAmount: acc.balanceAmount + toNumber(row.balanceAmount),
  }), { invoiceAmount: 0, collectionAmount: 0, creditMemoAmount: 0, debitMemoAmount: 0, balanceAmount: 0 });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
        <TotalCard label="SI Amount" value={totals.invoiceAmount} currency={currency} />
        <TotalCard label="Collected" value={totals.collectionAmount} currency={currency} />
        <TotalCard label="ARCM" value={totals.creditMemoAmount} currency={currency} />
        <TotalCard label="ARDM" value={totals.debitMemoAmount} currency={currency} />
        <TotalCard label="AR Balance" value={totals.balanceAmount} currency={currency} danger />
      </div>

      <div className="overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[980px] text-xs">
          <thead className="sticky top-0 z-10 bg-slate-50 shadow-sm">
            <tr>
              <Header>DR No</Header>
              <Header>SI No</Header>
              <Header>SI Date</Header>
              <Header>Due Date</Header>
              <Header align="right">Invoice</Header>
              <Header align="right">Collected</Header>
              <Header align="right">ARCM</Header>
              <Header align="right">ARDM</Header>
              <Header align="right">Balance</Header>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.siId || row.siNo} className="hover:bg-blue-50/40">
                <Cell>{row.drNo || "-"}</Cell>
                <Cell strong blue>{row.siNo}</Cell>
                <Cell>{formatDate(row.siDate)}</Cell>
                <Cell>{formatDate(row.dueDate)}</Cell>
                <Amount>{formatAmount(row.invoiceAmount, currency)}</Amount>
                <Amount>{formatAmount(row.collectionAmount, currency)}</Amount>
                <Amount>{formatAmount(row.creditMemoAmount, currency)}</Amount>
                <Amount>{formatAmount(row.debitMemoAmount, currency)}</Amount>
                <Amount danger>{formatAmount(row.balanceAmount, currency)}</Amount>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const TotalCard = ({ label, value, currency, danger }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
    <div className="text-[11px] font-extrabold uppercase text-slate-500">{label}</div>
    <div className={`mt-2 text-sm font-extrabold tabular-nums ${danger ? "text-red-600" : "text-slate-900"}`}>{formatAmount(value, currency)}</div>
  </div>
);

const Header = ({ children, align }) => <th className={`border-b border-slate-200 px-3 py-3 text-[11px] font-extrabold uppercase tracking-wide text-slate-600 ${align === "right" ? "text-right" : "text-left"}`}>{children}</th>;
const Cell = ({ children, strong, blue }) => <td className={`px-3 py-3 ${strong ? "font-extrabold" : "font-medium"} ${blue ? "text-blue-700" : "text-slate-700"}`}>{children}</td>;
const Amount = ({ children, danger }) => <td className={`px-3 py-3 text-right font-extrabold tabular-nums ${danger ? "text-red-600" : "text-slate-800"}`}>{children}</td>;
const EmptyMessage = ({ message }) => <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-sm font-medium text-slate-500">{message}</div>;

export default SalesTrackerInvoiceTab;
