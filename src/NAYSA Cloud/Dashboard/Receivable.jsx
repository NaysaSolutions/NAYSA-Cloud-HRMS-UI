import React, { useEffect, useMemo, useState } from "react";
import {
  FiTrendingUp,
  FiList,
  FiX,
  FiExternalLink,
} from "react-icons/fi";

/**
 * Utility: currency format (2 decimals, thousands separators)
 */
const formatCurrency = (n) =>
  (Number(n) || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/**
 * Small, reusable modal
 */
const ShowAllModal = ({ isOpen, title, rows, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[999] bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-5xl max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
            aria-label="Close"
          >
            <FiX />
          </button>
        </div>

        <div className="overflow-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/60 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                <th className="px-4 py-3 text-left whitespace-nowrap">Document Number</th>
                <th className="px-4 py-3 text-left whitespace-nowrap">Customer Code</th>
                <th className="px-4 py-3 text-left whitespace-nowrap">Customer Name</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">
                    No data found.
                  </td>
                </tr>
              ) : (
                rows.map((r, i) => (
                  <tr key={`${r.docNo}-${i}`} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40">
                    <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">{r.docNo}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{r.custCode}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{r.custName}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-gray-900 dark:text-gray-100">
                      {formatCurrency(r.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

/**
 * One compact table card that shows Top 10 rows + "Show all" button
 */
const TopTable = ({ title, rows, onShowAll }) => {
  const top10 = rows.slice(0, 10);
  const total = useMemo(
    () => rows.reduce((acc, r) => acc + (Number(r.amount) || 0), 0),
    [rows]
  );

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200/70 dark:border-gray-800/80 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Showing top 10 of {rows.length} records
          </p>
        </div>

        <div className="text-right">
          <div className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Total</div>
          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {formatCurrency(total)}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800/60 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
              <th className="px-4 py-3 text-left whitespace-nowrap">Document Number</th>
              <th className="px-4 py-3 text-left whitespace-nowrap">Customer Code</th>
              <th className="px-4 py-3 text-left whitespace-nowrap">Customer Name</th>
              <th className="px-4 py-3 text-right whitespace-nowrap">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {top10.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">
                  No data to display.
                </td>
              </tr>
            ) : (
              top10.map((r, i) => (
                <tr key={`${r.docNo}-${i}`} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40">
                  <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">{r.docNo}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{r.custCode}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{r.custName}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-gray-900 dark:text-gray-100">
                    {formatCurrency(r.amount)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="px-5 py-3 bg-gray-50 dark:bg-gray-900/60 border-t border-gray-200 dark:border-gray-800 flex items-center justify-end">
        <button
          onClick={onShowAll}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200"
        >
          <FiExternalLink className="text-base" />
          Show all
        </button>
      </div>
    </div>
  );
};

/**
 * Main Receivable Dashboard
 *
 * Plug your backend in loadData():
 *  - Replace the mock with your API calls and shape rows as:
 *      { docNo: string, custCode: string, custName: string, amount: number }
 */
const Receivable = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [openReceivables, setOpenReceivables] = useState([]);
  const [openAdvances, setOpenAdvances] = useState([]);

  const [showAllOpen, setShowAllOpen] = useState(false);
  const [showAllAdvances, setShowAllAdvances] = useState(false);

  // Mock loader — replace with real API
  const loadData = async () => {
    // Example: replace with your fetchData/postRequest calls
    // const open = await fetchData("getAROpenReceivables", {...});
    // const advances = await fetchData("getAROpenAdvances", {...});
    await new Promise((r) => setTimeout(r, 400)); // tiny delay for UX demo

    const mk = (i, prefix, amount, name = "Customer") => ({
      docNo: `${prefix}-${String(i).padStart(6, "0")}`,
      custCode: `CUST-${String(1000 + i)}`,
      custName: `${name} ${i}`,
      amount,
    });

    const fakeOpen = [
      mk(1, "AR", 12000.0, "Acme"),
      mk(2, "AR", 5400.25, "Globex"),
      mk(3, "AR", 899.99, "Initech"),
      mk(4, "AR", 12500, "Umbrella"),
      mk(5, "AR", 320.0, "Hooli"),
      mk(6, "AR", 7500.75, "Massive Dynamic"),
      mk(7, "AR", 23000.0, "Stark Industries"),
      mk(8, "AR", 480.0, "Wonka"),
      mk(9, "AR", 9960.0, "Wayne Enterprises"),
      mk(10, "AR", 150.0, "ACME East"),
      mk(11, "AR", 2100.0, "Aperture"),
      mk(12, "AR", 590.5, "Tyrell"),
    ];

    const fakeAdv = [
      mk(1, "ADV", 1000.0, "Acme"),
      mk(2, "ADV", 250.0, "Globex"),
      mk(3, "ADV", 800.0, "Initech"),
      mk(4, "ADV", 120.0, "Umbrella"),
      mk(5, "ADV", 940.0, "Hooli"),
      mk(6, "ADV", 1500.0, "Massive Dynamic"),
      mk(7, "ADV", 200.0, "Stark Industries"),
      mk(8, "ADV", 330.0, "Wonka"),
      mk(9, "ADV", 60.0, "Wayne Enterprises"),
      mk(10, "ADV", 75.0, "ACME East"),
      mk(11, "ADV", 40.0, "Aperture"),
      mk(12, "ADV", 99.99, "Tyrell"),
    ];

    return { open: fakeOpen, advances: fakeAdv };
  };

  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        const { open, advances } = await loadData();
        setOpenReceivables(open || []);
        setOpenAdvances(advances || []);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const totalReceivables = useMemo(
    () => openReceivables.reduce((acc, r) => acc + (Number(r.amount) || 0), 0),
    [openReceivables]
  );

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Accounts Receivable Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Overview of open receivables and advances
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200/70 dark:border-gray-800/80 p-5 flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Total Receivables
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatCurrency(totalReceivables)}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300">
            <FiTrendingUp className="text-2xl" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200/70 dark:border-gray-800/80 p-5 flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Open Items (Count)
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {openReceivables.length}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
            <FiList className="text-2xl" />
          </div>
        </div>
      </div>

      {/* Loading / Content */}
      {isLoading ? (
        <div className="w-full py-20 flex items-center justify-center">
          <div className="animate-spin h-6 w-6 rounded-full border-2 border-gray-300 border-t-transparent" />
          <span className="ml-3 text-gray-600 dark:text-gray-300 text-sm">Loading data…</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Open Receivables (Top 10) */}
          <TopTable
            title="Open Receivables"
            rows={openReceivables}
            onShowAll={() => setShowAllOpen(true)}
          />

          {/* Open Advances for Receivables (Top 10) */}
          <TopTable
            title="Open Advances (Receivables)"
            rows={openAdvances}
            onShowAll={() => setShowAllAdvances(true)}
          />
        </div>
      )}

      {/* Modals */}
      <ShowAllModal
        isOpen={showAllOpen}
        title="All Open Receivables"
        rows={openReceivables}
        onClose={() => setShowAllOpen(false)}
      />
      <ShowAllModal
        isOpen={showAllAdvances}
        title="All Open Advances (Receivables)"
        rows={openAdvances}
        onClose={() => setShowAllAdvances(false)}
      />
    </div>
  );
};

export default Receivable;
