import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";

/* ───────────── constants & helpers ───────────── */
const API = "/timesheet";
const EMPTY = { header: null, daily: [], payItems: [], allocations: [], exceptions: [] };
const FILTER_KEY = "timesheet.filters";
const DEFAULT_FILTERS = { payFreq: "S", cutOff: "", empNo: "", branchCode: "", groupCode: "", status: "" };
const STATUSES = ["GENERATED", "FOR REVIEW", "VALIDATED", "FINALIZED"];
const FLOW = ["GENERATED", "FOR REVIEW", "VALIDATED", "FINALIZED"];

const num = (v, d = 2) =>
  Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
const date = (v) => (v ? String(v).substring(0, 10) : "");
const time = (v) => {
  if (!v) return "";
  const s = String(v);
  return s.includes("T") ? s.substring(11, 16) : s.substring(0, 5);
};
const dayName = (v) => {
  if (!v) return "";
  const d = new Date(String(v).substring(0, 10) + "T00:00:00");
  return isNaN(d) ? "" : d.toLocaleDateString(undefined, { weekday: "short" });
};
const up = (v) => String(v || "").toUpperCase();
const statusCss = (s) =>
  ({
    FINALIZED: "bg-emerald-100 text-emerald-700 border-emerald-200",
    VALIDATED: "bg-blue-100 text-blue-700 border-blue-200",
    "FOR REVIEW": "bg-amber-100 text-amber-700 border-amber-200",
  }[up(s)] || "bg-slate-100 text-slate-700 border-slate-200");

const loadFilters = () => {
  try {
    return { ...DEFAULT_FILTERS, ...JSON.parse(sessionStorage.getItem(FILTER_KEY) || "{}") };
  } catch {
    return DEFAULT_FILTERS;
  }
};

const toCsv = (cols, rows, name) => {
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [cols.map((c) => esc(c.label)).join(",")];
  rows.forEach((r) => lines.push(cols.map((c) => esc(c.csv ? c.csv(r) : c.render ? c.render(r) : r[c.key])).join(",")));
  const url = URL.createObjectURL(new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

/* ───────────── table column definitions ───────────── */
const H = (k, d = 2) => (r) => num(r[k], d);
const DAILY_COLS = [
  { key: "workDate", label: "Date", render: (r) => date(r.workDate) },
  { key: "day", label: "Day", render: (r) => r.dayCode || dayName(r.workDate) },
  { key: "shiftCode", label: "Shift" },
  { key: "rdFlag", label: "RD" },
  { key: "holiday", label: "Holiday", render: (r) => r.holidayCode || r.holidayType },
  { key: "shiftIn", label: "Shift In", render: (r) => time(r.shiftIn) },
  { key: "shiftOut", label: "Shift Out", render: (r) => time(r.shiftOut) },
  { key: "timeIn", label: "Time In", render: (r) => time(r.timeIn) },
  { key: "timeOut", label: "Time Out", render: (r) => time(r.timeOut) },
  { key: "workHrs", label: "Work", right: true, sum: true, render: H("workHrs") },
  { key: "regHrs", label: "Reg", right: true, sum: true, render: H("regHrs") },
  { key: "absentHrs", label: "Absent", right: true, sum: true, render: H("absentHrs") },
  { key: "lateHrs", label: "Late", right: true, sum: true, render: H("lateHrs") },
  { key: "utHrs", label: "UT", right: true, sum: true, render: H("utHrs") },
  { key: "source", label: "Source" },
];
const PAY_COLS = [
  { key: "workDate", label: "Date", render: (r) => date(r.workDate) },
  { key: "itemType", label: "Type" },
  { key: "itemNo", label: "No." },
  { key: "itemCode", label: "Code" },
  { key: "itemName", label: "Name" },
  { key: "edCode", label: "ED Code" },
  { key: "days", label: "Days", right: true, sum: true, render: H("days", 4) },
  { key: "hours", label: "Hours", right: true, sum: true, render: H("hours", 4) },
  { key: "minutes", label: "Minutes", right: true, sum: true, render: H("minutes") },
  { key: "source", label: "Source" },
];
const ALLOC_COLS = [
  { key: "workDate", label: "Date", render: (r) => date(r.workDate) },
  { key: "lineNo", label: "Line" },
  { key: "branchCode", label: "Branch" },
  { key: "deptCode", label: "Dept" },
  { key: "positionCode", label: "Position" },
  { key: "clientCode", label: "Client" },
  { key: "projectCode", label: "Project" },
  { key: "costCenter", label: "Cost Center" },
  { key: "regHrs", label: "Reg", right: true, sum: true, render: H("regHrs") },
  { key: "otHrs", label: "OT", right: true, sum: true, render: H("otHrs") },
  { key: "ndHrs", label: "ND", right: true, sum: true, render: H("ndHrs") },
  { key: "leaveHrs", label: "Leave", right: true, sum: true, render: H("leaveHrs") },
  { key: "allocationPct", label: "%", right: true, render: H("allocationPct") },
];
const EXC_COLS = [
  { key: "workDate", label: "Date", render: (r) => date(r.workDate) },
  {
    key: "severity",
    label: "Severity",
    csv: (r) => r.severity,
    render: (r) => (
      <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${up(r.severity) === "ERROR" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
        {r.severity}
      </span>
    ),
  },
  { key: "exceptionCode", label: "Code" },
  { key: "exceptionType", label: "Type" },
  { key: "description", label: "Description", wrap: true },
  { key: "resolved", label: "Resolved" },
  { key: "resolutionRemarks", label: "Resolution", wrap: true },
];

/* row highlight rules for the Daily tab */
const dailyRowClass = (r) => {
  if (up(r.rdFlag) === "Y") return "bg-slate-50 text-slate-500";
  if (r.holidayCode || r.holidayType) return "bg-violet-50";
  if (Number(r.absentHrs) > 0) return "bg-red-50";
  if (Number(r.lateHrs) > 0 || Number(r.utHrs) > 0) return "bg-amber-50";
  return "";
};

/* ───────────── main component ───────────── */
export default function Timesheet() {
  const { user, currentUserRow } = useAuth();
  const [filters, setFilters] = useState(loadFilters);
  const [rows, setRows] = useState([]);
  const [selectedTsId, setSelectedTsId] = useState(null);
  const [detail, setDetail] = useState(EMPTY);
  const [tab, setTab] = useState("daily");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null); // {type,text}
  const [confirm, setConfirm] = useState(null); // {title,text,tone,onOk}
  const [search, setSearch] = useState("");
  const [chip, setChip] = useState("ALL");
  const [onlyIssues, setOnlyIssues] = useState(false);
  const [sort, setSort] = useState({ key: "empNo", dir: 1 });
  const [onlyOpenExc, setOnlyOpenExc] = useState(false);
  const toastTimer = useRef(null);

  const userCode =
    currentUserRow?.userCode || currentUserRow?.USER_CODE ||
    user?.USER_CODE || user?.userCode || user?.user_code || user?.code || "";

  useEffect(() => {
    try { sessionStorage.setItem(FILTER_KEY, JSON.stringify(filters)); } catch {}
  }, [filters]);

  const notify = useCallback((type, text) => {
    setToast({ type, text });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), type === "error" ? 8000 : 4000);
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const setF = (k) => (e) => setFilters((p) => ({ ...p, [k]: e.target.value }));

  const body = useCallback(
    (extra = {}) => ({
      json_data: {
        payFreq: filters.payFreq || null, cutOff: filters.cutOff || null,
        empNo: filters.empNo || null, branchCode: filters.branchCode || null,
        groupCode: filters.groupCode || null, status: filters.status || null,
        userCode: userCode || null, ...extra,
      },
    }),
    [filters, userCode]
  );

  const post = async (path, payload) => {
    const { data } = await apiClient.post(`${API}/${path}`, payload);
    if (data?.success === false) throw new Error(data.message || "Request failed.");
    return data;
  };
  const fail = (e) => notify("error", e?.response?.data?.message || e?.message || "Unexpected error.");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await post("load", body());
      setRows(Array.isArray(r.data) ? r.data : []);
    } catch (e) { fail(e); } finally { setLoading(false); }
  }, [body]);

  const getDetail = useCallback(async (tsId) => {
    if (!tsId) return;
    setLoading(true);
    try {
      const r = await post("get", { json_data: { tsId } });
      setSelectedTsId(tsId);
      setDetail({ ...EMPTY, ...(r.data || {}) });
    } catch (e) { fail(e); } finally { setLoading(false); }
  }, []);

  const refresh = async (tsId) => {
    await load();
    if (tsId || selectedTsId) await getDetail(tsId || selectedTsId);
  };

  const execute = async (action, extra, label) => {
    setLoading(true);
    try {
      const r = await post(action, body(extra));
      notify("ok", r.message || r?.data?.[0]?.message || `${label} completed.`);
      await refresh(extra.tsId || selectedTsId);
    } catch (e) { fail(e); } finally { setLoading(false); }
  };

  const run = (action, label, extra = {}, tone = "blue", text = "") =>
    setConfirm({ title: `${label}?`, text, tone, onOk: () => { setConfirm(null); execute(action, extra, label); } });

  /* derived state */
  const h = detail.header;
  const status = up(h?.status);
  const errors = useMemo(
    () => detail.exceptions.filter((x) => up(x.resolved || "N") !== "Y" && up(x.severity) === "ERROR").length,
    [detail.exceptions]
  );
  const warnings = useMemo(
    () => detail.exceptions.filter((x) => up(x.resolved || "N") !== "Y" && up(x.severity) !== "ERROR").length,
    [detail.exceptions]
  );

  const canRecalc = !!h && h.locked !== "Y" && h.posted !== "Y";
  const canValidate = !!h && status === "FOR REVIEW" && h.locked !== "Y" && h.posted !== "Y" && errors === 0;
  const canFinalize = !!h && status === "VALIDATED" && h.validated === "Y" && h.locked !== "Y" && errors === 0;
  const canUnfinalize = !!h && status === "FINALIZED" && h.locked === "Y" && h.posted === "Y";

  const blocker = !h ? "" :
    errors > 0 ? `${errors} unresolved error(s) block validation and finalization.` :
    status === "GENERATED" ? "Recalculate to move this timesheet to review." :
    status === "FOR REVIEW" ? "Ready to validate." :
    status === "VALIDATED" ? "Ready to finalize." :
    status === "FINALIZED" ? "Locked. Unfinalize to make changes." : "";

  const counts = useMemo(() => {
    const c = { ALL: rows.length };
    STATUSES.forEach((s) => (c[s] = rows.filter((r) => up(r.status) === s).length));
    return c;
  }, [rows]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = rows.filter((r) =>
      (chip === "ALL" || up(r.status) === chip) &&
      (!onlyIssues || Number(r.exceptionCount) > 0) &&
      (!q || `${r.empNo} ${r.empName}`.toLowerCase().includes(q))
    );
    const { key, dir } = sort;
    return [...list].sort((a, b) => {
      const x = a[key], y = b[key];
      const n = typeof x === "number" || typeof y === "number" || key.endsWith("Hrs") || key === "exceptionCount";
      return (n ? Number(x || 0) - Number(y || 0) : String(x ?? "").localeCompare(String(y ?? ""))) * dir;
    });
  }, [rows, chip, onlyIssues, search, sort]);

  const idx = visible.findIndex((r) => r.tsId === selectedTsId);
  const go = (step) => {
    const n = visible[idx + step];
    if (n) getDetail(n.tsId);
  };
  const onListKey = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); go(idx < 0 ? 1 : 1); if (idx < 0 && visible[0]) getDetail(visible[0].tsId); }
    if (e.key === "ArrowUp") { e.preventDefault(); go(-1); }
  };
  const toggleSort = (key) => setSort((p) => ({ key, dir: p.key === key ? -p.dir : 1 }));

  const tabs = [
    ["daily", "Daily", detail.daily, DAILY_COLS],
    ["payItems", "Pay Items", detail.payItems, PAY_COLS],
    ["allocations", "Allocations", detail.allocations, ALLOC_COLS],
    ["exceptions", "Exceptions", detail.exceptions, EXC_COLS],
  ];
  const active = tabs.find((t) => t[0] === tab);
  const tabRows = tab === "exceptions" && onlyOpenExc ? active[2].filter((x) => up(x.resolved || "N") !== "Y") : active[2];

  const onEnter = (e) => { if (e.key === "Enter" && filters.cutOff && !loading) load(); };

  /* ───────────── render ───────────── */
  return (
    <div className="mt-8 min-h-screen bg-slate-100 p-3 text-sm text-slate-800">
      <div className="mx-auto max-w-[1800px] space-y-3">
        {/* header + filters + actions */}
        <section className="rounded-lg border bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
            <div>
              <h1 className="text-lg font-bold">Timesheet</h1>
              <p className="text-xs text-slate-500">Generate, calculate, review, validate and finalize employee timesheets.</p>
            </div>
            {h && <Stepper status={status} />}
          </div>

          <div className="grid grid-cols-1 gap-2 p-3 md:grid-cols-3 xl:grid-cols-6" onKeyDown={onEnter}>
            <Field label="Payroll Frequency">
              <select value={filters.payFreq} onChange={setF("payFreq")} className="input">
                <option value="S">Semi-Monthly</option><option value="M">Monthly</option><option value="W">Weekly</option>
              </select>
            </Field>
            <Field label="Cut-off"><input value={filters.cutOff} onChange={setF("cutOff")} placeholder="2026092" className="input" /></Field>
            <Field label="Employee No."><input value={filters.empNo} onChange={setF("empNo")} className="input" /></Field>
            <Field label="Branch"><input value={filters.branchCode} onChange={setF("branchCode")} className="input" /></Field>
            <Field label="Pay Group"><input value={filters.groupCode} onChange={setF("groupCode")} className="input" /></Field>
            <Field label="Status">
              <select value={filters.status} onChange={setF("status")} className="input">
                <option value="">All</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t p-3">
            <Btn disabled={loading || !filters.cutOff} onClick={load}>Load</Btn>
            <Btn onClick={() => { setFilters(DEFAULT_FILTERS); setRows([]); setDetail(EMPTY); setSelectedTsId(null); }}>Clear</Btn>
            <span className="mx-1 hidden h-6 w-px bg-slate-200 sm:block" />
            <Btn type="blue" disabled={loading || !filters.cutOff || !userCode}
              onClick={() => run("generate", "Generate timesheets", {}, "blue", `Cut-off ${filters.cutOff}. Existing locked timesheets are not affected.`)}>Generate</Btn>
            <Btn type="amber" disabled={loading || !canRecalc || !userCode}
              onClick={() => run("recalculate", "Recalculate", { tsId: h.tsId }, "amber", `${h?.empNo} - ${h?.empName}`)}>Recalculate</Btn>
            <Btn type="blue" disabled={loading || !canValidate || !userCode}
              onClick={() => run("validate", "Validate", { tsId: h.tsId }, "blue", `${h?.empNo} - ${h?.empName}`)}>Validate</Btn>
            <Btn type="green" disabled={loading || !canFinalize || !userCode}
              onClick={() => run("finalize", "Finalize and lock", { tsId: h.tsId }, "green", "The timesheet will be locked from further edits.")}>Finalize</Btn>
            <Btn type="red" disabled={loading || !canUnfinalize || !userCode}
              onClick={() => run("unfinalize", "Reopen finalized timesheet", { tsId: h.tsId }, "red", "This unlocks the timesheet and clears its posted state.")}>Unfinalize</Btn>
            {blocker && <span className={`ml-auto text-xs ${errors > 0 ? "font-semibold text-red-600" : "text-slate-500"}`}>{blocker}</span>}
          </div>
        </section>

        {!userCode && <Alert error>No logged-in user was found. Sign in again to enable actions.</Alert>}

        <div className="grid min-h-[650px] grid-cols-1 gap-3 xl:grid-cols-[540px_minmax(0,1fr)]">
          {/* employee list */}
          <section className="overflow-hidden rounded-lg border bg-white shadow-sm">
            <div className="space-y-2 border-b p-3">
              <div className="flex items-center justify-between font-semibold">
                <span>Employees</span>
                <span className="text-xs font-normal text-slate-500">{visible.length} of {rows.length}</span>
              </div>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employee no. or name" className="input" />
              <div className="flex flex-wrap items-center gap-1">
                {["ALL", ...STATUSES].map((s) => (
                  <button key={s} onClick={() => setChip(s)}
                    className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${chip === s ? "border-blue-600 bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}>
                    {s === "ALL" ? "All" : s} <span className="opacity-70">{counts[s]}</span>
                  </button>
                ))}
                <label className="ml-auto flex items-center gap-1 text-[11px] text-slate-600">
                  <input type="checkbox" checked={onlyIssues} onChange={(e) => setOnlyIssues(e.target.checked)} /> With exceptions
                </label>
              </div>
            </div>
            <div className="max-h-[700px] overflow-auto outline-none" tabIndex={0} onKeyDown={onListKey}>
              <table className="w-full text-xs">
                <thead className="sticky top-0 z-10 bg-slate-50">
                  <tr>
                    <SortTh k="empNo" sort={sort} on={toggleSort}>Employee</SortTh>
                    <SortTh k="status" sort={sort} on={toggleSort}>Status</SortTh>
                    <SortTh k="totalRegHrs" sort={sort} on={toggleSort} right>Reg</SortTh>
                    <SortTh k="totalOtHrs" sort={sort} on={toggleSort} right>OT</SortTh>
                    <SortTh k="exceptionCount" sort={sort} on={toggleSort} right>Exc.</SortTh>
                  </tr>
                </thead>
                <tbody>
                  {loading && rows.length === 0 && [...Array(6)].map((_, i) => (
                    <tr key={i} className="border-t"><td colSpan="5" className="p-3"><div className="h-4 animate-pulse rounded bg-slate-100" /></td></tr>
                  ))}
                  {visible.map((r) => (
                    <tr key={r.tsId} onClick={() => getDetail(r.tsId)}
                      className={`cursor-pointer border-t hover:bg-blue-50 ${selectedTsId === r.tsId ? "bg-blue-50 shadow-[inset_3px_0_0_#2563eb]" : ""}`}>
                      <Td><b>{r.empNo}</b><div className="max-w-[220px] truncate text-slate-500">{r.empName}</div></Td>
                      <Td><span className={`rounded border px-2 py-0.5 text-[10px] font-bold ${statusCss(r.status)}`}>{r.status}</span></Td>
                      <Td right>{num(r.totalRegHrs)}</Td>
                      <Td right>{num(r.totalOtHrs)}</Td>
                      <Td right><span className={Number(r.exceptionCount) > 0 ? "font-bold text-red-600" : ""}>{r.exceptionCount || 0}</span></Td>
                    </tr>
                  ))}
                  {!loading && visible.length === 0 && (
                    <tr><td colSpan="5" className="p-8 text-center text-slate-400">
                      {rows.length === 0 ? "Enter a cut-off and select Load, or Generate to create timesheets." : "No employees match these filters."}
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* detail */}
          <section className="min-w-0 space-y-3">
            {!h ? (
              <div className="flex min-h-[500px] items-center justify-center rounded-lg border bg-white text-slate-400 shadow-sm">
                Select an employee timesheet to review it.
              </div>
            ) : (
              <>
                <Summary h={h} errors={errors} warnings={warnings} idx={idx} total={visible.length} go={go} />
                <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
                  <div className="flex items-center border-b">
                    <div className="flex flex-1 overflow-x-auto">
                      {tabs.map(([k, l, data]) => (
                        <button key={k} onClick={() => setTab(k)}
                          className={`whitespace-nowrap border-b-2 px-4 py-3 text-xs font-semibold ${tab === k ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
                          {l} ({data.length})
                          {k === "exceptions" && errors > 0 && <span className="ml-1 rounded-full bg-red-600 px-1.5 text-[10px] text-white">{errors}</span>}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 px-3">
                      {tab === "exceptions" && (
                        <label className="flex items-center gap-1 text-[11px] text-slate-600">
                          <input type="checkbox" checked={onlyOpenExc} onChange={(e) => setOnlyOpenExc(e.target.checked)} /> Unresolved only
                        </label>
                      )}
                      <Btn disabled={!tabRows.length} onClick={() => toCsv(active[3], tabRows, `timesheet_${h.empNo}_${tab}`)}>Export CSV</Btn>
                    </div>
                  </div>
                  <div className="max-h-[560px] overflow-auto">
                    <DataTable cols={active[3]} rows={tabRows} rowClass={tab === "daily" ? dailyRowClass : undefined}
                      keyOf={(r, i) => r.tsDtlId || r.tsPayItemId || r.tsAllocId || r.tsExceptionId || i} />
                  </div>
                  {tab === "daily" && (
                    <div className="flex flex-wrap gap-3 border-t px-3 py-2 text-[11px] text-slate-500">
                      <Legend c="bg-red-100">Absent</Legend><Legend c="bg-amber-100">Late / Undertime</Legend>
                      <Legend c="bg-violet-100">Holiday</Legend><Legend c="bg-slate-200">Rest day</Legend>
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      </div>

      {/* toast */}
      {toast && (
        <div role="status" className="fixed bottom-4 right-4 z-50 max-w-sm">
          <Alert error={toast.type === "error"} onClose={() => setToast(null)}>{toast.text}</Alert>
        </div>
      )}

      {/* confirm dialog */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setConfirm(null)}>
          <div role="dialog" aria-modal="true" className="w-full max-w-sm rounded-lg bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-bold">{confirm.title}</h2>
            {confirm.text && <p className="mt-1 text-xs text-slate-600">{confirm.text}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <Btn onClick={() => setConfirm(null)}>Cancel</Btn>
              <Btn type={confirm.tone} autoFocus onClick={confirm.onOk}>Confirm</Btn>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="pointer-events-none fixed inset-x-0 top-0 z-50 h-1 overflow-hidden bg-blue-100">
          <div className="h-full w-1/3 animate-pulse bg-blue-600" />
        </div>
      )}
      <style>{`.input{width:100%;border:1px solid #cbd5e1;border-radius:.375rem;padding:.4rem .5rem;font-size:.75rem;background:#fff}.input:focus{outline:2px solid #2563eb33;border-color:#2563eb}`}</style>
    </div>
  );
}

/* ───────────── sub-components ───────────── */
function Stepper({ status }) {
  const at = FLOW.indexOf(status);
  return (
    <ol className="flex items-center gap-1 text-[11px] font-semibold">
      {FLOW.map((s, i) => (
        <li key={s} className="flex items-center gap-1">
          <span className={`rounded-full border px-2.5 py-1 ${i === at ? statusCss(s) : i < at ? "border-slate-200 bg-slate-50 text-slate-600" : "border-dashed text-slate-400"}`}>{s}</span>
          {i < FLOW.length - 1 && <span className="text-slate-300">›</span>}
        </li>
      ))}
    </ol>
  );
}

function Summary({ h, errors, warnings, idx, total, go }) {
  const cards = [
    ["Regular", h.totalRegHrs], ["OT", h.totalOtHrs], ["ND", h.totalNdHrs], ["Leave", h.totalLeaveHrs],
    ["Absent", h.totalAbsentHrs, "red"], ["Late", h.totalLateHrs, "amber"], ["UT", h.totalUtHrs, "amber"],
  ];
  return (
    <div className="rounded-lg border bg-white p-3 shadow-sm">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <b>{h.empNo} - {h.empName}</b>
          <div className="text-xs text-slate-500">
            {date(h.startDate)} to {date(h.endDate)} · {h.branchCode || "-"} · {h.deptCode || "-"}
            {h.locked === "Y" && <span className="ml-2 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold">LOCKED</span>}
            {h.posted === "Y" && <span className="ml-1 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold">POSTED</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {errors > 0 && <span className="rounded bg-red-50 px-2 py-1 text-xs font-bold text-red-700">{errors} error(s)</span>}
          {warnings > 0 && <span className="rounded bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700">{warnings} warning(s)</span>}
          <Btn disabled={idx <= 0} onClick={() => go(-1)}>‹ Prev</Btn>
          <span className="text-xs text-slate-500">{idx >= 0 ? idx + 1 : "-"}/{total}</span>
          <Btn disabled={idx < 0 || idx >= total - 1} onClick={() => go(1)}>Next ›</Btn>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
        {cards.map(([l, v, tone]) => (
          <div key={l} className={`rounded border p-2 ${Number(v) > 0 && tone === "red" ? "border-red-200 bg-red-50" : Number(v) > 0 && tone === "amber" ? "border-amber-200 bg-amber-50" : "bg-slate-50"}`}>
            <div className="text-[10px] uppercase text-slate-500">{l} Hrs</div>
            <b className="text-base">{num(v)}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

function DataTable({ cols, rows, rowClass, keyOf }) {
  const totals = cols.some((c) => c.sum) && rows.length > 0;
  return (
    <table className="w-full min-w-[1000px] text-xs">
      <thead className="sticky top-0 z-10 bg-slate-50">
        <tr>{cols.map((c) => <Th key={c.key} right={c.right}>{c.label}</Th>)}</tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={keyOf(r, i)} className={`border-t ${rowClass ? rowClass(r) : ""}`}>
            {cols.map((c) => <Td key={c.key} right={c.right} wrap={c.wrap}>{c.render ? c.render(r) : r[c.key]}</Td>)}
          </tr>
        ))}
        {rows.length === 0 && <tr><td colSpan={cols.length} className="p-8 text-center text-slate-400">Nothing to show here.</td></tr>}
      </tbody>
      {totals && (
        <tfoot className="sticky bottom-0 bg-slate-50 font-bold">
          <tr className="border-t-2">
            {cols.map((c, i) => (
              <Td key={c.key} right={c.right}>
                {c.sum ? num(rows.reduce((a, r) => a + Number(r[c.key] || 0), 0), c.key === "days" || c.key === "hours" ? 4 : 2) : i === 0 ? "Total" : ""}
              </Td>
            ))}
          </tr>
        </tfoot>
      )}
    </table>
  );
}

function Field({ label, children }) {
  return <label><span className="mb-1 block text-[11px] font-semibold uppercase text-slate-500">{label}</span>{children}</label>;
}
function Btn({ type = "light", disabled, children, ...p }) {
  const c = {
    light: "border bg-white hover:bg-slate-50", blue: "bg-blue-600 text-white hover:bg-blue-700",
    amber: "bg-amber-500 text-white hover:bg-amber-600", green: "bg-emerald-600 text-white hover:bg-emerald-700",
    red: "bg-red-600 text-white hover:bg-red-700",
  }[type] || "border bg-white";
  return <button type="button" {...p} disabled={disabled} className={`rounded px-3 py-2 text-xs font-semibold ${c} ${disabled ? "cursor-not-allowed opacity-40" : ""}`}>{children}</button>;
}
function Alert({ error, children, onClose }) {
  return (
    <div className={`flex items-start gap-2 rounded border px-3 py-2 text-xs shadow ${error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
      <span className="flex-1">{children}</span>
      {onClose && <button onClick={onClose} aria-label="Dismiss" className="font-bold opacity-60 hover:opacity-100">×</button>}
    </div>
  );
}
function Legend({ c, children }) { return <span className="flex items-center gap-1"><i className={`inline-block h-2.5 w-2.5 rounded-sm ${c}`} />{children}</span>; }
function Th({ children, right }) {
  return <th className={`whitespace-nowrap border-b px-2 py-2 font-semibold text-slate-600 ${right ? "text-right" : "text-left"}`}>{children}</th>;
}
function SortTh({ k, sort, on, right, children }) {
  return (
    <th onClick={() => on(k)} className={`cursor-pointer select-none whitespace-nowrap border-b px-2 py-2 font-semibold text-slate-600 hover:text-slate-900 ${right ? "text-right" : "text-left"}`}>
      {children}{sort.key === k ? (sort.dir === 1 ? " ▲" : " ▼") : ""}
    </th>
  );
}
function Td({ children, right, wrap }) {
  return <td className={`${wrap ? "min-w-[200px] whitespace-normal" : "whitespace-nowrap"} px-2 py-2 align-top ${right ? "text-right tabular-nums" : ""}`}>{children ?? ""}</td>;
}
