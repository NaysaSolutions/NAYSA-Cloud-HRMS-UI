import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Download,
  Minus,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  ShieldOff,
  Users,
  WifiOff,
} from "lucide-react";
import Swal from "sweetalert2";

import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "./AuthContext.jsx";

const AUTO_REFRESH_MS = 60_000;

function initials(code = "") {
  return (
    code
      .toString()
      .trim()
      .slice(0, 2)
      .toUpperCase() || "—"
  );
}

function formatDateTime(value) {
  if (!value) return "—";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);

  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

function MetricCard({
  label,
  value,
  icon: Icon,
  tone = "sky",
  footnote,
  loading,
}) {
  const tones = {
    sky: {
      icon: "bg-sky-50 text-sky-700",
      ring: "group-hover:border-sky-200",
    },
    emerald: {
      icon: "bg-emerald-50 text-emerald-700",
      ring: "group-hover:border-emerald-200",
    },
    amber: {
      icon: "bg-amber-50 text-amber-700",
      ring: "group-hover:border-amber-200",
    },
  };

  const selected = tones[tone] ?? tones.sky;

  return (
    <div
      className={`group rounded-2xl border border-white/80 bg-white/90 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(15,23,42,0.10)] ${selected.ring}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">
            {label}
          </p>

          {loading ? (
            <div className="mt-3 h-9 w-20 animate-pulse rounded-lg bg-slate-100" />
          ) : (
            <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">
              {value}
            </p>
          )}

          <p className="mt-1 text-xs font-semibold text-slate-400">
            {footnote}
          </p>
        </div>

        <div className={`rounded-2xl p-3.5 ${selected.icon}`}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}

function SeatUsageBar({ used, cap }) {
  const percentage =
    cap > 0
      ? Math.min(100, Math.round((used / cap) * 100))
      : 0;

  const barTone =
    percentage >= 90
      ? "bg-rose-500"
      : percentage >= 70
        ? "bg-amber-500"
        : "bg-gradient-to-r from-sky-500 to-blue-700";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-extrabold text-slate-800">
            Seat utilization
          </p>
          <p className="text-xs text-slate-500">
            {used} of {cap} seats are currently active
          </p>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-black ${
            percentage >= 90
              ? "bg-rose-50 text-rose-700"
              : percentage >= 70
                ? "bg-amber-50 text-amber-700"
                : "bg-sky-50 text-sky-700"
          }`}
        >
          {percentage}%
        </span>
      </div>

      <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barTone}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function exportUsersToCsv(users) {
  const rows = [
    ["User Code", "User Name", "Last Seen", "Last Login"],
    ...users.map((row) => [
      row.USER_CODE ?? row.user_code ?? "",
      row.USER_NAME ?? row.user_name ?? "",
      row.LAST_SEEN_AT ?? row.last_seen_at ?? "",
      row.LAST_LOGIN_AT ?? row.last_login_at ?? "",
    ]),
  ];

  const csv = rows
    .map((row) =>
      row
        .map((cell) => {
          const value = String(cell ?? "").replaceAll('"', '""');
          return `"${value}"`;
        })
        .join(",")
    )
    .join("\r\n");

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `active-license-users-${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(url);
}

export default function LicenseManagement() {
  const { user } = useAuth();

  const [status, setStatus] = useState(null);
  const [seatCount, setSeatCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const canManage = useMemo(
    () =>
      ["LICENSE_ADMIN", "SYSTEM_ADMIN"].includes(
        user?.ACCOUNT_MODE
      ),
    [user?.ACCOUNT_MODE]
  );

  const activeUsers = useMemo(
    () => status?.activeUsers ?? [],
    [status?.activeUsers]
  );

  const currentSeatCap = Number(status?.seatCap ?? 0);
  const currentActiveSeats = Number(status?.activeSeats ?? 0);
  const proposedSeatCap = Number(seatCount ?? 0);

  const hasChanges =
    Number.isFinite(proposedSeatCap) &&
    proposedSeatCap !== currentSeatCap;

  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) return activeUsers;

    return activeUsers.filter((row) => {
      const code = String(
        row.USER_CODE ?? row.user_code ?? ""
      ).toLowerCase();

      const name = String(
        row.USER_NAME ?? row.user_name ?? ""
      ).toLowerCase();

      return code.includes(query) || name.includes(query);
    });
  }, [activeUsers, searchTerm]);

  const loadStatus = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);

      setErrorMessage("");

      try {
        const { data } = await apiClient.get(
          "/license-management/status",
          {
            withCredentials: true,
          }
        );

        const next = data?.data ?? null;

        setStatus(next);
        setSeatCount(Number(next?.seatCap ?? 0));
        setLastUpdated(new Date());
      } catch (error) {
        const message =
          error?.response?.data?.message ||
          error?.message ||
          "Unable to retrieve license information.";

        setErrorMessage(message);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!canManage) return undefined;

    loadStatus();

    const timer = window.setInterval(() => {
      loadStatus({ silent: true });
    }, AUTO_REFRESH_MS);

    return () => window.clearInterval(timer);
  }, [canManage, loadStatus]);

  const adjustSeats = (delta) => {
    setSeatCount((previous) => {
      const current = Number(previous) || 0;
      return Math.max(0, current + delta);
    });
  };

  const saveSeats = async () => {
    const count = Number(seatCount);

    if (!Number.isInteger(count) || count < 0) {
      await Swal.fire({
        icon: "warning",
        title: "Invalid seat count",
        text: "Enter a whole number equal to or greater than zero.",
        confirmButtonColor: "#1d4ed8",
      });
      return;
    }

    if (!hasChanges) {
      await Swal.fire({
        icon: "info",
        title: "No changes detected",
        text: "The seat capacity is already set to this value.",
        confirmButtonColor: "#1d4ed8",
      });
      return;
    }

    if (count < currentActiveSeats) {
      const result = await Swal.fire({
        icon: "warning",
        title: "Capacity is below active usage",
        text: `There are currently ${currentActiveSeats} active seats. Reducing the capacity to ${count} may prevent additional users from signing in.`,
        showCancelButton: true,
        confirmButtonText: "Continue",
        cancelButtonText: "Review",
        confirmButtonColor: "#1d4ed8",
      });

      if (!result.isConfirmed) return;
    } else {
      const result = await Swal.fire({
        icon: "question",
        title: "Update seat capacity?",
        html: `
          <div style="font-size:14px;color:#475569">
            Change the allowed seats from
            <strong>${currentSeatCap}</strong> to
            <strong>${count}</strong>?
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: "Save changes",
        cancelButtonText: "Cancel",
        confirmButtonColor: "#1d4ed8",
      });

      if (!result.isConfirmed) return;
    }

    setSaving(true);

    try {
      const { data } = await apiClient.post(
        "/license-management/seats",
        { count },
        { withCredentials: true }
      );

      await Swal.fire({
        icon: "success",
        title: "License updated",
        text:
          data?.message ||
          "The seat capacity was updated successfully.",
        confirmButtonColor: "#1d4ed8",
      });

      await loadStatus();
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Unable to update license",
        text:
          error?.response?.data?.message ||
          error?.message ||
          "Please try again.",
        confirmButtonColor: "#1d4ed8",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!canManage) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-sky-50 to-blue-100 p-6">
        <div className="w-full max-w-md rounded-3xl border border-white/80 bg-white/90 p-8 text-center shadow-2xl backdrop-blur">
          <img
            src="/naysa_logo.png"
            alt="NAYSA Logo"
            className="mx-auto w-28 drop-shadow-[0_6px_14px_rgba(15,23,42,.18)]"
          />

          <div className="mx-auto mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-rose-50">
            <ShieldOff className="text-rose-500" size={28} />
          </div>

          <h1 className="mt-4 text-xl font-black text-slate-950">
            Access denied
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Your account is not allowed to access License Management.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-sky-50 to-blue-100">
      <header className="relative overflow-hidden border-b border-white/40 bg-gradient-to-r from-[#7392b7] via-[#a8bbcf] to-[#d8e1e9]">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 15%, rgba(255,255,255,.55), transparent 38%), radial-gradient(circle at 88% 20%, rgba(3,105,161,.20), transparent 36%)",
          }}
        />

        <div className="relative mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl border border-white/70 bg-white/55 p-3 shadow-lg backdrop-blur">
              <img
                src="/naysa_logo.png"
                alt="NAYSA Logo"
                className="w-28 drop-shadow-[0_5px_12px_rgba(15,23,42,.18)] sm:w-32"
              />
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-900/80">
                NAYSA License Administration
              </p>

              <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                License Management
              </h1>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-bold">
                <span className="rounded-full border border-white/80 bg-white/65 px-3 py-1 text-slate-700 backdrop-blur">
                  {user?.USER_CODE}
                </span>

                <span className="rounded-full bg-sky-900/10 px-3 py-1 text-sky-900">
                  {user?.ACCOUNT_MODE}
                </span>

                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50/90 px-3 py-1 text-emerald-700">
                  <CheckCircle2 size={13} />
                  License exempt
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="rounded-xl border border-white/70 bg-white/55 px-4 py-2 text-xs font-semibold text-slate-600 backdrop-blur">
              <div className="flex items-center gap-2">
                <Activity size={14} className="text-sky-700" />
                <span>
                  {lastUpdated
                    ? `Updated ${formatDateTime(lastUpdated)}`
                    : "Waiting for license data"}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => loadStatus()}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/70 bg-white/70 px-4 py-2.5 text-sm font-extrabold text-slate-800 shadow-sm backdrop-blur transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={loading ? "animate-spin" : ""}
              />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
        {errorMessage && (
          <div className="mb-5 flex flex-col gap-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <div className="mt-0.5 rounded-xl bg-white p-2 text-rose-600 shadow-sm">
                <WifiOff size={18} />
              </div>

              <div>
                <p className="font-extrabold text-rose-900">
                  Unable to load license status
                </p>
                <p className="mt-1 text-sm text-rose-700">
                  {errorMessage}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => loadStatus()}
              className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-extrabold text-white transition hover:bg-rose-500"
            >
              Try again
            </button>
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-3">
          <MetricCard
            label="Seat Capacity"
            value={currentSeatCap}
            icon={ShieldCheck}
            tone="sky"
            footnote="Total seats allowed by the license"
            loading={loading}
          />

          <MetricCard
            label="Active Seats"
            value={currentActiveSeats}
            icon={Users}
            tone="emerald"
            footnote="Users currently consuming a seat"
            loading={loading}
          />

          <MetricCard
            label="Remaining Seats"
            value={Number(status?.remainingSeats ?? 0)}
            icon={Activity}
            tone="amber"
            footnote="Seats still available for sign-in"
            loading={loading}
          />
        </section>

        <section className="mt-4 rounded-2xl border border-white/80 bg-white/90 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur">
          <SeatUsageBar
            used={currentActiveSeats}
            cap={currentSeatCap}
          />
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[400px_1fr]">
          <section className="h-fit rounded-3xl border border-white/80 bg-white/90 p-6 shadow-[0_16px_36px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-700">
                  License Control
                </p>

                <h2 className="mt-1 text-xl font-black text-slate-950">
                  Update Seat Capacity
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  The value is encrypted before being saved to
                  <span className="font-bold text-slate-800">
                    {" "}
                    HS_SYS
                  </span>
                  .
                </p>
              </div>

              <div className="rounded-2xl bg-sky-50 p-3 text-sky-700">
                <ShieldCheck size={22} />
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                  Current
                </p>
                <p className="mt-1 text-2xl font-black text-slate-900">
                  {currentSeatCap}
                </p>
              </div>

              <div
                className={`rounded-2xl p-4 ${
                  hasChanges
                    ? "bg-blue-50"
                    : "bg-slate-50"
                }`}
              >
                <p
                  className={`text-[11px] font-black uppercase tracking-wider ${
                    hasChanges
                      ? "text-blue-600"
                      : "text-slate-400"
                  }`}
                >
                  Proposed
                </p>
                <p
                  className={`mt-1 text-2xl font-black ${
                    hasChanges
                      ? "text-blue-800"
                      : "text-slate-900"
                  }`}
                >
                  {Number.isFinite(proposedSeatCap)
                    ? proposedSeatCap
                    : 0}
                </p>
              </div>
            </div>

            {proposedSeatCap < currentActiveSeats && (
              <div className="mt-4 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <AlertTriangle
                  size={18}
                  className="mt-0.5 flex-none text-amber-600"
                />
                <p className="text-sm leading-5 text-amber-800">
                  The proposed capacity is lower than the current active
                  seat count.
                </p>
              </div>
            )}

            <label className="mt-6 block text-xs font-black uppercase tracking-[0.14em] text-slate-600">
              Allowed Seats
            </label>

            <div className="mt-2 flex items-stretch gap-2">
              <button
                type="button"
                onClick={() => adjustSeats(-1)}
                disabled={saving || loading}
                aria-label="Decrease seat count"
                className="flex w-12 items-center justify-center rounded-xl border border-slate-300 bg-slate-50 text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 disabled:opacity-50"
              >
                <Minus size={18} />
              </button>

              <input
                type="number"
                min="0"
                step="1"
                value={seatCount}
                onChange={(event) =>
                  setSeatCount(event.target.value)
                }
                className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-center text-xl font-black text-slate-950 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
              />

              <button
                type="button"
                onClick={() => adjustSeats(1)}
                disabled={saving || loading}
                aria-label="Increase seat count"
                className="flex w-12 items-center justify-center rounded-xl border border-slate-300 bg-slate-50 text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 disabled:opacity-50"
              >
                <Plus size={18} />
              </button>
            </div>

            <button
              type="button"
              onClick={saveSeats}
              disabled={saving || loading || !hasChanges}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0369a1] to-[#1d4ed8] px-4 py-3.5 text-sm font-black text-white shadow-lg shadow-blue-900/10 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50"
            >
              <Save size={17} />
              {saving
                ? "Saving changes…"
                : hasChanges
                  ? "Save Seat Capacity"
                  : "No Changes"}
            </button>

            <div className="mt-4 flex items-center justify-center gap-2 text-xs font-semibold text-slate-400">
              <RefreshCw size={13} />
              Auto-refreshes every 60 seconds
            </div>
          </section>

          <section className="overflow-hidden rounded-3xl border border-white/80 bg-white/90 shadow-[0_16px_36px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="border-b border-slate-200/80 p-5 sm:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-700">
                    Current Usage
                  </p>

                  <h2 className="mt-1 text-xl font-black text-slate-950">
                    Active Licensed Users
                  </h2>

                  <p className="mt-2 text-sm text-slate-600">
                    HEARTSTRONG and MIRACLE are excluded because they are
                    fixed, license-exempt accounts.
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="relative">
                    <Search
                      size={16}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      type="search"
                      value={searchTerm}
                      onChange={(event) =>
                        setSearchTerm(event.target.value)
                      }
                      placeholder="Search user..."
                      className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100 sm:w-56"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => exportUsersToCsv(filteredUsers)}
                    disabled={filteredUsers.length === 0}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Download size={16} />
                    Export CSV
                  </button>
                </div>
              </div>
            </div>

            <div className="max-h-[580px] overflow-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-500 sm:px-6">
                      User
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-500 sm:px-6">
                      User Name
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-500 sm:px-6">
                      Last Seen
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-500 sm:px-6">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 bg-white/80">
                  {loading &&
                    Array.from({ length: 5 }).map((_, index) => (
                      <tr key={`skeleton-${index}`}>
                        {Array.from({ length: 4 }).map(
                          (_, cellIndex) => (
                            <td
                              key={`cell-${cellIndex}`}
                              className="px-5 py-4 sm:px-6"
                            >
                              <div className="h-4 animate-pulse rounded bg-slate-100" />
                            </td>
                          )
                        )}
                      </tr>
                    ))}

                  {!loading &&
                    filteredUsers.map((row) => {
                      const code =
                        row.USER_CODE ?? row.user_code ?? "—";

                      const name =
                        row.USER_NAME ?? row.user_name ?? "";

                      const lastSeen =
                        row.LAST_SEEN_AT ??
                        row.last_seen_at ??
                        null;

                      return (
                        <tr
                          key={code}
                          className="transition hover:bg-sky-50/60"
                        >
                          <td className="px-5 py-4 sm:px-6">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-gradient-to-br from-sky-100 to-blue-100 text-xs font-black text-sky-800">
                                {initials(code)}
                              </div>

                              <span className="font-black text-slate-900">
                                {code}
                              </span>
                            </div>
                          </td>

                          <td className="px-5 py-4 font-medium text-slate-700 sm:px-6">
                            {name || "—"}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-slate-600 sm:px-6">
                            {formatDateTime(lastSeen)}
                          </td>

                          <td className="px-5 py-4 sm:px-6">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              Active
                            </span>
                          </td>
                        </tr>
                      );
                    })}

                  {!loading && filteredUsers.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-6 py-14 text-center"
                      >
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                          <Users size={22} />
                        </div>

                        <p className="mt-3 font-extrabold text-slate-700">
                          No active licensed users found
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          {searchTerm
                            ? "Try a different search term."
                            : "There are currently no active licensed users."}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50/70 px-5 py-3 text-xs font-semibold text-slate-500 sm:px-6">
              <span>
                Showing {filteredUsers.length} of {activeUsers.length} users
              </span>

              <span>
                Auto-refresh interval: 60 seconds
              </span>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}