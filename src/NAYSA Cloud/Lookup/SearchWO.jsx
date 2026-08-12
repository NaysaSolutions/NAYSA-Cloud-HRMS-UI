import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass, faClipboardCheck } from "@fortawesome/free-solid-svg-icons";

import { fetchDataJson } from "../Configuration/BaseURL.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

const getValue = (row, ...keys) => {
    if (!row || typeof row !== "object") return "";

    for (const key of keys) {
        const value = row[key];
        if (value !== undefined && value !== null && value !== "") return value;
    }

    const normalized = Object.entries(row).reduce((acc, [key, value]) => {
        acc[String(key).replace(/[_\s-]/g, "").toLowerCase()] = value;
        return acc;
    }, {});

    for (const key of keys) {
        const value = normalized[String(key).replace(/[_\s-]/g, "").toLowerCase()];
        if (value !== undefined && value !== null && value !== "") return value;
    }

    return "";
};

const unwrapResult = (value) => {
    if (value?.data?.data) return unwrapResult(value.data.data);
    if (value?.data) return unwrapResult(value.data);
    if (Array.isArray(value) && value[0]?.result !== undefined) return unwrapResult(value[0].result);
    if (value?.result !== undefined) return unwrapResult(value.result);

    if (typeof value === "string") {
        try {
            return JSON.parse(value);
        } catch {
            return [];
        }
    }

    return value;
};

const toRows = (response) => {
    const parsed = unwrapResult(response);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === "object") return [parsed];
    return [];
};

/**
 * Reusable Work Order lookup.
 *
 * Default behavior is still FGPR:
 *   <SearchWO ... />
 *
 * For RMPR:
 *   <SearchWO
 *      ...
 *      endpoint="getRMPRWO"
 *      docType="RMPR"
 *      moduleLabel="RMPR"
 *   />
 */
const SearchWO = ({
    isOpen,
    onClose,
    onCancel,
    onSelect,
    branchCode = "",
    whouseCode = "",
    locCode = "",

    // Reusable settings
    endpoint = "getFGPRWO",
    docType = "FGPR",
    moduleLabel = "",
    title = "Search Work Order",
    subtitle = "Closed Work Orders only · WO_STATUS = C and Remaining Qty > 0",
    noRecordMessage = "",
    tipMessage = "",
}) => {
    const [filter, setFilter] = useState("");
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);

    const label = moduleLabel || docType || "transaction";

    const loadRows = async (searchText = filter) => {
        if (!isOpen) return;

        setLoading(true);

        try {
            const response = await fetchDataJson(endpoint, {
                branchCode,
                filter: searchText,
                whouseCode,
                locCode,
                docType,
            });

            setRows(toRows(response));
        } catch (error) {
            console.error("SearchWO lookup error:", error);
            Swal.fire({
                icon: "error",
                title: "WO Lookup Failed",
                text: error?.message || `Unable to load closed Work Orders for ${label}.`,
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            setFilter("");
            loadRows("");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, branchCode, whouseCode, locCode, endpoint, docType]);

    const filteredRows = useMemo(() => rows, [rows]);

    if (!isOpen) return null;

    const handleSelect = (row) => {
        if (!row) return;
        onSelect?.(row);
    };

    const handleClose = (event) => {
        event?.stopPropagation();
        (onCancel || onClose)?.();
    };

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-3 sm:px-4"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) handleClose(event);
            }}
        >
            <div className="flex max-h-[88vh] w-full max-w-[86rem] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl">
                {/* Header — mirrors GlobalCombinedLookup's TabHeader pattern */}
                <div className="flex w-full flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3 sm:px-5">
                    <div className="flex min-w-0 flex-col pl-1 sm:pl-2">
                        <div className="global-lookup-headertext-ui leading-tight">{title}</div>
                        <div className="mt-0.5 text-[10px] font-medium text-slate-400">
                            {subtitle}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="flex h-8 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-500 shadow-sm">
                            <FontAwesomeIcon icon={faClipboardCheck} className="text-[10px] text-blue-600" />
                            {filteredRows.length} record{filteredRows.length === 1 ? "" : "s"}
                        </span>
                        <button
                            type="button"
                            onClick={handleClose}
                            className="flex h-8 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-500 shadow-sm hover:bg-slate-50"
                        >
                            Close
                        </button>
                    </div>
                </div>

                {/* Search bar */}
                <div className="flex flex-col gap-2.5 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:px-5">
                    <div className="relative flex-1">
                        <FontAwesomeIcon
                            icon={faMagnifyingGlass}
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400"
                        />
                        <input
                            type="text"
                            className="h-9 w-full rounded-md border border-slate-200 bg-white pl-8 pr-3 text-[12px] text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100"
                            placeholder="Search WO No., Item Code, or Item Name"
                            value={filter}
                            onChange={(event) => setFilter(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                    event.preventDefault();
                                    loadRows(filter);
                                }
                            }}
                            autoFocus
                        />
                    </div>

                    <button
                        type="button"
                        className="flex h-9 items-center justify-center gap-2 rounded-md bg-blue-600 px-4 text-[11px] font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={() => loadRows(filter)}
                        disabled={loading}
                    >
                        <FontAwesomeIcon icon={faMagnifyingGlass} className="text-[10px]" />
                        {loading ? "Loading..." : "Search"}
                    </button>
                </div>

                {/* Table */}
                <div className="relative flex-1 overflow-auto">
                    <table className="w-full min-w-[980px] border-collapse text-[12px]">
                        <thead className="sticky top-0 z-10 bg-slate-50 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">
                            <tr>
                                <th className="border-b border-slate-200 px-4 py-2.5">WO No.</th>
                                <th className="border-b border-slate-200 px-4 py-2.5">WO Date</th>
                                <th className="border-b border-slate-200 px-4 py-2.5">Item Code</th>
                                <th className="border-b border-slate-200 px-4 py-2.5">Item Name</th>
                                <th className="border-b border-slate-200 px-4 py-2.5 text-right">WO Qty</th>
                                <th className="border-b border-slate-200 px-4 py-2.5 text-right">WOR Qty</th>
                                <th className="border-b border-slate-200 px-4 py-2.5 text-right">Remaining</th>
                                <th className="border-b border-slate-200 px-4 py-2.5 text-right">Unit Cost</th>
                                <th className="border-b border-slate-200 px-4 py-2.5">Status</th>
                            </tr>
                        </thead>

                        <tbody>
                            {filteredRows.map((row, index) => {
                                const woNo = getValue(row, "woNo", "WO_NO");
                                const woDate = String(getValue(row, "woDate", "WO_DATE") || "").slice(0, 10);
                                const itemCode = getValue(row, "itemCode", "ITEM_CODE");
                                const itemName = getValue(row, "itemName", "ITEM_NAME");
                                const woQty = Number(getValue(row, "woQty", "WO_QTY") || 0);
                                const worQty = Number(getValue(row, "worQty", "WOR_QTY") || 0);
                                const remainingQty = Number(getValue(row, "remainingQty", "REMAINING_QTY") || 0);
                                const unitCost = Number(getValue(row, "woUnitCost", "unitCost", "WO_UNITCOST") || 0);
                                const status = getValue(row, "woStatus", "WO_STATUS");

                                return (
                                    <tr
                                        key={`${woNo}-${index}`}
                                        className="cursor-pointer border-b border-slate-100 hover:bg-blue-50/60"
                                        onClick={() => handleSelect(row)}
                                        onDoubleClick={() => handleSelect(row)}
                                    >
                                        <td className="px-4 py-2.5 font-semibold text-blue-700">{woNo}</td>
                                        <td className="px-4 py-2.5 text-slate-600">{woDate}</td>
                                        <td className="px-4 py-2.5 text-slate-600">{itemCode}</td>
                                        <td className="px-4 py-2.5 text-slate-600">{itemName}</td>
                                        <td className="px-4 py-2.5 text-right text-slate-600">{woQty.toLocaleString()}</td>
                                        <td className="px-4 py-2.5 text-right text-slate-600">{worQty.toLocaleString()}</td>
                                        <td className="px-4 py-2.5 text-right font-semibold text-slate-700">{remainingQty.toLocaleString()}</td>
                                        <td className="px-4 py-2.5 text-right text-slate-600">
                                            {unitCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-100">
                                                {status || "C"}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}

                            {!loading && filteredRows.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="px-4 py-10 text-center text-[12px] text-slate-400">
                                        {noRecordMessage || `No closed Work Order available for ${label}.`}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {loading && (
                        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/60">
                            <LoadingSpinner />
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-slate-100 px-4 py-2.5 text-[10px] font-medium text-slate-400 sm:px-5">
                    {tipMessage || `Tip: click a row to load the Work Order into ${label}.`}
                </div>
            </div>
        </div>
    );
};

export default SearchWO;
