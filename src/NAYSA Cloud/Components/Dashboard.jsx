// Dashboard.jsx
import React, { useEffect, useState } from "react";
import {
  FiTrendingDown,
  FiTrendingUp,
  FiShoppingCart,
  FiRefreshCw,
  FiCreditCard,
} from "react-icons/fi";

const API_URL = import.meta?.env?.VITE_API_URL ?? "http://127.0.0.1:8000";

/** Toggle to false when backend endpoint is ready */
const USE_DEMO = true;

/* -------------------------- DEMO DATA -------------------------- */
const demo = {
  ap: [
    { docNo: "APV-0001", payeeCode: "SUP001", payeeName: "Supplier A", amount: 12000.5 },
    { docNo: "APV-0002", payeeCode: "SUP002", payeeName: "Supplier B", amount: 23450.0 },
    { docNo: "APV-0003", payeeCode: "EMP123", payeeName: "John Dela Cruz", amount: 8900.0 },
  ],
  ar: [
    { docNo: "SI-1001", customerCode: "CUST001", customerName: "ABC Corp", amount: 15300.0 },
    { docNo: "SI-1002", customerCode: "CUST002", customerName: "XYZ Trading", amount: 22100.0 },
  ],
  purchases: [
    { docNo: "PO-2025-001", payeeCode: "SUP010", payeeName: "Allied Supply", amount: 45000.0 },
    { docNo: "PO-2025-002", payeeCode: "SUP011", payeeName: "Beacon Tools", amount: 12750.0 },
  ],
  replenishments: [
    { docNo: "RP-0005", payeeCode: "EMP003", payeeName: "Juan Dela Cruz", amount: 3500.0 },
    { docNo: "RP-0008", payeeCode: "EMP021", payeeName: "Anna Reyes", amount: 5100.0 },
  ],
  advances: [
    { docNo: "ADV-0002", payeeCode: "EMP010", payeeName: "Maria Santos", amount: 10000.0 },
    { docNo: "ADV-0007", payeeCode: "EMP011", payeeName: "Carlo Cruz", amount: 7500.0 },
  ],
};
const sum = (arr) => (arr || []).reduce((t, r) => t + Number(r.amount || 0), 0);
const demoMetrics = {
  apBalance: sum(demo.ap),
  arBalance: sum(demo.ar),
  openPurchases: demo.purchases.length,
  openReplenishments: demo.replenishments.length,
  openAdvances: demo.advances.length,
};
/* --------------------------------------------------------------- */

export default function Dashboard({
  metrics: initialMetrics,
  ap: initialAP,
  ar: initialAR,
  purchases: initialPurchases,
  replenishments: initialReplenishments,
  advances: initialAdvances,
}) {
  const [metrics, setMetrics] = useState(
    initialMetrics ??
      (USE_DEMO
        ? demoMetrics
        : { apBalance: 0, arBalance: 0, openPurchases: 0, openReplenishments: 0, openAdvances: 0 })
  );
  const [ap, setAP] = useState(initialAP ?? (USE_DEMO ? demo.ap : []));
  const [ar, setAR] = useState(initialAR ?? (USE_DEMO ? demo.ar : []));
  const [purchases, setPurchases] = useState(initialPurchases ?? (USE_DEMO ? demo.purchases : []));
  const [replenishments, setReplenishments] = useState(
    initialReplenishments ?? (USE_DEMO ? demo.replenishments : [])
  );
  const [advances, setAdvances] = useState(initialAdvances ?? (USE_DEMO ? demo.advances : []));

  const [loading, setLoading] = useState(
    !USE_DEMO &&
      !(initialMetrics && initialAP && initialAR && initialPurchases && initialReplenishments && initialAdvances)
  );
  const [error, setError] = useState(null);

  useEffect(() => {
    if (USE_DEMO) return;
    if (
      initialMetrics &&
      initialAP &&
      initialAR &&
      initialPurchases &&
      initialReplenishments &&
      initialAdvances
    )
      return;

    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${API_URL}/api/dashboard/overview`, { credentials: "include" });
        const json = await res.json().catch(() => ({}));
        if (!alive) return;
        if (!res.ok) throw new Error(json?.message || "Failed to load dashboard data");

        setMetrics({
          apBalance: json?.apBalance ?? 0,
          arBalance: json?.arBalance ?? 0,
          openPurchases: json?.openPurchases ?? 0,
          openReplenishments: json?.openReplenishments ?? 0,
          openAdvances: json?.openAdvances ?? 0,
        });
        setAP(json?.ap ?? []);
        setAR(json?.ar ?? []);
        setPurchases(json?.purchases ?? []);
        setReplenishments(json?.replenishments ?? []);
        setAdvances(json?.advances ?? []);
      } catch (e) {
        setError(e?.message || "Unable to fetch dashboard data");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [
    initialMetrics,
    initialAP,
    initialAR,
    initialPurchases,
    initialReplenishments,
    initialAdvances,
  ]);

  const formatCurrency = (n) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      maximumFractionDigits: 2,
    }).format(Number(n || 0));

  const formatInt = (n) => new Intl.NumberFormat("en-PH", { maximumFractionDigits: 0 }).format(Number(n || 0));

  const Card = ({ title, value, hint, icon, classes }) => (
    <div className={`group relative overflow-hidden rounded-2xl border border-white/40 bg-white/70 p-5 shadow-sm backdrop-blur transition hover:shadow-md ${classes || ""}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-bold text-slate-800">{value}</p>
          {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
        </div>
        <div className="rounded-xl p-2.5 bg-slate-50 text-slate-600">{icon}</div>
      </div>
    </div>
  );

  const Table = ({ title, columns, rows, ofKey, onShowMore }) => (
    <div className="rounded-2xl border border-white/40 bg-white/70 shadow-sm backdrop-blur">
      <div className="flex items-center justify-between p-4">
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
        {rows?._canShowMore ? (
          <button onClick={onShowMore} className="text-xs font-medium text-sky-700 hover:text-sky-600">
            Show more
          </button>
        ) : null}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={`px-4 py-2 text-left font-semibold text-slate-600 ${c.className || ""}`}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!rows?.items?.length ? (
              <tr>
                <td className="px-4 py-6 text-center text-slate-500" colSpan={columns.length}>
                  No records
                </td>
              </tr>
            ) : (
              rows.items.map((r, idx) => (
                <tr key={`${ofKey}-${idx}`} className="border-t">
                  {columns.map((c) => (
                    <td key={c.key} className={`px-4 py-2 ${c.bodyClassName || ""}`}>
                      {typeof c.render === "function" ? c.render(r) : r[c.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  /* two tables per row */
  const [limit, setLimit] = useState({
    ap: 10,
    ar: 10,
    purchases: 10,
    replenishments: 10,
    advances: 10,
  });
  const sliceRows = (arr, lim) => ({
    items: (arr || []).slice(0, lim),
    _canShowMore: (arr || []).length > lim,
  });

  const apRows = sliceRows(ap, limit.ap);
  const arRows = sliceRows(ar, limit.ar);
  const purchaseRows = sliceRows(purchases, limit.purchases);
  const replRows = sliceRows(replenishments, limit.replenishments);
  const advRows = sliceRows(advances, limit.advances);

  const moneyCell = (r) => <span className="font-medium">{formatCurrency(r.amount)}</span>;
  const right = "text-right";

  /* Amount LAST per your request */
  const apCols = [
    { key: "docNo", header: "Document No" },
    { key: "payeeCode", header: "Payee Code" },
    { key: "payeeName", header: "Payee Name" },
    { key: "amount", header: "Amount", render: moneyCell, className: right, bodyClassName: right },
  ];
  const arCols = [
    { key: "docNo", header: "Document No" },
    { key: "customerCode", header: "Customer Code" },
    { key: "customerName", header: "Customer Name" },
    { key: "amount", header: "Amount", render: moneyCell, className: right, bodyClassName: right },
  ];
  const prCols = [
    { key: "docNo", header: "Document No" },
    { key: "payeeCode", header: "Payee Code" },
    { key: "payeeName", header: "Payee Name" },
    { key: "amount", header: "Amount", render: moneyCell, className: right, bodyClassName: right },
  ];

  return (
    <div className="p-6 mt-[50px] space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {loading ? (
          [...Array(5)].map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-white/40 bg-white/70 p-5 shadow-sm backdrop-blur"
            >
              <div className="animate-pulse space-y-3">
                <div className="h-3 w-24 rounded bg-slate-200" />
                <div className="h-7 w-32 rounded bg-slate-200" />
                <div className="h-3 w-40 rounded bg-slate-200" />
              </div>
            </div>
          ))
        ) : (
          <>
            <Card
              title="Accounts Payable Balance"
              value={formatCurrency(metrics.apBalance)}
              hint="Total outstanding payables"
              icon={<FiTrendingDown className="h-6 w-6" />}
              classes="ring-1 ring-rose-100"
            />
            <Card
              title="Accounts Receivable Balance"
              value={formatCurrency(metrics.arBalance)}
              hint="Total outstanding receivables"
              icon={<FiTrendingUp className="h-6 w-6" />}
              classes="ring-1 ring-emerald-100"
            />
            <Card
              title="Open Purchases"
              value={formatInt(metrics.openPurchases)}
              hint="Unclosed POs / PRs"
              icon={<FiShoppingCart className="h-6 w-6" />}
              classes="ring-1 ring-sky-100"
            />
            <Card
              title="Open Replenishments"
              value={formatInt(metrics.openReplenishments)}
              hint="Pending replenishments"
              icon={<FiRefreshCw className="h-6 w-6" />}
              classes="ring-1 ring-indigo-100"
            />
            <Card
              title="Open Advances"
              value={formatInt(metrics.openAdvances)}
              hint="Outstanding advances"
              icon={<FiCreditCard className="h-6 w-6" />}
              classes="ring-1 ring-amber-100"
            />
          </>
        )}
      </div>

      {/* Tables: 2 cards per row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Table
          title="Accounts Payable — Open Items"
          columns={apCols}
          rows={apRows}
          ofKey="ap"
          onShowMore={() => setLimit((s) => ({ ...s, ap: s.ap + 10 }))}
        />
        <Table
          title="Accounts Receivable — Open Items"
          columns={arCols}
          rows={arRows}
          ofKey="ar"
          onShowMore={() => setLimit((s) => ({ ...s, ar: s.ar + 10 }))}
        />
        <Table
          title="Open Purchases"
          columns={prCols}
          rows={purchaseRows}
          ofKey="purchases"
          onShowMore={() => setLimit((s) => ({ ...s, purchases: s.purchases + 10 }))}
        />
        <Table
          title="Open Replenishments"
          columns={prCols}
          rows={replRows}
          ofKey="replenishments"
          onShowMore={() => setLimit((s) => ({ ...s, replenishments: s.replenishments + 10 }))}
        />
        <Table
          title="Open Advances"
          columns={prCols}
          rows={advRows}
          ofKey="advances"
          onShowMore={() => setLimit((s) => ({ ...s, advances: s.advances + 10 }))}
        />
      </div>
    </div>
  );
}
