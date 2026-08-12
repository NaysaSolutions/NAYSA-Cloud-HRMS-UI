import { useEffect, useRef, useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { useSelectedHSColConfig } from "@/NAYSA Cloud/Global/selectedData";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

// Lookup / modal components
import SearchGlobalReportTable from "../../Lookup/SearchGlobalReportTable";
import UsersLookupModal from "@/NAYSA Cloud/Lookup/SearchUsers";

// FontAwesome icons used in this page
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faSearch,
    faUndo,
    faTimes,
    faExchangeAlt,
    faEye,
    faTable,
    faThLarge,
    faShieldAlt,
} from "@fortawesome/free-solid-svg-icons";

// Reusable UI components
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer";
import ButtonBar from "@/NAYSA Cloud/Global/ButtonBar";

/* =========================================================
   ACTIVITY BADGE
========================================================= */
const activityConfig = {
    Added: { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-400" },
    Edited: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-400" },
    Deleted: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400" },
    Inactivated: { bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-700 dark:text-orange-400" },
    PolicySaved: { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-400" },
    SetTempPassword: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-400" },
    PasswordChanged: { bg: "bg-teal-100 dark:bg-teal-900/30", text: "text-teal-700 dark:text-teal-400" },
    ReleaseAccount: { bg: "bg-indigo-100 dark:bg-indigo-900/30", text: "text-indigo-700 dark:text-indigo-400" },
};

const ActivityBadge = ({ activity }) => {
    const cfg = activityConfig[activity] || {
        bg: "bg-gray-100 dark:bg-gray-800",
        text: "text-gray-600 dark:text-gray-400",
    };
    return (
        <span
            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${cfg.bg} ${cfg.text}`}
        >
            {activity || "—"}
        </span>
    );
};

/* =========================================================
   COMPARISON MODAL
========================================================= */
const ComparisonModal = ({ data, onClose }) => {
    if (!data) return null;

    const toProperCase = (str) =>
        str
            .replace(/([A-Z])/g, " $1")
            .replace(/^./, (s) => s.toUpperCase())
            .trim();

    const parseValue = (val) => {
        try {
            if (!val) return {};
            return typeof val === "string" ? JSON.parse(val) : val;
        } catch (e) {
            return {};
        }
    };

    const before = parseValue(data.beforeVal);
    const after = parseValue(data.afterVal);

    const activityLabel =
        String(data.activity || "").toLowerCase() === "added" ? "Added By" :
            String(data.activity || "").toLowerCase() === "deleted" ? "Deleted By" :
                String(data.activity || "").toLowerCase() === "inactivated" ? "Inactivated By" :
                    String(data.activity || "").toLowerCase() === "edited" ? "Edited By" :
                        "Performed By";

    const allKeys = Array.from(
        new Set([...Object.keys(before), ...Object.keys(after)])
    );

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden border border-gray-200 dark:border-gray-800">

                {/* Header */}
                <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                    <div className="flex justify-between items-start gap-4">
                        <div className="flex items-center gap-4 min-w-0">
                            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 border border-blue-100 dark:border-blue-800 shrink-0">
                                <FontAwesomeIcon icon={faExchangeAlt} />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight truncate">
                                    Security Audit Comparison
                                </h2>
                                <p className="text-[11px] text-gray-500 mt-0.5 italic truncate">
                                    Comparing data snapshots
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-red-500 transition-colors shrink-0"
                        >
                            <FontAwesomeIcon icon={faTimes} size="lg" />
                        </button>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                        {[
                            { label: "Table", val: data.tblCode },
                            { label: activityLabel, val: data.doneBy },
                            { label: "Target User", val: data.refCode },
                            { label: "Name", val: data.refName },
                            { label: "Activity", val: data.activity },
                            { label: "Date", val: data.trailDate ? new Date(data.trailDate).toLocaleString() : "—" },
                        ].map((item, idx) => (
                            <div
                                key={idx}
                                className="bg-gray-50 dark:bg-gray-800 px-3 py-1 rounded border border-gray-100 dark:border-gray-700"
                            >
                                <span className="text-[9px] text-gray-400 font-bold uppercase block leading-none mb-1">
                                    {item.label}
                                </span>
                                {item.label === "Activity" ? (
                                    <ActivityBadge activity={item.val} />
                                ) : (
                                    <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-200">
                                        {item.val || "—"}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-auto bg-gray-50/30 dark:bg-gray-950/30">
                    {allKeys.length === 0 ? (
                        <div className="p-8 text-center text-sm text-gray-400">
                            No snapshot data available for this entry.
                        </div>
                    ) : (
                        <table className="w-full text-left text-[12px] border-separate border-spacing-0">
                            <thead className="sticky top-0 bg-white dark:bg-gray-900 z-10 shadow-sm">
                                <tr className="text-[10px] uppercase font-bold text-gray-400">
                                    <th className="px-4 sm:px-6 py-3 border-b border-gray-100 dark:border-gray-800">
                                        Field
                                    </th>
                                    <th className="px-4 sm:px-6 py-3 border-b border-gray-100 dark:border-gray-800 bg-red-50/20 text-red-500">
                                        Old Value
                                    </th>
                                    <th className="px-4 sm:px-6 py-3 border-b border-gray-100 dark:border-gray-800 bg-green-50/20 text-green-600">
                                        New Value
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {allKeys.map((key) => {
                                    const isDiff = String(before[key]) !== String(after[key]);
                                    return (
                                        <tr
                                            key={key}
                                            className={`hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors ${isDiff ? "bg-amber-50/30 dark:bg-amber-900/5" : ""
                                                }`}
                                        >
                                            <td className="px-4 sm:px-6 py-3 border-b border-gray-100 dark:border-gray-800 font-medium text-gray-600 dark:text-gray-400">
                                                {toProperCase(key)}
                                            </td>
                                            <td className="px-4 sm:px-6 py-3 border-b border-gray-100 dark:border-gray-800 font-mono text-red-500 italic break-all">
                                                {String(before[key] ?? "—")}
                                            </td>
                                            <td className="px-4 sm:px-6 py-3 border-b border-gray-100 dark:border-gray-800 font-mono text-green-600 font-bold break-all">
                                                {String(after[key] ?? "—")}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer */}
                <div className="px-4 sm:px-6 py-3 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                    <button
                        onClick={onClose}
                        className="bg-blue-600 text-white px-4 h-8 rounded-md text-[11px] hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
                    >
                        <FontAwesomeIcon icon={faTimes} className="text-[10px]" />
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

/* =========================================================
   DATE HELPERS
========================================================= */
const getInitialDate = (offsetMonth = 0) => {
    const d = new Date();
    d.setMonth(d.getMonth() - offsetMonth);
    return d.toISOString().split("T")[0];
};

const TODAY = getInitialDate(0);
const ONE_MONTH_AGO = getInitialDate(1);

const ACTIVITY_OPTIONS = [
    { value: "ALL", label: "All Activities" },
    { value: "Added", label: "Added" },
    { value: "Edited", label: "Edited" },
    { value: "Deleted", label: "Deleted" },
    { value: "PolicySaved", label: "Policy Saved" },
    { value: "PasswordChanged", label: "Password Changed" },
    { value: "ReleaseAccount", label: "Release Account" },
];

const TABLE_OPTIONS = [
    { value: "ALL", label: "All Tables" },
    { value: "users", label: "Users" },
    { value: "HS_SEC", label: "Password Policy" },
];

/* =========================================================
   MAIN PAGE COMPONENT
========================================================= */
const SecurityAuditTrail = () => {
    const { currentUserRow } = useAuth();
    const queryClient = useQueryClient();

    const tableRef = useRef(null);
    const tableStateRef = useRef({});

    const [selectedRowCompare, setSelectedRowCompare] = useState(null);

    // Mobile result view
    const [isMobile, setIsMobile] = useState(false);
    const [mobileView, setMobileView] = useState("card");

    const initialFilter = useMemo(
        () => ({
            tblCode: "ALL",
            activity: "ALL",
            refCode: "",
            refName: "",
            doneByCode: "",
            doneByName: "",
            startDate: ONE_MONTH_AGO,
            endDate: TODAY,
        }),
        []
    );

    const [filter, setFilter] = useState(initialFilter);
    const [searchFilter, setSearchFilter] = useState(initialFilter);
    const [hasSearched, setHasSearched] = useState(false);
    const [isManualSearch, setIsManualSearch] = useState(false);

    const [modals, setModals] = useState({
        targetUser: false,
        doneByUser: false,
    });

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // Column config
    const { data: cols, isLoading: isColsLoading } = useQuery({
        queryKey: ["secAuditCols"],
        queryFn: () => useSelectedHSColConfig("GetSecTrail"),
        staleTime: Infinity,
    });

    // Data fetch
    const { data, isFetching } = useQuery({
        queryKey: ["secAuditData", searchFilter],
        queryFn: async () => {
            const { data: res } = await apiClient.post("getSecTrail", {
                PARAMS: JSON.stringify(searchFilter),
            });

            // Handle both response shapes:
            // 1. Sproc wraps rows as a JSON string in a `result` column: [{ result: "[{...}]" }]
            // 2. Sproc returns plain rows directly: [{...}, {...}]
            let raw = res?.data;
            if (Array.isArray(raw) && raw.length > 0 && typeof raw[0]?.result === "string") {
                raw = JSON.parse(raw[0].result);
            }

            setIsManualSearch(false);
            return Array.isArray(raw) ? raw : [];
        },
        enabled: !!cols && hasSearched,
        keepPreviousData: true,
    });

    const handleSearch = () => {
        setIsManualSearch(true);
        setSearchFilter({ ...filter });
        setHasSearched(true);
    };

    const handleReset = () => {
        setFilter(initialFilter);
        setSearchFilter(initialFilter);
        setHasSearched(false);
        setIsManualSearch(false);
        queryClient.removeQueries({ queryKey: ["secAuditData"] });
    };

    const handleViewRow = (row) => setSelectedRowCompare(row);

    const formatLabel = (key) =>
        String(key || "")
            .replace(/([A-Z])/g, " $1")
            .replace(/_/g, " ")
            .replace(/^./, (s) => s.toUpperCase())
            .trim();

    const renderCardValue = (key, value) => {
        if (value === null || value === undefined || value === "") return "—";
        const text = String(value);
        if (["beforeVal", "afterVal"].includes(key))
            return text.length > 90 ? `${text.substring(0, 90)}...` : text;
        if (key === "activity") return <ActivityBadge activity={text} />;
        return text;
    };

    /* -------------------------------------------------------
       Card view (mobile)
    ------------------------------------------------------- */
    const CardView = ({ data = [] }) => {
        if (!data.length)
            return (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 text-center text-sm text-gray-500">
                    No records found.
                </div>
            );

        return (
            <div className="grid grid-cols-1 gap-4">
                {data.map((row, index) => {
                    const entries = Object.entries(row || {}).filter(
                        ([key]) => !["beforeVal", "afterVal"].includes(key)
                    );

                    return (
                        <div
                            key={row.trailId || index}
                            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden min-w-0"
                        >
                            {/* Card header */}
                            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between gap-3">
                                <div className="min-w-0 flex items-center gap-2">
                                    <ActivityBadge activity={row.activity} />
                                    <div className="min-w-0">
                                        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate">
                                            {row.refName || row.refCode || "Password Policy"}
                                        </h3>
                                        <p className="text-[11px] text-gray-500 truncate">
                                            {row.tblCode || "—"} · {row.doneBy || "—"}
                                        </p>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => handleViewRow(row)}
                                    className="ml-3 shrink-0 bg-blue-600 text-white px-3 h-8 rounded-md text-[11px] hover:bg-blue-700 transition-colors flex items-center gap-2"
                                >
                                    <FontAwesomeIcon icon={faEye} />
                                    <span>View</span>
                                </button>
                            </div>

                            {/* Card body */}
                            <div className="px-4">
                                <div className="grid grid-cols-1">
                                    {entries.slice(0, 8).map(([key, value]) => (
                                        <div
                                            key={key}
                                            className="grid grid-cols-[118px_minmax(0,1fr)] gap-2 items-start border-b border-gray-100 dark:border-gray-700 last:border-b-0 py-1.5 min-w-0"
                                        >
                                            <div className="text-[11px] text-gray-500 dark:text-gray-400 font-semibold shrink-0 leading-5">
                                                {formatLabel(key)}
                                            </div>
                                            <div className="text-[12px] text-gray-700 dark:text-gray-200 text-right min-w-0 whitespace-pre-wrap break-all overflow-hidden leading-5">
                                                {renderCardValue(key, value)}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {entries.length > 8 && (
                                    <div className="py-2 text-right">
                                        <button
                                            type="button"
                                            onClick={() => handleViewRow(row)}
                                            className="text-[11px] font-bold text-blue-600 hover:text-blue-700"
                                        >
                                            See More ({entries.length - 8})
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    /* -------------------------------------------------------
       Clear button
    ------------------------------------------------------- */
    const ClearButton = ({ onClear }) => (
        <button
            onClick={(e) => {
                e.stopPropagation();
                onClear();
            }}
            className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 z-10 p-1"
        >
            <FontAwesomeIcon icon={faTimes} className="text-[10px]" />
        </button>
    );

    /* -------------------------------------------------------
       Render
    ------------------------------------------------------- */
    return (
        <div className="global-ref-main-div-ui relative min-h-screen flex flex-col">

            {/* Comparison modal */}
            <ComparisonModal
                data={selectedRowCompare}
                onClose={() => setSelectedRowCompare(null)}
            />

            {/* Loading overlay */}
            {isManualSearch && isFetching && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/40 backdrop-blur-[1px]">
                    <div className="flex flex-col items-center gap-2">
                        <LoadingSpinner />
                        <span className="text-blue-600 font-semibold text-sm">
                            Fetching Security Audit Data...
                        </span>
                    </div>
                </div>
            )}

            {/* Target user lookup */}
            <UsersLookupModal
                isOpen={modals.targetUser}
                onClose={(v) => {
                    setModals((p) => ({ ...p, targetUser: false }));
                    if (v)
                        setFilter((p) => ({
                            ...p,
                            refCode: v.userCode,
                            refName: v.userName,
                        }));
                }}
            />

            {/* Done-by user lookup */}
            <UsersLookupModal
                isOpen={modals.doneByUser}
                onClose={(v) => {
                    setModals((p) => ({ ...p, doneByUser: false }));
                    if (v)
                        setFilter((p) => ({
                            ...p,
                            doneByCode: v.userCode,
                            doneByName: v.userName,
                        }));
                }}
            />

            {/* ── Page header ───────────────────────────────────── */}
            <div className="global-ref-header-ui flex-none">
                <div className="w-full flex flex-col gap-3 md:grid md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                    <div className="min-w-0 flex items-center gap-3">
                        <h1 className="global-ref-headertext-ui truncate">
                            Security Audit Trail
                        </h1>
                    </div>

                    <div className="flex justify-center md:justify-end gap-2">
                        <ButtonBar
                            buttons={[
                                {
                                    key: "search",
                                    label: <span className="hidden sm:inline ml-2">Find</span>,
                                    icon: faSearch,
                                    onClick: handleSearch,
                                    className:
                                        "bg-blue-600 text-white w-8 sm:w-auto px-0 sm:px-4 h-8 rounded-md text-[11px] flex items-center justify-center",
                                },
                                {
                                    key: "reset",
                                    label: <span className="hidden sm:inline ml-2">Reset</span>,
                                    icon: faUndo,
                                    onClick: handleReset,
                                    className:
                                        "bg-blue-600 text-white w-8 sm:w-auto px-0 sm:px-4 h-8 rounded-md text-[11px] flex items-center justify-center",
                                },
                            ]}
                        />
                    </div>
                </div>
            </div>

            {/* ── Filter panel ──────────────────────────────────── */}
            <div className="flex-none mt-44 sm:mt-24 bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-100 shadow-sm mx-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">

                    {/* Table */}
                    <FieldRenderer
                        label="Table"
                        type="select"
                        value={filter.tblCode}
                        options={TABLE_OPTIONS}
                        onChange={(v) => setFilter((p) => ({ ...p, tblCode: v }))}
                    />

                    {/* Activity */}
                    <FieldRenderer
                        label="Activity"
                        type="select"
                        value={filter.activity}
                        options={ACTIVITY_OPTIONS}
                        onChange={(v) => setFilter((p) => ({ ...p, activity: v }))}
                    />

                    {/* Target user */}
                    <div className="relative">
                        <FieldRenderer
                            label="Target User"
                            type="lookup"
                            value={filter.refName || filter.refCode}
                            onLookup={() => setModals((p) => ({ ...p, targetUser: true }))}
                        />
                        {(filter.refCode || filter.refName) && (
                            <ClearButton
                                onClear={() =>
                                    setFilter((p) => ({ ...p, refCode: "", refName: "" }))
                                }
                            />
                        )}
                    </div>

                    {/* Done by */}
                    <div className="relative">
                        <FieldRenderer
                            label="Performed By"
                            type="lookup"
                            value={filter.doneByName || filter.doneByCode}
                            onLookup={() => setModals((p) => ({ ...p, doneByUser: true }))}
                        />
                        {(filter.doneByCode || filter.doneByName) && (
                            <ClearButton
                                onClear={() =>
                                    setFilter((p) => ({ ...p, doneByCode: "", doneByName: "" }))
                                }
                            />
                        )}
                    </div>

                    {/* Start date */}
                    <FieldRenderer
                        label="Starting Date"
                        type="date"
                        value={filter.startDate}
                        onChange={(v) => setFilter((p) => ({ ...p, startDate: v }))}
                    />

                    {/* End date */}
                    <FieldRenderer
                        label="Ending Date"
                        type="date"
                        value={filter.endDate}
                        onChange={(v) => setFilter((p) => ({ ...p, endDate: v }))}
                    />
                </div>
            </div>

            {/* ── Mobile view toggle ────────────────────────────── */}
            {isMobile && (
                <div className="mt-4 px-4 flex justify-end">
                    <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-800 shadow-sm">
                        <button
                            type="button"
                            onClick={() => setMobileView("card")}
                            className={`px-3 h-9 text-[11px] font-semibold flex items-center gap-2 ${mobileView === "card"
                                    ? "bg-blue-600 text-white"
                                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                }`}
                        >
                            <FontAwesomeIcon icon={faThLarge} />
                            Card
                        </button>
                        <button
                            type="button"
                            onClick={() => setMobileView("table")}
                            className={`px-3 h-9 text-[11px] font-semibold flex items-center gap-2 ${mobileView === "table"
                                    ? "bg-blue-600 text-white"
                                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                }`}
                        >
                            <FontAwesomeIcon icon={faTable} />
                            Table
                        </button>
                    </div>
                </div>
            )}

            {/* ── Results table / card ──────────────────────────── */}
            <div className="global-tran-table-main-div-ui mt-4 p-4">
                {isMobile && mobileView === "card" ? (
                    <CardView data={data || []} />
                ) : (
                    <div className="relative overflow-x-auto overflow-y-visible">
                        <SearchGlobalReportTable
                            ref={tableRef}
                            loading={isColsLoading || (isFetching && isManualSearch)}
                            columns={cols}
                            data={data || []}
                            itemsPerPage={50}
                            showFilters
                            rightActionLabel="View"
                            onRowAction={handleViewRow}
                            onStateChange={(tbl) => {
                                tableStateRef.current = tbl;
                            }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default SecurityAuditTrail;