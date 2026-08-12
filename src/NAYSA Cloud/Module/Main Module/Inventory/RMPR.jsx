import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faMagnifyingGlass,
    faPlus,
    faMinus,
    faBoxesStacked,
} from "@fortawesome/free-solid-svg-icons";

import Header from "@/NAYSA Cloud/Components/Header";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { useReset } from "../../../Components/ResetContext.jsx";

import BranchLookupModal from "../../../Lookup/SearchBranchRef";
import WarehouseLookupModal from "../../../Lookup/SearchWareMast.jsx";
import LocationLookupModal from "../../../Lookup/SearchLocation.jsx";
import ItemMastLookupModal from "../../../Lookup/SearchItemMast.jsx";
import QstatLookupModal from "../../../Lookup/SearchQStatRef.jsx";
import RCLookupModal from "../../../Lookup/SearchRCMast.jsx";
import COAMastLookupModal from "../../../Lookup/SearchCOAMast.jsx";
import SLMastLookupModal from "../../../Lookup/SearchSLMast.jsx";
import VATLookupModal from "../../../Lookup/SearchVATRef.jsx";
import ATCLookupModal from "../../../Lookup/SearchATCRef.jsx";
import CancelTranModal from "../../../Lookup/SearchCancelRef.jsx";
import PostTranModal from "../../../Lookup/SearchPostRef.jsx";
import AllTranDocNo from "../../../Lookup/SearchDocNo.jsx";
import AllTranHistory from "../../../Lookup/SearchGlobalTranHistory.jsx";
import WOLookupModal from "../../../Lookup/SearchWO.jsx";
import SearchStockCard from "@/NAYSA Cloud/Lookup/SearchStockCard.jsx";

import { fetchDataJson, postRequest } from "../../../Configuration/BaseURL.jsx";
import { useSelectedHSColConfig as getSelectedHSColConfig } from "@/NAYSA Cloud/Global/selectedData";
import {
    docTypeNames,
    docTypes,
    docTypePDFGuide,
    docTypeVideoGuide,
} from "@/NAYSA Cloud/Global/doctype";
import {
    useFetchTranData,
    useHandleCancel,
    useHandlePostTran,
    useGenerateGLEntries,
} from "@/NAYSA Cloud/Global/procedure";
import { useHandlePrint } from "@/NAYSA Cloud/Global/report";
import {
    formatNumber,
    parseFormattedNumber,
    useSwalshowSaveSuccessDialog,
    useSwalErrorAlert,
} from "@/NAYSA Cloud/Global/behavior.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import { useResizableTableColumns } from "@/NAYSA Cloud/Global/datatable.jsx";

const today = () => new Date().toISOString().split("T")[0];

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


const DOCUMENT_STATUS_LABELS = {
    F: "FINALIZED",
    X: "CANCELLED",
    Y: "CANCELLED",
    C: "CLOSED",
    P: "POSTED",
    O: "OPEN",
    R: "RELEASED",
    "": "OPEN",
};

const formatDocumentStatusLabel = (value) => {
    const text = String(value ?? "").trim();
    if (!text) return "OPEN";

    const upper = text.toUpperCase();
    return DOCUMENT_STATUS_LABELS[upper] || upper;
};

const applyHistoryStatusLabels = (root = document) => {
    if (typeof document === "undefined") return;

    const tables = Array.from(root.querySelectorAll("table"));

    tables.forEach((table) => {
        const headerRows = Array.from(table.querySelectorAll("thead tr"));
        const headerRow = headerRows.find((row) =>
            Array.from(row.children).some((cell) =>
                ["STATUS", "DOC STATUS", "DOCUMENT STATUS"].includes(
                    (cell.textContent || "").trim().toUpperCase()
                )
            )
        );

        if (!headerRow) return;

        const statusIndex = Array.from(headerRow.children).findIndex((cell) =>
            ["STATUS", "DOC STATUS", "DOCUMENT STATUS"].includes(
                (cell.textContent || "").trim().toUpperCase()
            )
        );

        if (statusIndex < 0) return;

        const bodyRows = Array.from(table.querySelectorAll("tbody tr"));

        bodyRows.forEach((row) => {
            const cells = Array.from(row.children);
            const statusCell = cells[statusIndex];

            if (!statusCell || statusCell.querySelector("input, select, textarea")) return;

            const currentText = (statusCell.textContent || "").trim();
            const nextText = formatDocumentStatusLabel(currentText);

            if (nextText && nextText !== currentText) {
                statusCell.textContent = nextText;
                statusCell.title = nextText;
            }
        });
    });
};


const toDateInput = (value) => {
    if (!value) return "";
    const text = String(value);
    if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);

    const date = new Date(text);
    if (Number.isNaN(date.getTime())) return "";

    return date.toISOString().slice(0, 10);
};

const amountValue = (value, decimal = 2) =>
    formatNumber(parseFormattedNumber(value || 0), decimal);

const amountRaw = (value) => parseFormattedNumber(value || 0) || 0;

const tryParseJson = (value) => {
    if (typeof value !== "string") return value;

    const trimmed = value.trim();
    if (!trimmed) return value;

    if (
        (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
        (trimmed.startsWith("[") && trimmed.endsWith("]"))
    ) {
        try {
            return JSON.parse(trimmed);
        } catch {
            return value;
        }
    }

    return value;
};

const flattenSprocResult = (value, output = []) => {
    const parsed = tryParseJson(value);

    if (Array.isArray(parsed)) {
        parsed.forEach((item) => flattenSprocResult(item, output));
        return output;
    }

    if (parsed && typeof parsed === "object") {
        output.push(parsed);

        [
            "data",
            "result",
            "RESULT",
            "JsonResult",
            "rows",
            "recordset",
            "recordsets",
        ].forEach((key) => {
            if (parsed[key] !== undefined && parsed[key] !== parsed) {
                flattenSprocResult(parsed[key], output);
            }
        });
    }

    return output;
};

const normalizeSprocValidationText = (message = "") => {
    const normalized = String(message || "")
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
            if (line.toLowerCase().includes("the following fields are required")) {
                return "The following fields are required :";
            }

            return line.replace(/^[-\s]+/, "- ");
        })
        .join("\n");

    return normalized || "Please complete required fields.";
};

const getSprocValidationMessage = (value) => {
    const rows = flattenSprocResult(value);

    const errorRow = rows.find((row) => {
        const errorCount = Number(getValue(row, "errorCount", "ERROR_COUNT", "error_count") || 0);
        const errorMsg = getValue(row, "errorMsg", "ERROR_MSG", "error_message", "message", "MESSAGE");

        return errorCount > 0 || Boolean(errorMsg);
    });

    return errorRow
        ? normalizeSprocValidationText(
            getValue(errorRow, "errorMsg", "ERROR_MSG", "error_message", "message", "MESSAGE")
        )
        : "";
};

const getSavedTranRow = (value) => {
    const rows = flattenSprocResult(value);

    return rows.find((row) =>
        Boolean(getValue(row, "rmprNo", "RMPR_NO", "docNo", "documentNo", "tranNo")) &&
        Boolean(getValue(row, "rmprHdId", "rmprId", "RMPR_ID", "docId", "documentID"))
    ) || null;
};

const showSprocValidationToast = (message) => {
    useSwalErrorAlert("Validation Failed", normalizeSprocValidationText(message));
};

const detailConfigKeyMap = {
    line_no: "lineNo",
    item_code: "itemCode",
    item_no: "itemCode",
    item_name: "itemName",
    item_desc: "itemName",
    categ_code: "categCode",
    uom_code: "uomCode",
    quantity: "quantity",
    unit_cost: "unitCost",
    item_amount: "itemAmount",
    amount: "itemAmount",
    lot_no: "lotNo",
    bb_date: "bbDate",
    qstat_code: "qstatCode",
    qs_code: "qstatCode",
    qty_hand: "qtyHand",
    whouse_code: "whouseCode",
    loc_code: "locCode",
    acct_code: "acctCode",
    rc_code: "rcCode",
    act_code: "rcCode",
    sltype_code: "sltypeCode",
    sl_code: "slCode",
    group_id: "groupId",
    tot_matl_cost: "totMatlCost",
    std_labor: "stdLabor",
    std_overhead: "stdOverhead",
    bom_factor: "bomFactor",
    stock_uom: "stockUom",
    uom_qty2: "uomQty2",
    gross_wt: "grossWt",
    core_wt: "coreWt",
    net_wt: "netWt",
    color_code: "colorCode",
    control_no: "controlNo",
};

const summaryConfigKeyMap = {
    line_no: "lineNo",
    rec_no: "lineNo",
    acct_code: "acctCode",
    rc_code: "rcCode",
    act_code: "rcCode",
    sltype_code: "sltypeCode",
    sl_code: "slCode",
    particular: "particular",
    vat_code: "vatCode",
    vat_desc: "vatDesc",
    atc_code: "atcCode",
    atc_desc: "atcDesc",
    ewt_code: "atcCode",
    ewt_desc: "atcDesc",
    debit: "debit",
    credit: "credit",
    debit_fx1: "debitFx1",
    credit_fx1: "creditFx1",
    debit_fx2: "debitFx2",
    credit_fx2: "creditFx2",
    slref_no: "slRefNo",
    slref_date: "slRefDate",
    dt1_lineno: "dt1Lineno",
    remarks: "remarks",
};

const fallbackDetailColumns = [
    { key: "lineNo", label: "LN", classNames: "text-left", renderType: "text", width: 80 },
    { key: "itemCode", label: "Item No", classNames: "text-left", renderType: "text", width: 130 },
    { key: "itemName", label: "Item Description", classNames: "text-left", renderType: "text", width: 220 },
    { key: "uomCode", label: "UOM", classNames: "text-left", renderType: "text", width: 90 },
    { key: "quantity", label: "Quantity", classNames: "text-right", renderType: "number", renderFormat: "2", width: 130 },
    { key: "unitCost", label: "Unit Cost", classNames: "text-right", renderType: "number", renderFormat: "6", width: 130 },
    { key: "itemAmount", label: "Amount", classNames: "text-right", renderType: "number", renderFormat: "6", width: 130 },
    { key: "lotNo", label: "Lot No", classNames: "text-left", renderType: "text", width: 130 },
    { key: "bbDate", label: "BB Date", classNames: "text-left", renderType: "date", renderFormat: "MM/DD/YYYY", width: 130 },
    { key: "qstatCode", label: "QC Status", classNames: "text-left", renderType: "text", width: 120 },
    { key: "rcCode", label: "RC Code", classNames: "text-left", renderType: "text", width: 120 },
    { key: "slCode", label: "SL Code", classNames: "text-left", renderType: "text", width: 120 },
    { key: "totMatlCost", label: "Direct Materials Cost", classNames: "text-right", renderType: "number", renderFormat: "6", width: 170 },
    { key: "stdLabor", label: "STD DLCost", classNames: "text-right", renderType: "number", renderFormat: "6", width: 130 },
    { key: "stdOverhead", label: "STD FOHCost", classNames: "text-right", renderType: "number", renderFormat: "6", width: 130 },
    { key: "whouseCode", label: "Warehouse", classNames: "text-left", renderType: "text", width: 130 },
    { key: "locCode", label: "Location", classNames: "text-left", renderType: "text", width: 130 },
];

const fallbackSummaryColumns = [
    { key: "lineNo", label: "LN", classNames: "text-left", renderType: "text", width: 80 },
    { key: "acctCode", label: "Acct Code", classNames: "text-left", renderType: "text", width: 130 },
    { key: "rcCode", label: "RC Code", classNames: "text-left", renderType: "text", width: 120 },
    { key: "slCode", label: "SL Code", classNames: "text-left", renderType: "text", width: 120 },
    { key: "particular", label: "Particular", classNames: "text-left", renderType: "text", width: 220 },
    { key: "vatCode", label: "VAT Code", classNames: "text-left", renderType: "text", width: 120 },
    { key: "vatDesc", label: "VAT Description", classNames: "text-left", renderType: "text", width: 180 },
    { key: "atcCode", label: "EWT Code", classNames: "text-left", renderType: "text", width: 120 },
    { key: "atcDesc", label: "EWT Description", classNames: "text-left", renderType: "text", width: 180 },
    { key: "debit", label: "Debit", classNames: "text-right", renderType: "number", renderFormat: "2", width: 130 },
    { key: "credit", label: "Credit", classNames: "text-right", renderType: "number", renderFormat: "2", width: 130 },
    { key: "slRefNo", label: "S/L Reference No.", classNames: "text-left", renderType: "text", width: 150 },
    { key: "remarks", label: "Remarks", classNames: "text-left", renderType: "text", width: 180 },
];

const normalizeConfigColumns = (configRows, keyMap) => {
    if (!Array.isArray(configRows) || configRows.length === 0) return [];

    return configRows
        .filter((row) => String(row.hidden ?? row.HIDDEN ?? "0") !== "1")
        .map((row) => {
            const rawKey = String(row.key ?? row.KEY ?? "");
            const uiKey = keyMap[rawKey] || keyMap[rawKey.toLowerCase()] || rawKey;

            return {
                key: uiKey,
                label: row.label ?? row.LABEL ?? rawKey,
                classNames: row.classNames ?? row.classnames ?? "text-left",
                renderType: row.renderType ?? row.RENDERTYPE ?? "text",
                renderFormat: row.renderFormat ?? row.RENDERFORMAT ?? null,
                width: Number(row.width ?? row.WIDTH) || 130,
            };
        })
        .filter((column) => Boolean(column.key));
};

const RMPR = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const loadedFromUrlRef = useRef(false);
    const saveInProgressRef = useRef(false);
    const { resetFlag } = useReset();
    const { user, companyInfo } = useAuth();

    const endpointDocType = docTypes?.RMPR || "RMPR";
    const docType = docTypes?.RMPR || "RMPR";
    const reportDocType = docType;
    const documentTitle = docTypeNames?.[docType] || "RM Production Receipt";
    const pdfLink = docTypePDFGuide?.[docType];
    const videoLink = docTypeVideoGuide?.[docType];

    const initialState = useMemo(
        () => ({
            topTab: "details",
            activeTab: "basic",
            isLoading: false,
            showSpinner: false,
            isDocNoDisabled: true,
            isFetchDisabled: true,
            isSaveDisabled: false,
            isResetDisabled: false,
            isViewDocument: false,

            documentID: "",
            documentNo: "",
            documentStatus: "",
            status: "OPEN",
            rmprDate: today(),
            cutoffCode: "",
            refNo: "",
            woNo: "",
            isOpenReferenceWO: false,
            particular: "",
            remarks: "",
            noReprints: "0",

            branchCode:
                user?.BRANCH_CODE || user?.branchCode || companyInfo?.branchCode || "HO",
            branchName:
                user?.BRANCH_NAME || user?.branchName || companyInfo?.branchName || "Head Office",
            WHCode: "",
            WHName: "",
            LocCode: "",
            LocName: "",
            userCode: user?.USER_CODE || user?.userCode || "NSI",

            detailRows: [],
            detailRowsGL: [],
            detailColumns: [],
            summaryColumns: [],

            selectedRowIndex: null,
            glRowIndex: null,
            lookupSource: "",
            selectedWH: "",

            showAllTranDocNo: false,
            branchModalOpen: false,
            warehouseLookupOpen: false,
            locationLookupOpen: false,
            itemLookupOpen: false,
            showQstatModal: false,
            showRCLookup: false,
            showCOALookup: false,
            showSLLookup: false,
            showVATLookup: false,
            showEWTLookup: false,
            showCancelModal: false,
            showPostModal: false,
            showWOLookup: false,
            showStockCard: false,
        }),
        [companyInfo?.branchCode, companyInfo?.branchName, user],
    );

    const [state, setState] = useState(initialState);
    const [showTypeDropdown, setShowTypeDropdown] = useState(false);
    const detailRowsRef = useRef([]);
    const summaryRowsRef = useRef([]);

    const updateState = useCallback((updates) => {
        setState((prev) => ({ ...prev, ...updates }));
    }, []);

    const displayStatus = useMemo(() => {
        const raw = String(state.documentStatus || state.status || "OPEN").trim().toUpperCase();
        const map = {
            "": "OPEN",
            O: "OPEN",
            OPEN: "OPEN",
            C: "CLOSED",
            CLOSED: "CLOSED",
            X: "CANCELLED",
            CANCELLED: "CANCELLED",
            CANCELED: "CANCELLED",
            F: "FINALIZED",
            FINALIZED: "FINALIZED",
            P: "POSTED",
            POSTED: "POSTED",
        };
        return map[raw] || raw || "OPEN";
    }, [state.documentStatus, state.status]);

    const statusColor = {
        FINALIZED: "global-tran-stat-text-finalized-ui",
        CANCELLED: "global-tran-stat-text-closed-ui",
        CLOSED: "global-tran-stat-text-closed-ui",
        POSTED: "global-tran-stat-text-finalized-ui",
    }[displayStatus] || "";

    const isFormDisabled =
        state.isViewDocument || ["FINALIZED", "CANCELLED", "CLOSED", "POSTED"].includes(displayStatus);

    const hasItemDetails = Array.isArray(state.detailRows) && state.detailRows.length > 0;

    const totals = useMemo(() => {
        const detailRows = state.detailRows || [];
        const summaryRows = state.detailRowsGL || [];

        return {
            quantity: formatNumber(
                detailRows.reduce((sum, row) => sum + amountRaw(row.quantity), 0),
                2,
            ),
            amount: formatNumber(
                detailRows.reduce((sum, row) => sum + amountRaw(row.itemAmount ?? row.amount), 0),
                2,
            ),
            debit: formatNumber(
                summaryRows.reduce((sum, row) => sum + amountRaw(row.debit), 0),
                2,
            ),
            credit: formatNumber(
                summaryRows.reduce((sum, row) => sum + amountRaw(row.credit), 0),
                2,
            ),
        };
    }, [state.detailRows, state.detailRowsGL]);

    const detailTableColumns = useMemo(() => state.detailColumns || [], [state.detailColumns]);
    const summaryTableColumns = useMemo(() => state.summaryColumns || [], [state.summaryColumns]);

    const {
        getColumnStyle: getDetailColumnStyle,
        getFrozenColumnStyle: getDetailFrozenStyle,
        getOrderedColumns: getOrderedDetailColumns,
        getSortedRows: getSortedDetailRows,
        renderHeaderContextMenu: renderDetailHeaderContextMenu,
        renderResizableHeader: renderDetailHeader,
    } = useResizableTableColumns(detailTableColumns);

    const orderedDetailColumns = getOrderedDetailColumns(detailTableColumns);

    const getDetailCellStyle = (key, fallbackWidth) => ({
        ...getDetailColumnStyle(key, fallbackWidth),
        ...getDetailFrozenStyle(key, orderedDetailColumns, fallbackWidth, {
            isHeader: false,
        }),
    });

    const sortedDetailRows = getSortedDetailRows(
        (state.detailRows || []).map((row, originalIndex) => ({ row, originalIndex })),
        (entry, sortKey) => entry.row?.[sortKey] ?? "",
    );

    const {
        getColumnStyle: getSummaryColumnStyle,
        getFrozenColumnStyle: getSummaryFrozenStyle,
        getOrderedColumns: getOrderedSummaryColumns,
        getSortedRows: getSortedSummaryRows,
        renderHeaderContextMenu: renderSummaryHeaderContextMenu,
        renderResizableHeader: renderSummaryHeader,
    } = useResizableTableColumns(summaryTableColumns);

    const orderedSummaryColumns = getOrderedSummaryColumns(summaryTableColumns);

    const getSummaryCellStyle = (key, fallbackWidth) => ({
        ...getSummaryColumnStyle(key, fallbackWidth),
        ...getSummaryFrozenStyle(key, orderedSummaryColumns, fallbackWidth, {
            isHeader: false,
        }),
    });

    const sortedSummaryRows = getSortedSummaryRows(
        (state.detailRowsGL || []).map((row, originalIndex) => ({ row, originalIndex })),
        (entry, sortKey) => entry.row?.[sortKey] ?? "",
    );

    useEffect(() => {
        detailRowsRef.current = state.detailRows || [];
    }, [state.detailRows]);

    useEffect(() => {
        summaryRowsRef.current = state.detailRowsGL || [];
    }, [state.detailRowsGL]);

    useEffect(() => {
        const p = new URLSearchParams(location.search);
        updateState({ isViewDocument: p.get("viewDocument") === "true" });
    }, [location.search, updateState]);

    useEffect(() => {
        let timer;
        if (state.isLoading) {
            timer = setTimeout(() => updateState({ showSpinner: true }), 200);
        } else {
            updateState({ showSpinner: false });
        }
        return () => clearTimeout(timer);
    }, [state.isLoading, updateState]);

    useEffect(() => {
        if (resetFlag) handleReset();
    }, [resetFlag]);

    useEffect(() => {
        loadColumnConfig();
    }, []);

    const loadColumnConfig = async () => {
        updateState({ isLoading: true });
        const userCode = user?.USER_CODE || user?.userCode || "";

        try {
            const [detailConfig, generalLedgerConfig] = await Promise.all([
                getSelectedHSColConfig("RMPR_Item_Detail", userCode, ""),
                getSelectedHSColConfig("RMPR_General_Ledger", userCode, ""),
            ]);

            // RMPR_Item_Detail is shared with Transaction History.
            // Hide history-only columns from Transaction Details > Item Details
            // without creating another HS_COLCONFIG endpoint.
            const transactionDetailHiddenKeys = new Set([
                "rmpr_id",
                "branch_code",
                "rmpr_no",
                "rmpr_date",
                "wo_no",
                "rmprId",
                "branchCode",
                "rmprNo",
                "rmprDate",
                "woNo",
            ]);

            const transactionDetailConfig = Array.isArray(detailConfig)
                ? detailConfig.filter((row) => {
                    const rawKey = String(row.key ?? row.KEY ?? "").trim();
                    return !transactionDetailHiddenKeys.has(rawKey) &&
                        !transactionDetailHiddenKeys.has(rawKey.toLowerCase());
                })
                : [];

            const summaryColumnOrder = [
                "lineNo", "acctCode", "rcCode", "slCode", "particular",
                "vatCode", "vatDesc", "atcCode", "atcDesc",
                "debit", "credit", "slRefNo", "slRefDate", "remarks",
            ];

            const normalizedDetailColumns = normalizeConfigColumns(transactionDetailConfig, detailConfigKeyMap);
            const rawSummaryColumns = normalizeConfigColumns(generalLedgerConfig, summaryConfigKeyMap);
            const sortedSummaryColumns = [...rawSummaryColumns].sort((a, b) => {
                const ai = summaryColumnOrder.indexOf(a.key);
                const bi = summaryColumnOrder.indexOf(b.key);
                return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
            });

            updateState({
                detailColumns: normalizedDetailColumns.length ? normalizedDetailColumns : fallbackDetailColumns,
                summaryColumns: sortedSummaryColumns.length ? sortedSummaryColumns : fallbackSummaryColumns,
            });
        } catch (error) {
            console.error("RMPR column config error:", error);

            // Prevent page from being stuck on LoadingSpinner when HS_COLCONFIG fails
            // or when a config endpoint has no rows yet.
            updateState({
                detailColumns: fallbackDetailColumns,
                summaryColumns: fallbackSummaryColumns,
            });
        } finally {
            updateState({ isLoading: false });
        }
    };

    const normalizeDetailRow = (row = {}, index = 0) => {
        const quantity = amountRaw(getValue(row, "quantity", "QUANTITY", "qty", "worQty", "WOR_QTY"));
        const unitCost = amountRaw(getValue(row, "unitCost", "unit_cost", "UNIT_COST"));
        const itemAmount = amountRaw(getValue(row, "itemAmount", "item_amount", "ITEM_AMOUNT", "amount", "AMOUNT")) || quantity * unitCost;

        return {
            id: getValue(row, "id", "ID", "groupId", "GROUP_ID") || `${Date.now()}-${index}`,
            lineNo: getValue(row, "lineNo", "line_no", "LINE_NO", "ln", "LN") || String(index + 1),
            itemCode: getValue(row, "itemCode", "item_code", "ITEM_CODE", "itemNo", "item_no", "ITEM_NO"),
            itemName: getValue(row, "itemName", "item_name", "ITEM_NAME", "itemDesc", "item_desc", "ITEM_DESC"),
            categCode: getValue(row, "categCode", "categ_code", "CATEG_CODE"),
            uomCode: getValue(row, "uomCode", "uom_code", "UOM_CODE"),
            quantity: amountValue(quantity, 2),
            unitCost: amountValue(unitCost, 6),
            itemAmount: amountValue(itemAmount, 6),
            amount: amountValue(itemAmount, 6),
            lotNo: getValue(row, "lotNo", "lot_no", "LOT_NO"),
            bbDate: toDateInput(getValue(row, "bbDate", "bb_date", "BB_DATE")),
            qstatCode: getValue(row, "qstatCode", "qstat_code", "QSTAT_CODE", "qsCode", "qs_code", "QS_CODE"),
            qtyHand: amountValue(getValue(row, "qtyHand", "qty_hand", "QTY_HAND"), 6),
            whouseCode: getValue(row, "whouseCode", "whouse_code", "WHOUSE_CODE", "WH_CODE", "whCode") || state.WHCode,
            locCode: getValue(row, "locCode", "loc_code", "LOC_CODE", "LocCode") || state.LocCode,
            acctCode: getValue(row, "acctCode", "acct_code", "ACCT_CODE"),
            rcCode: getValue(row, "rcCode", "rc_code", "RC_CODE", "actCode", "act_code", "ACT_CODE"),
            sltypeCode: getValue(row, "sltypeCode", "sltype_code", "SLTYPE_CODE"),
            slCode: getValue(row, "slCode", "sl_code", "SL_CODE"),
            groupId: getValue(row, "groupId", "group_id", "GROUP_ID"),
            totMatlCost: amountValue(getValue(row, "totMatlCost", "tot_matl_cost", "TOT_MATL_COST"), 6),
            stdLabor: amountValue(getValue(row, "stdLabor", "std_labor", "STD_LABOR"), 6),
            stdOverhead: amountValue(getValue(row, "stdOverhead", "std_overhead", "STD_OVERHEAD"), 6),
            bomFactor: amountValue(getValue(row, "bomFactor", "bom_factor", "BOM_FACTOR"), 6),
            stockUom: getValue(row, "stockUom", "stock_uom", "STOCK_UOM"),
            uomQty2: amountValue(getValue(row, "uomQty2", "uom_qty2", "UOM_QTY2"), 6),
            grossWt: amountValue(getValue(row, "grossWt", "gross_wt", "GROSS_WT"), 6),
            coreWt: amountValue(getValue(row, "coreWt", "core_wt", "CORE_WT"), 6),
            netWt: amountValue(getValue(row, "netWt", "net_wt", "NET_WT"), 6),
            colorCode: getValue(row, "colorCode", "color_code", "COLOR_CODE"),
            controlNo: getValue(row, "controlNo", "control_no", "CONTROL_NO"),
        };
    };

    const normalizeSummaryRow = (row = {}, index = 0) => {
        const atcCode = getValue(row, "atcCode", "atc_code", "ATC_CODE", "ewtCode", "ewt_code", "EWT_CODE");
        const atcDesc = getValue(row, "atcDesc", "atc_desc", "ATC_DESC", "ewtDesc", "ewt_desc", "EWT_DESC", "atcName", "atc_name", "ATC_NAME");

        return {
            id: getValue(row, "id", "ID") || `gl-${Date.now()}-${index}`,
            lineNo: getValue(row, "lineNo", "line_no", "LINE_NO", "recNo", "rec_no", "REC_NO") || String(index + 1),
            acctCode: getValue(row, "acctCode", "acct_code", "ACCT_CODE"),
            rcCode: getValue(row, "rcCode", "rc_code", "RC_CODE", "actCode", "act_code", "ACT_CODE"),
            sltypeCode: getValue(row, "sltypeCode", "sltype_code", "SLTYPE_CODE"),
            slCode: getValue(row, "slCode", "sl_code", "SL_CODE"),
            particular: getValue(row, "particular", "PARTICULAR"),
            vatCode: getValue(row, "vatCode", "vat_code", "VAT_CODE"),
            vatDesc: getValue(row, "vatDesc", "vat_desc", "VAT_DESC"),
            atcCode,
            atcDesc,
            ewtCode: atcCode,
            ewtDesc: atcDesc,
            debit: amountValue(getValue(row, "debit", "DEBIT"), 2),
            credit: amountValue(getValue(row, "credit", "CREDIT"), 2),
            debitFx1: amountValue(getValue(row, "debitFx1", "debit_fx1", "DEBIT_FX1"), 2),
            creditFx1: amountValue(getValue(row, "creditFx1", "credit_fx1", "CREDIT_FX1"), 2),
            debitFx2: amountValue(getValue(row, "debitFx2", "debit_fx2", "DEBIT_FX2"), 2),
            creditFx2: amountValue(getValue(row, "creditFx2", "credit_fx2", "CREDIT_FX2"), 2),
            slRefNo: getValue(row, "slRefNo", "slref_no", "SLREF_NO"),
            slRefDate: toDateInput(getValue(row, "slRefDate", "slref_date", "SLREF_DATE")),
            remarks: getValue(row, "remarks", "REMARKS"),
            dt1Lineno: getValue(row, "dt1Lineno", "dt1_lineno", "DT1_LINENO"),
        };
    };

    const mapDetailForSave = (row = {}, index = 0) => ({
        lineNo: String(index + 1),
        lnNo: String(index + 1),
        itemCode: row.itemCode || "",
        itemNo: row.itemCode || "",
        itemName: row.itemName || "",
        itemDesc: row.itemName || "",
        categCode: row.categCode || "",
        uomCode: row.uomCode || "",
        quantity: amountRaw(row.quantity),
        unitCost: amountRaw(row.unitCost),
        itemAmount: amountRaw(row.itemAmount ?? row.amount),
        amount: amountRaw(row.itemAmount ?? row.amount),
        lotNo: row.lotNo || "",
        bbDate: row.bbDate || null,
        qstatCode: row.qstatCode || "",
        qsCode: row.qstatCode || "",
        qtyHand: amountRaw(row.qtyHand),
        whouseCode: row.whouseCode || state.WHCode || "",
        locCode: row.locCode || state.LocCode || "",
        acctCode: row.acctCode || "",
        rcCode: row.rcCode || "",
        actCode: row.rcCode || "",
        sltypeCode: row.sltypeCode || "",
        slCode: row.slCode || "",
        groupId: row.groupId || "",
        totMatlCost: amountRaw(row.totMatlCost),
        stdLabor: amountRaw(row.stdLabor),
        stdOverhead: amountRaw(row.stdOverhead),
        bomFactor: amountRaw(row.bomFactor),
        stockUom: row.stockUom || row.uomCode || "",
        uomQty2: amountRaw(row.uomQty2),
        grossWt: amountRaw(row.grossWt),
        coreWt: amountRaw(row.coreWt),
        netWt: amountRaw(row.netWt),
        colorCode: row.colorCode || "",
        controlNo: row.controlNo || "",
    });

    const mapSummaryForSave = (row = {}, index = 0) => ({
        recNo: String(index + 1),
        lineNo: String(index + 1),
        acctCode: row.acctCode || "",
        rcCode: row.rcCode || "",
        actCode: row.rcCode || "",
        sltypeCode: row.sltypeCode || "",
        slCode: row.slCode || "",
        particular: row.particular || "",
        vatCode: row.vatCode || "",
        vatDesc: row.vatDesc || "",
        atcCode: row.atcCode || row.ewtCode || "",
        atcDesc: row.atcDesc || row.ewtDesc || "",
        ewtCode: row.atcCode || row.ewtCode || "",
        ewtDesc: row.atcDesc || row.ewtDesc || "",
        debit: amountRaw(row.debit),
        credit: amountRaw(row.credit),
        debitFx1: amountRaw(row.debitFx1),
        creditFx1: amountRaw(row.creditFx1),
        debitFx2: amountRaw(row.debitFx2),
        creditFx2: amountRaw(row.creditFx2),
        slRefNo: row.slRefNo || "",
        slRefDate: row.slRefDate || null,
        remarks: row.remarks || "",
        dt1Lineno: row.dt1Lineno || "",
    });

    const buildPayload = (summaryOverride = null) => ({
        branchCode: state.branchCode,
        rmprNo: state.documentNo || "",
        rmprId: state.documentID || "",
        rmprHdId: state.documentID || "",
        docNo: state.documentNo || "",
        docId: state.documentID || "",
        rmprDate: state.rmprDate || today(),
        cutoffCode: state.cutoffCode || "",
        refNo: state.refNo || "",
        woNo: state.woNo || "",
        whouseCode: state.WHCode || "",
        whCode: state.WHCode || "",
        locCode: state.LocCode || "",
        LocCode: state.LocCode || "",
        particular: state.particular || "",
        remarks: state.remarks || "",
        userCode: state.userCode || user?.USER_CODE || "",
        currCode: state.currCode || "PHP",
        currRate: amountRaw(state.currRate || 1) || 1,
        noReprints: state.noReprints || "0",
        dt1: (state.detailRows || []).map(mapDetailForSave),
        dt2: (summaryOverride || state.detailRowsGL || []).map(mapSummaryForSave),
    });

    const validateBeforeSave = () => {
        if (!state.branchCode) {
            Swal.fire({ icon: "warning", title: "Required", text: "Please select Branch." });
            return false;
        }
        if (!state.rmprDate) {
            Swal.fire({ icon: "warning", title: "Required", text: "Please select RMPR Date." });
            return false;
        }
        if (!state.WHCode) {
            Swal.fire({ icon: "warning", title: "Required", text: "Please select Warehouse." });
            return false;
        }
        if (!state.LocCode) {
            Swal.fire({ icon: "warning", title: "Required", text: "Please select Location." });
            return false;
        }
        if (!Array.isArray(state.detailRows) || state.detailRows.length === 0) {
            Swal.fire({ icon: "warning", title: "Required", text: "Please add at least one item detail." });
            return false;
        }

        const invalidRowIndex = state.detailRows.findIndex(
            (row) => !row.itemCode || amountRaw(row.quantity) <= 0,
        );
        if (invalidRowIndex >= 0) {
            Swal.fire({
                icon: "warning",
                title: "Invalid Detail",
                text: `Line ${invalidRowIndex + 1}: Item No. and Quantity are required.`,
            });
            return false;
        }

        return true;
    };

    const fetchTranData = async (docNo, branchCode = state.branchCode, direction = "") => {
        if (!docNo && !direction) return;
        updateState({ isLoading: true });

        try {
            const data = await useFetchTranData(docNo, branchCode, endpointDocType, "rmprNo", direction);
            const parsed = Array.isArray(data) ? data[0] : data;

            if (!parsed || (!parsed.rmprNo && !parsed.docNo && !parsed.RMPR_NO && !parsed.documentNo)) {
                Swal.fire({ icon: "info", title: "No Records Found", text: "Transaction does not exist." });
                return;
            }

            const dt1 = getValue(parsed, "dt1", "details", "dtl") || [];
            const dt2 = getValue(parsed, "dt2", "dtlb", "summary", "gl") || [];

            updateState({
                documentID: getValue(parsed, "rmprHdId", "rmprId", "RMPR_ID", "documentID", "docId"),
                documentNo: getValue(parsed, "rmprNo", "RMPR_NO", "docNo", "documentNo"),
                documentStatus: getValue(parsed, "rmprStatus", "rmpr_status", "RMPR_STATUS", "stat", "status", "STAT"),
                status: getValue(parsed, "rmprStatus", "rmpr_status", "RMPR_STATUS", "stat", "status", "STAT") || "OPEN",
                rmprDate: toDateInput(getValue(parsed, "rmprDate", "rmpr_date", "RMPR_DATE")) || today(),
                cutoffCode: getValue(parsed, "cutoffCode", "cutoff_code", "CUTOFF_CODE"),
                refNo: getValue(parsed, "refNo", "ref_no", "REF_NO"),
                woNo: getValue(parsed, "woNo", "wo_no", "WO_NO"),
                isOpenReferenceWO: Boolean(getValue(parsed, "woNo", "wo_no", "WO_NO")),
                branchCode: getValue(parsed, "branchCode", "branch_code", "BRANCH_CODE") || branchCode,
                branchName: getValue(parsed, "branchName", "branch_name", "BRANCH_NAME") || state.branchName,
                WHCode: getValue(parsed, "whouseCode", "whouse_code", "WHOUSE_CODE", "whCode", "WH_CODE"),
                WHName: getValue(parsed, "whouseName", "whouse_name", "WHOUSE_NAME", "whName", "WH_NAME"),
                LocCode: getValue(parsed, "locCode", "loc_code", "LOC_CODE", "LocCode"),
                LocName: getValue(parsed, "locName", "loc_name", "LOC_NAME", "LocName"),
                particular: getValue(parsed, "particular", "PARTICULAR"),
                remarks: getValue(parsed, "remarks", "REMARKS"),
                currCode: getValue(parsed, "currCode", "curr_code", "CURR_CODE") || "PHP",
                currRate: getValue(parsed, "currRate", "curr_rate", "CURR_RATE") || 1,
                noReprints: getValue(parsed, "noReprints", "no_reprints", "NO_REPRINTS") || "0",
                detailRows: Array.isArray(dt1) ? dt1.map(normalizeDetailRow) : [],
                detailRowsGL: Array.isArray(dt2) ? dt2.map(normalizeSummaryRow) : [],
                isDocNoDisabled: true,
                isFetchDisabled: true,
            });
        } catch (error) {
            console.error("RMPR fetch error:", error);
            Swal.fire({ icon: "error", title: "Fetch Failed", text: error?.message || "Unable to load RMPR." });
        } finally {
            updateState({ isLoading: false });
        }
    };

    const handleActivityOption = async (action) => {
        if (isFormDisabled && action !== "GenerateGL") return;
        if (saveInProgressRef.current) return;

        saveInProgressRef.current = true;
        updateState({ isLoading: true });

        try {
            if (action === "GenerateGL") {
                const entries = await useGenerateGLEntries(endpointDocType, buildPayload([]));
                const generateError = getSprocValidationMessage(entries);

                if (generateError) {
                    showSprocValidationToast(generateError);
                    return;
                }

                if (Array.isArray(entries)) {
                    updateState({ detailRowsGL: entries.map(normalizeSummaryRow) });
                }

                return;
            }

            /*
             * Save should NOT auto-generate GL.
             * The Upsert sproc is the source of validation truth.
             */
            const glRowsForSave = Array.isArray(state.detailRowsGL) ? state.detailRowsGL : [];
            const payload = buildPayload(glRowsForSave);

            /*
             * Use the RMPR controller directly so the sproc result is preserved:
             * response.data[0].errorMsg / response.data[0].errorCount
             */
            const result = await postRequest(
                "upsertRMPR",
                JSON.stringify({ json_data: payload }),
            );

            const upsertError = getSprocValidationMessage(result);

            if (upsertError) {
                showSprocValidationToast(upsertError);
                return;
            }

            const savedRow = getSavedTranRow(result);

            const savedNo = getValue(
                savedRow,
                "rmprNo",
                "RMPR_NO",
                "docNo",
                "documentNo",
                "tranNo",
            ) || state.documentNo;

            const savedId = getValue(
                savedRow,
                "rmprHdId",
                "rmprId",
                "RMPR_ID",
                "docId",
                "documentID",
            ) || state.documentID;

            updateState({
                documentNo: savedNo,
                documentID: savedId,
                isDocNoDisabled: true,
                isFetchDisabled: true,
            });

            useSwalshowSaveSuccessDialog(
                () => {
                    handleReset();
                    updateState({ topTab: "history" });
                },
                () => handleSaveAndPrint(savedId),
            );
        } catch (error) {
            console.error("RMPR save error:", error);

            const sprocMessage =
                error?.response?.data?.errorMsg ||
                error?.response?.data?.message ||
                error?.response?.data?.details ||
                error?.response?.data?.error ||
                error?.data?.errorMsg ||
                error?.errorMsg ||
                error?.message ||
                "Something went wrong during save.";

            showSprocValidationToast(sprocMessage);
        } finally {
            saveInProgressRef.current = false;
            updateState({ isLoading: false });
        }
    };

    const handleSaveAndPrint = async (docId = state.documentID) => {
        if (!docId) return;
        updateState({ showSpinner: true });
        await useHandlePrint(docId, reportDocType);
        updateState({ showSpinner: false });
    };

    const handlePrint = async () => {
        if (!state.documentID) return;
        await handleSaveAndPrint(state.documentID);
    };

    const handlePost = () => {
        if (!state.documentID) return;
        updateState({ showPostModal: true });
    };

    const handleCancel = () => {
        if (!state.documentID) return;
        updateState({ showCancelModal: true });
    };

    const handleClosePost = async (confirmation) => {
        if (!confirmation || !state.documentID) {
            updateState({ showPostModal: false });
            return;
        }

        await useHandlePostTran(
            [state.documentID],
            confirmation.password,
            endpointDocType,
            state.userCode || user?.USER_CODE || "NSI",
            (loading) => updateState({ isLoading: loading }),
            () => updateState({ showPostModal: false }),
        );

        await fetchTranData(state.documentNo, state.branchCode);
    };

    const handleCloseCancel = async (confirmation) => {
        if (!confirmation || !state.documentID) {
            updateState({ showCancelModal: false });
            return;
        }

        const result = await useHandleCancel(
            endpointDocType,
            state.documentID,
            state.userCode || user?.USER_CODE || "NSI",
            confirmation.password,
            confirmation.reason,
            updateState,
        );

        if (result?.success) await fetchTranData(state.documentNo, state.branchCode);
        updateState({ showCancelModal: false });
    };

    const handleReset = () => {
        setShowTypeDropdown(false);
        setState((prev) => ({
            ...initialState,
            detailColumns: prev.detailColumns || [],
            summaryColumns: prev.summaryColumns || [],
            topTab: prev.topTab === "history" ? "history" : "details",

            // Keep Stock Card mounted when transaction retrieval/reset reloads the page data.
            // This prevents the Stock Card inquiry from losing its already-loaded results.
            showStockCard: prev.showStockCard,
        }));
    };

    const handleCopy = () => {
        updateState({ documentID: "", documentNo: "", documentStatus: "", status: "OPEN" });
    };

    const handleAttach = () => {
        Swal.fire({ icon: "info", title: "Attachment", text: "Attach document modal can be connected here if needed." });
    };

    const handleDocNoBlur = () => {
        if (state.documentNo) fetchTranData(state.documentNo, state.branchCode);
    };

    const addDetailRow = (index = null) => {
        if (isFormDisabled || state.isOpenReferenceWO) return;
        const next = normalizeDetailRow(
            {
                whouseCode: state.WHCode,
                locCode: state.LocCode,
                quantity: 0,
                unitCost: 0,
                amount: 0,
            },
            state.detailRows.length,
        );

        const rows = [...state.detailRows];
        if (index === null || index === undefined) rows.push(next);
        else rows.splice(index + 1, 0, next);

        updateState({ detailRows: rows.map((row, i) => ({ ...row, lineNo: String(i + 1) })) });
    };

    const handleAddRowClick = () => {
        if (isFormDisabled || state.isOpenReferenceWO) return;
        setShowTypeDropdown((prev) => !prev);
    };

    const handleOpenRMLookup = () => {
        if (isFormDisabled || state.isOpenReferenceWO) return;
        setShowTypeDropdown(false);
        updateState({
            itemLookupOpen: true,
            selectedRowIndex: null,
            lookupSource: "detailItem",
        });
    };

    const handleOpenWOReferenceLookup = () => {
        if (isFormDisabled || hasItemDetails) return;

        if (!state.branchCode) {
            Swal.fire({
                icon: "info",
                title: "Branch Required",
                text: "Please select a branch first before opening Reference WO.",
            });
            return;
        }

        setShowTypeDropdown(false);
        updateState({ showWOLookup: true });
    };

    const deleteDetailRow = (index) => {
        if (isFormDisabled) return;
        const rows = state.detailRows.filter((_, i) => i !== index)
            .map((row, i) => ({ ...row, lineNo: String(i + 1) }));
        updateState({ detailRows: rows });
    };

    const addSummaryRow = (index = null) => {
        if (isFormDisabled) return;
        const next = normalizeSummaryRow({ particular: state.particular }, state.detailRowsGL.length);
        const rows = [...state.detailRowsGL];
        if (index === null || index === undefined) rows.push(next);
        else rows.splice(index + 1, 0, next);
        updateState({ detailRowsGL: rows.map((row, i) => ({ ...row, lineNo: String(i + 1) })) });
    };

    const deleteSummaryRow = (index) => {
        if (isFormDisabled) return;
        const rows = state.detailRowsGL.filter((_, i) => i !== index)
            .map((row, i) => ({ ...row, lineNo: String(i + 1) }));
        updateState({ detailRowsGL: rows });
    };

    const updateDetailRow = (index, field, value, extra = {}) => {
        if (["itemAmount", "amount"].includes(field)) return;

        const rows = [...state.detailRows];
        const row = { ...rows[index], [field]: value, ...extra };

        if (["quantity", "unitCost"].includes(field)) {
            const amount = amountRaw(row.quantity) * amountRaw(row.unitCost);
            row.itemAmount = amountValue(amount, 6);
            row.amount = row.itemAmount;
            row.totMatlCost = row.totMatlCost || row.itemAmount;
        }


        rows[index] = row;
        updateState({ detailRows: rows });
    };

    const updateSummaryRow = (index, field, value, extra = {}) => {
        const rows = [...state.detailRowsGL];
        rows[index] = { ...rows[index], [field]: value, ...extra };
        updateState({ detailRowsGL: rows });
    };

    const applyHeaderWarehouseToDetails = async (whCode, whName) => {
        updateState({ WHCode: whCode, WHName: whName, LocCode: "", LocName: "" });

        if (!state.detailRows.length) return;
        const result = await Swal.fire({
            icon: "question",
            title: "Apply to Details?",
            text: "Do you want to apply this Warehouse to all item details?",
            showCancelButton: true,
            confirmButtonText: "Yes, update all",
            cancelButtonText: "Header only",
        });

        if (result.isConfirmed) {
            updateState({
                detailRows: state.detailRows.map((row) => ({
                    ...row,
                    whouseCode: whCode,
                    whouseName: whName,
                    locCode: "",
                })),
            });
        }
    };

    const applyHeaderLocationToDetails = async (locCode, locName) => {
        updateState({ LocCode: locCode, LocName: locName });

        if (!state.detailRows.length) return;
        const result = await Swal.fire({
            icon: "question",
            title: "Apply to Details?",
            text: "Do you want to apply this Location to all item details?",
            showCancelButton: true,
            confirmButtonText: "Yes, update all",
            cancelButtonText: "Header only",
        });

        if (result.isConfirmed) {
            updateState({
                detailRows: state.detailRows.map((row) => ({ ...row, locCode, locName })),
            });
        }
    };

    const handleCloseBranchModal = (row) => {
        if (row) {
            updateState({
                branchCode: getValue(row, "branchCode", "BRANCH_CODE"),
                branchName: getValue(row, "branchName", "BRANCH_NAME"),
            });
        }
        updateState({ branchModalOpen: false });
    };

    const handleCloseWarehouseLookup = (row) => {
        if (row) {
            const whCode = getValue(row, "whCode", "WHCode", "WH_CODE", "whouseCode", "WHOUSE_CODE");
            const whName = getValue(row, "whName", "WHName", "WH_NAME", "whouseName", "WHOUSE_NAME");

            if (state.lookupSource === "detailWh" && state.selectedRowIndex !== null) {
                updateDetailRow(state.selectedRowIndex, "whouseCode", whCode, {
                    whouseName: whName,
                    locCode: "",
                });
            } else {
                applyHeaderWarehouseToDetails(whCode, whName);
            }
        }
        updateState({ warehouseLookupOpen: false, lookupSource: "", selectedRowIndex: null });
    };

    const handleCloseLocationLookup = (row) => {
        if (row) {
            const locCode = getValue(row, "locCode", "LocCode", "LOC_CODE");
            const locName = getValue(row, "locName", "LocName", "LOC_NAME");

            if (state.lookupSource === "detailLoc" && state.selectedRowIndex !== null) {
                updateDetailRow(state.selectedRowIndex, "locCode", locCode, { locName });
            } else {
                applyHeaderLocationToDetails(locCode, locName);
            }
        }
        updateState({ locationLookupOpen: false, lookupSource: "", selectedRowIndex: null, selectedWH: "" });
    };

    const handleCloseItemLookup = (payload) => {
        if (!payload) {
            updateState({ itemLookupOpen: false, selectedRowIndex: null });
            return;
        }

        const selectedItems = Array.isArray(payload?.records)
            ? payload.records
            : Array.isArray(payload)
                ? payload
                : [payload];

        const rows = [...state.detailRows];
        const startIndex = state.selectedRowIndex ?? rows.length;

        selectedItems.forEach((item, offset) => {
            const targetIndex = startIndex + offset;
            const normalized = normalizeDetailRow(
                {
                    ...item,
                    itemCode: getValue(item, "itemCode", "ITEM_CODE", "itemNo", "ITEM_NO"),
                    itemName: getValue(item, "itemName", "ITEM_NAME", "itemDesc", "ITEM_DESC", "rmName", "RM_NAME", "rmDesc", "RM_DESC"),
                    categCode: getValue(item, "categCode", "CATEG_CODE"),
                    uomCode: getValue(item, "uomCode", "UOM_CODE", "uom", "UOM"),
                    acctCode: getValue(item, "acctCode", "ACCT_CODE", "invacctCode", "INVACCT_CODE"),
                    whouseCode: state.WHCode,
                    locCode: state.LocCode,
                    quantity: getValue(item, "quantity", "qty") || 0,
                    unitCost: getValue(item, "unitCost", "UNIT_COST", "unitPrice", "UNIT_PRICE", "stdCost", "STD_COST", "aveCost", "AVE_COST", "avgCost", "AVG_COST", "lastCost", "LAST_COST") || 0,
                    qtyHand: getValue(item, "qtyHand", "QTY_HAND", "qtyOnHand", "QTY_ON_HAND") || 0,
                },
                targetIndex,
            );

            if (rows[targetIndex]) rows[targetIndex] = { ...rows[targetIndex], ...normalized };
            else rows.push(normalized);
        });

        updateState({
            detailRows: rows.map((row, index) => ({ ...row, lineNo: String(index + 1) })),
            itemLookupOpen: false,
            selectedRowIndex: null,
        });
    };

    const handleCloseQStatLookup = (row) => {
        if (row && state.selectedRowIndex !== null) {
            updateDetailRow(state.selectedRowIndex, "qstatCode", getValue(row, "qstatCode", "QSTAT_CODE"));
        }
        updateState({ showQstatModal: false, selectedRowIndex: null });
    };

    const handleCloseRCModal = (row) => {
        if (row) {
            const rcCode = getValue(row, "rcCode", "RC_CODE", "actCode", "ACT_CODE");
            const rcName = getValue(row, "rcName", "RC_NAME", "actName", "ACT_NAME");

            if (state.lookupSource === "detailRc" && state.selectedRowIndex !== null) {
                updateDetailRow(state.selectedRowIndex, "rcCode", rcCode, { rcName });
            } else if (state.lookupSource === "summaryRc" && state.glRowIndex !== null) {
                updateSummaryRow(state.glRowIndex, "rcCode", rcCode, { rcName });
            }
        }

        updateState({ showRCLookup: false, lookupSource: "", selectedRowIndex: null, glRowIndex: null });
    };

    const handleCloseCOALookup = (row) => {
        if (row && state.glRowIndex !== null) {
            updateSummaryRow(state.glRowIndex, "acctCode", getValue(row, "acctCode", "ACCT_CODE"), {
                acctName: getValue(row, "acctName", "ACCT_NAME"),
            });
        }
        updateState({ showCOALookup: false, glRowIndex: null });
    };

    const handleCloseSLLookup = (row) => {
        if (row) {
            const slCode = getValue(row, "slCode", "SL_CODE");
            const slName = getValue(row, "slName", "SL_NAME");

            if (state.lookupSource === "detailSl" && state.selectedRowIndex !== null) {
                updateDetailRow(state.selectedRowIndex, "slCode", slCode, { slName });
            } else if (state.lookupSource === "summarySl" && state.glRowIndex !== null) {
                updateSummaryRow(state.glRowIndex, "slCode", slCode, { slName });
            }
        }
        updateState({ showSLLookup: false, lookupSource: "", selectedRowIndex: null, glRowIndex: null });
    };

    const handleCloseVATLookup = (row) => {
        if (row && state.glRowIndex !== null) {
            updateSummaryRow(state.glRowIndex, "vatCode", getValue(row, "vatCode", "VAT_CODE"), {
                vatDesc: getValue(row, "vatDesc", "VAT_DESC", "vatName", "VAT_NAME"),
            });
        }
        updateState({ showVATLookup: false, glRowIndex: null });
    };

    const handleCloseEWTLookup = (row) => {
        if (row && state.glRowIndex !== null) {
            const atcCode = getValue(row, "atcCode", "ATC_CODE", "ewtCode", "EWT_CODE");
            const atcDesc = getValue(row, "atcName", "ATC_NAME", "atcDesc", "ATC_DESC", "ewtDesc", "EWT_DESC");
            updateSummaryRow(state.glRowIndex, "atcCode", atcCode, {
                atcDesc,
                ewtCode: atcCode,
                ewtDesc: atcDesc,
            });
        }
        updateState({ showEWTLookup: false, glRowIndex: null });
    };

    const openAllTranDocNoLookup = useCallback((event) => {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        updateState({ showAllTranDocNo: true });
    }, [updateState]);

    useEffect(() => {
        const handleF1Key = (event) => {
            if (event.key === "F1" || event.keyCode === 112) {
                openAllTranDocNoLookup(event);
            }
        };

        window.addEventListener("keydown", handleF1Key);

        return () => {
            window.removeEventListener("keydown", handleF1Key);
        };
    }, [openAllTranDocNoLookup]);

    const handleTranDocNoRetrieval = async (data) => {
        await fetchTranData(data.docNo, data.branchCode || state.branchCode, data.key || "");
        updateState({ showAllTranDocNo: data.modalClose });
    };

    const handleTranDocNoSelection = async (data) => {
        const docNo = getValue(data, "docNo", "rmprNo", "rmpr_no", "RMPR_NO", "documentNo");
        const branchCode = getValue(data, "branchCode", "branch_code", "BRANCH_CODE") || state.branchCode;

        handleReset();
        updateState({
            showAllTranDocNo: false,
            documentNo: docNo,
            branchCode,
        });

        if (docNo) {
            await fetchTranData(docNo, branchCode);
        }
    };

    const handleHistoryRowPick = useCallback(async (row = {}) => {
        const docNo = getValue(
            row,
            "docNo",
            "rmprNo",
            "rmpr_no",
            "RMPR_NO",
            "documentNo",
            "DOCUMENT_NO",
        );
        const branchCode =
            getValue(row, "branchCode", "branch_code", "BRANCH_CODE") ||
            state.branchCode;

        if (!docNo || !branchCode) return;

        await fetchTranData(docNo, branchCode);
        updateState({
            topTab: "details",
            activeTab: "basic",
        });
    }, [state.branchCode]);


    useEffect(() => {
        if (state.topTab !== "history") return;

        let timer = null;

        const run = () => {
            clearTimeout(timer);
            timer = setTimeout(() => applyHistoryStatusLabels(), 50);
        };

        run();

        const observer = new MutationObserver(run);
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true,
        });

        const interval = setInterval(run, 700);

        return () => {
            clearTimeout(timer);
            clearInterval(interval);
            observer.disconnect();
        };
    }, [state.topTab]);


    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const docNo =
            params.get("rmprNo") ||
            params.get("rmpr_no") ||
            params.get("docNo");
        const brCode = params.get("branchCode") || params.get("branch_code");

        if (!loadedFromUrlRef.current && docNo && brCode) {
            loadedFromUrlRef.current = true;
            handleHistoryRowPick({ docNo, branchCode: brCode });
            navigate(location.pathname, { replace: true });
        }
    }, [location.search, location.pathname, navigate, handleHistoryRowPick]);

    const parseWOResponse = (response) => {
        const unwrap = (value) => {
            if (value?.data?.data) return unwrap(value.data.data);
            if (value?.data) return unwrap(value.data);
            if (Array.isArray(value) && value[0]?.result !== undefined) return unwrap(value[0].result);
            if (value?.result !== undefined) return unwrap(value.result);

            if (typeof value === "string") {
                try {
                    return JSON.parse(value);
                } catch {
                    return [];
                }
            }

            return value;
        };

        const parsed = unwrap(response);
        if (Array.isArray(parsed)) return parsed;
        if (parsed && typeof parsed === "object") return [parsed];

        return [];
    };

    const applyWOReference = (header, detailRowsFromResponse = null) => {
        if (!header) return;

        const rows = Array.isArray(detailRowsFromResponse)
            ? detailRowsFromResponse
            : header?.dt1 || header?.details || header?.detailRows || [];
        const woStatus = String(getValue(header, "woStatus", "WO_STATUS")).toUpperCase();

        if (woStatus && woStatus !== "C") {
            Swal.fire({
                icon: "warning",
                title: "Invalid WO Status",
                text: "Only closed Work Orders with status C are allowed for RMPR.",
            });
            return;
        }

        const woNo = getValue(header, "woNo", "WO_NO", "WoNo", "WONo", "wo_no", "worNo", "WOR_NO") || state.woNo;
        const normalizedRows = Array.isArray(rows)
            ? rows.map((row, index) => normalizeDetailRow(
                {
                    ...row,
                    whouseCode: getValue(row, "whouseCode", "WHOUSE_CODE", "whCode", "WH_CODE") || state.WHCode,
                    locCode: getValue(row, "locCode", "LOC_CODE", "LocCode") || state.LocCode,
                },
                index,
            ))
            : state.detailRows;

        updateState({
            woNo,
            isOpenReferenceWO: true,
            particular: getValue(header, "remarks", "particular", "PARTICULAR") || state.particular,
            remarks: getValue(header, "remarks", "particular", "PARTICULAR") || state.remarks,
            detailRows: normalizedRows.map((row, index) => ({ ...row, lineNo: String(index + 1) })),
            showWOLookup: false,
        });
    };

    const loadWOReference = async (selectedWO = null) => {
        const selectedWoNo =
            typeof selectedWO === "string"
                ? selectedWO
                : getValue(selectedWO, "woNo", "WO_NO", "WoNo", "WONo", "wo_no", "worNo", "WOR_NO");
        const selectedBranchCode =
            getValue(selectedWO, "branchCode", "BRANCH_CODE") || state.branchCode;

        if (!selectedBranchCode) {
            Swal.fire({ icon: "info", title: "Branch Required", text: "Please select a branch first." });
            return;
        }

        const woNoToLoad = selectedWoNo || state.woNo;

        if (!woNoToLoad) {
            updateState({ showWOLookup: true });
            return;
        }

        updateState({ isLoading: true });

        try {
            const response = await fetchDataJson("getRMPRWO", {
                branchCode: selectedBranchCode,
                woNo: woNoToLoad,
                whouseCode: state.WHCode,
                locCode: state.LocCode,
            });

            const rows = parseWOResponse(response);
            const header = rows[0];

            if (!header) {
                Swal.fire({
                    icon: "info",
                    title: "No Records",
                    text: "Work Order was not found, has no remaining quantity, or is not yet closed. Only WO_STATUS = C can be loaded for RMPR.",
                });
                return;
            }

            const details = Array.isArray(header?.dt1) || Array.isArray(header?.details) || Array.isArray(header?.detailRows)
                ? null
                : rows;

            applyWOReference(
                {
                    ...selectedWO,
                    ...header,
                    woNo: getValue(header, "woNo", "WO_NO", "WoNo", "WONo", "wo_no", "worNo", "WOR_NO") || woNoToLoad,
                    branchCode: selectedBranchCode,
                },
                details,
            );
        } catch (error) {
            console.error("RMPR WO load error:", error);
            Swal.fire({ icon: "error", title: "WO Load Failed", text: error?.message || "Unable to load Work Order." });
        } finally {
            updateState({ isLoading: false });
        }
    };

    const handleCloseWOLookup = async (row) => {
        if (!row) {
            updateState({ showWOLookup: false });
            return;
        }

        const selectedWoNo = getValue(row, "woNo", "WO_NO", "WoNo", "WONo", "wo_no", "worNo", "WOR_NO");

        if (!selectedWoNo || row?.dt1 || row?.details || row?.detailRows) {
            applyWOReference(row);
            return;
        }

        await loadWOReference(row);
    };

    const handleTableInputEnterNavigation = (event, tableName, columnKey) => {
        if (event.key !== "Enter") return;

        event.preventDefault();
        event.stopPropagation();

        const currentInput = event.currentTarget;
        const tableSelector = `[data-rmpr-table="${tableName}"]`;
        const inputs = Array.from(
            document.querySelectorAll(
                `${tableSelector}:not([disabled]):not([readonly])`
            )
        ).filter((input) => {
            const style = window.getComputedStyle(input);
            return style.display !== "none" && style.visibility !== "hidden";
        });

        if (!inputs.length) return;

        const currentIndex = inputs.indexOf(currentInput);
        const sameColumnInputs = inputs.filter(
            (input) => input.dataset.rmprCol === columnKey
        );
        const currentColumnIndex = sameColumnInputs.indexOf(currentInput);

        let nextInput = null;

        if (event.shiftKey) {
            nextInput = currentColumnIndex > 0
                ? sameColumnInputs[currentColumnIndex - 1]
                : inputs[currentIndex - 1];
        } else {
            nextInput =
                currentColumnIndex >= 0 && currentColumnIndex < sameColumnInputs.length - 1
                    ? sameColumnInputs[currentColumnIndex + 1]
                    : inputs[currentIndex + 1];
        }

        if (!nextInput) return;

        setTimeout(() => {
            nextInput.focus();
            if (typeof nextInput.select === "function") {
                nextInput.select();
            }
        }, 0);
    };

    const attachTableNavigation = (node, tableName, rowIndex, columnKey) => {
        if (!React.isValidElement(node)) return node;

        const nodeType = typeof node.type === "string" ? node.type.toLowerCase() : "";
        const existingOnKeyDown = node.props?.onKeyDown;
        const existingOnBlur = node.props?.onBlur;
        const children = node.props?.children;

        const navigatedChildren = children
            ? React.Children.map(children, (child) =>
                attachTableNavigation(child, tableName, rowIndex, columnKey)
            )
            : children;

        const extraProps = {};

        if (["input", "textarea", "select"].includes(nodeType)) {
            extraProps["data-rmpr-table"] = tableName;
            extraProps["data-rmpr-row"] = rowIndex;
            extraProps["data-rmpr-col"] = columnKey;
            extraProps.onKeyDown = (event) => {
                existingOnKeyDown?.(event);
                if (event.defaultPrevented) return;

                if (event.key === "Enter") {
                    /*
                     * Format the current numeric field before moving to the next row.
                     * Without this, the value stays as typed (example: 10) until the user
                     * clicks the field again or clicks outside the table.
                     */
                    existingOnBlur?.({
                        ...event,
                        target: event.currentTarget,
                        currentTarget: event.currentTarget,
                    });
                }

                handleTableInputEnterNavigation(event, tableName, columnKey);
            };
        }

        if (navigatedChildren !== children) {
            extraProps.children = navigatedChildren;
        }

        return React.cloneElement(node, extraProps);
    };

    const textInput = (value, onChange, options = {}) => (
        <input
            type="text"
            className={`w-full global-tran-td-inputclass-ui ${options.className || ""}`}
            value={value || ""}
            readOnly={options.readOnly || isFormDisabled}
            disabled={options.disabled || isFormDisabled}
            onChange={(e) => onChange(e.target.value)}
        />
    );

    const numberInput = (value, onChange, decimal = 2) => (
        <input
            type="text"
            className="w-full global-tran-td-inputclass-ui text-right"
            value={value || ""}
            readOnly={isFormDisabled}
            disabled={isFormDisabled}
            onFocus={(e) => {
                const raw = amountRaw(value);
                if (raw === 0) {
                    onChange("");
                    return;
                }

                setTimeout(() => {
                    e.currentTarget.select();
                }, 0);
            }}
            onChange={(e) => onChange(e.target.value.replace(/[^0-9.-]/g, ""))}
            onBlur={(e) => onChange(amountValue(e.target.value, decimal))}
        />
    );

    const readOnlyNumberInput = (value, decimal = 2) => (
        <span
            className="block w-full px-2 py-1 text-right text-slate-900 dark:text-slate-100"
            title="Amount is system-computed from Quantity x Unit Cost"
        >
            {amountValue(value || 0, decimal)}
        </span>
    );

    const lookupCell = (value, onLookup, onChange = null) => (
        <div className="relative flex items-center">
            <input
                type="text"
                className="w-full global-tran-td-inputclass-ui pr-7"
                value={value || ""}
                readOnly={!onChange || isFormDisabled}
                disabled={isFormDisabled}
                onChange={(e) => onChange?.(e.target.value)}
            />
            {!isFormDisabled && (
                <FontAwesomeIcon
                    icon={faMagnifyingGlass}
                    className="absolute right-2 cursor-pointer text-blue-600 hover:text-blue-900"
                    onClick={onLookup}
                />
            )}
        </div>
    );

    const renderDetailCell = (column, row, index) => {
        const key = column.key;
        const width = column.width || 120;
        const tdClass = `global-tran-td-ui ${column.classNames || ""}`;
        const style = getDetailCellStyle(key, width);

        const openDetailLookup = (source, modalKey) => {
            updateState({
                selectedRowIndex: index,
                lookupSource: source,
                [modalKey]: true,
                selectedWH: row.whouseCode || state.WHCode || "",
            });
        };

        const renderers = {
            lineNo: () => <span>{index + 1}</span>,
            itemCode: () => lookupCell(row.itemCode, () => openDetailLookup("detailItem", "itemLookupOpen")),
            itemName: () => textInput(row.itemName, (v) => updateDetailRow(index, "itemName", v)),
            uomCode: () => textInput(row.uomCode, (v) => updateDetailRow(index, "uomCode", v)),
            quantity: () => numberInput(row.quantity, (v) => updateDetailRow(index, "quantity", v), 2),
            unitCost: () => numberInput(row.unitCost, (v) => updateDetailRow(index, "unitCost", v), 6),
            itemAmount: () => readOnlyNumberInput(row.itemAmount ?? row.amount, 6),
            amount: () => readOnlyNumberInput(row.itemAmount ?? row.amount, 6),
            totalAmount: () => readOnlyNumberInput(row.itemAmount ?? row.amount ?? row.totalAmount, 6),
            categCode: () => textInput(row.categCode, (v) => updateDetailRow(index, "categCode", v), { readOnly: true }),
            lotNo: () => textInput(row.lotNo, (v) => updateDetailRow(index, "lotNo", v)),
            bbDate: () => (
                <input
                    type="date"
                    className="w-full global-tran-td-inputclass-ui"
                    value={row.bbDate || ""}
                    readOnly={isFormDisabled}
                    disabled={isFormDisabled}
                    onChange={(e) => updateDetailRow(index, "bbDate", e.target.value)}
                />
            ),
            qstatCode: () => lookupCell(row.qstatCode, () => openDetailLookup("detailQstat", "showQstatModal")),
            qtyHand: () => numberInput(row.qtyHand, (v) => updateDetailRow(index, "qtyHand", v), 6),
            acctCode: () => textInput(row.acctCode, (v) => updateDetailRow(index, "acctCode", v), { readOnly: true }),
            rcCode: () => lookupCell(row.rcCode, () => openDetailLookup("detailRc", "showRCLookup")),
            sltypeCode: () => textInput(row.sltypeCode, (v) => updateDetailRow(index, "sltypeCode", v)),
            slCode: () => lookupCell(row.slCode, () => openDetailLookup("detailSl", "showSLLookup")),
            totMatlCost: () => numberInput(row.totMatlCost, (v) => updateDetailRow(index, "totMatlCost", v), 6),
            stdLabor: () => numberInput(row.stdLabor, (v) => updateDetailRow(index, "stdLabor", v), 6),
            stdOverhead: () => numberInput(row.stdOverhead, (v) => updateDetailRow(index, "stdOverhead", v), 6),
            whouseCode: () => lookupCell(row.whouseCode, () => openDetailLookup("detailWh", "warehouseLookupOpen")),
            locCode: () =>
                lookupCell(row.locCode, () => {
                    const whCode = row.whouseCode || state.WHCode || "";
                    if (!whCode) {
                        Swal.fire({
                            icon: "warning",
                            title: "Warehouse Required",
                            text: "Please select Warehouse first before selecting Location.",
                        });
                        return;
                    }
                    openDetailLookup("detailLoc", "locationLookupOpen");
                }),
        };

        const cellContent =
            renderers[key]?.() || textInput(row[key], (v) => updateDetailRow(index, key, v));

        return (
            <td key={`${key}-${index}`} className={tdClass} style={style}>
                {attachTableNavigation(cellContent, "rmpr-detail", index, key)}
            </td>
        );
    };

    const renderSummaryCell = (column, row, index) => {
        const key = column.key;
        const width = column.width || 120;
        const tdClass = `global-tran-td-ui ${column.classNames || ""}`;
        const style = getSummaryCellStyle(key, width);

        const renderers = {
            lineNo: () => <span>{index + 1}</span>,
            acctCode: () => lookupCell(row.acctCode, () => updateState({ glRowIndex: index, showCOALookup: true })),
            rcCode: () => lookupCell(row.rcCode, () => updateState({ glRowIndex: index, lookupSource: "summaryRc", showRCLookup: true })),
            sltypeCode: () => textInput(row.sltypeCode, (v) => updateSummaryRow(index, "sltypeCode", v)),
            slCode: () => lookupCell(row.slCode, () => updateState({ glRowIndex: index, lookupSource: "summarySl", showSLLookup: true })),
            particular: () => textInput(row.particular, (v) => updateSummaryRow(index, "particular", v)),
            vatCode: () => lookupCell(row.vatCode, () => updateState({ glRowIndex: index, showVATLookup: true })),
            vatDesc: () => textInput(row.vatDesc, (v) => updateSummaryRow(index, "vatDesc", v), { readOnly: true }),
            atcCode: () => lookupCell(row.atcCode || row.ewtCode, () => updateState({ glRowIndex: index, showEWTLookup: true })),
            atcDesc: () => textInput(row.atcDesc || row.ewtDesc, (v) => updateSummaryRow(index, "atcDesc", v), { readOnly: true }),
            ewtCode: () => lookupCell(row.atcCode || row.ewtCode, () => updateState({ glRowIndex: index, showEWTLookup: true })),
            ewtDesc: () => textInput(row.atcDesc || row.ewtDesc, (v) => updateSummaryRow(index, "ewtDesc", v), { readOnly: true }),
            debit: () => numberInput(row.debit, (v) => updateSummaryRow(index, "debit", v), 2),
            credit: () => numberInput(row.credit, (v) => updateSummaryRow(index, "credit", v), 2),
            slRefNo: () => textInput(row.slRefNo, (v) => updateSummaryRow(index, "slRefNo", v)),
            slRefDate: () => (
                <input
                    type="date"
                    className="w-full global-tran-td-inputclass-ui"
                    value={row.slRefDate || ""}
                    readOnly={isFormDisabled}
                    disabled={isFormDisabled}
                    onChange={(e) => updateSummaryRow(index, "slRefDate", e.target.value)}
                />
            ),
            dt1Lineno: () => textInput(row.dt1Lineno, (v) => updateSummaryRow(index, "dt1Lineno", v)),
            remarks: () => textInput(row.remarks, (v) => updateSummaryRow(index, "remarks", v)),
        };

        const cellContent =
            renderers[key]?.() || textInput(row[key], (v) => updateSummaryRow(index, key, v));

        return (
            <td key={`${key}-${index}`} className={tdClass} style={style}>
                {attachTableNavigation(cellContent, "rmpr-summary", index, key)}
            </td>
        );
    };

    const printData = {
        doc_id: reportDocType,
        branch: state.branchCode,
        pr_no: state.documentNo,
        rmpr_no: state.documentNo,
    };

    return (
        <div className="global-tran-main-div-ui">
            {/* Do not return only <LoadingSpinner /> here.
                Returning early unmounts the Stock Card modal and reloads its query data.
                Keep the page mounted and show the spinner as an overlay instead. */}
            {state.showSpinner && <LoadingSpinner />}

            <div className="global-tran-headerToolbar-ui">
                <Header
                    docType={docType}
                    pdfLink={pdfLink}
                    videoLink={videoLink}
                    onPrint={handlePrint}
                    printData={printData}
                    onReset={handleReset}
                    onSave={() => handleActivityOption("Upsert")}
                    onGenerateGL={() => handleActivityOption("GenerateGL")}
                    onPost={handlePost}
                    onCancel={handleCancel}
                    onCopy={handleCopy}
                    onAttach={handleAttach}
                    activeTopTab={state.topTab}
                    showActions={state.topTab === "details"}
                    onDetails={() => updateState({ topTab: "details" })}
                    onHistory={() => updateState({ topTab: "history" })}
                    disableRouteNavigation
                    detailsRoute="/page/RMPR"
                    isSaveDisabled={state.isSaveDisabled || isFormDisabled}
                    isResetDisabled={state.isResetDisabled}
                    isViewDocument={state.isViewDocument}
                    isCancelDisabled={!state.documentID || isFormDisabled}
                />
            </div>

            <div className={state.topTab === "details" ? "" : "hidden"}>
                <div className="global-tran-header-ui">
                    <div className="global-tran-headertext-div-ui">
                        <h1 className="global-tran-headertext-ui">{documentTitle}</h1>
                    </div>
                    <div className="global-tran-headerstat-div-ui">
                        <div>
                            <p className="global-tran-headerstat-text-ui">Transaction Status</p>
                            <h1 className={`global-tran-stat-text-ui ${statusColor}`}>{displayStatus}</h1>
                        </div>
                    </div>
                </div>

                <div className="global-tran-header-div-ui">
                    <div className="global-tran-header-tab-div-ui flex items-center justify-between">
                        <button
                            type="button"
                            className={`global-tran-tab-padding-ui ${state.activeTab === "basic"
                                ? "global-tran-tab-text_active-ui"
                                : "global-tran-tab-text_inactive-ui"
                                }`}
                            onClick={() => updateState({ activeTab: "basic" })}
                        >
                            Basic Information
                        </button>

                        <button
                            type="button"
                            onClick={() => updateState({ showStockCard: true })}
                            className="mr-2 inline-flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100 hover:border-blue-300 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-950/70"
                            title="View RM Stock Card"
                        >
                            <FontAwesomeIcon icon={faBoxesStacked} />
                            RM Stock Card
                        </button>
                    </div>

                    {state.activeTab === "basic" && (
                        <>
                            <div className="grid grid-cols-1 gap-4 rounded-lg md:grid-cols-2 lg:grid-cols-3">
                                <div className="global-tran-textbox-group-div-ui">
                                    <FieldRenderer
                                        id="branchName"
                                        label="Branch"
                                        type="lookup"
                                        value={state.branchName || ""}
                                        readOnly
                                        disabled={state.isFetchDisabled || state.isDocNoDisabled || isFormDisabled}
                                        lookupDisabled={state.isFetchDisabled || isFormDisabled}
                                        onLookup={() => updateState({ branchModalOpen: true })}
                                    />
                                    <FieldRenderer
                                        id="rmprNo"
                                        label="RMPR No."
                                        type="lookup"
                                        value={state.documentNo || ""}
                                        readOnly={state.isDocNoDisabled}
                                        disabled={false}
                                        lookupDisabled={false}
                                        onChange={(val) => updateState({ documentNo: val })}
                                        onLookup={openAllTranDocNoLookup}
                                        onKeyDown={(e) => {
                                            if (e.key === "F1" || e.keyCode === 112) {
                                                openAllTranDocNoLookup(e);
                                                return;
                                            }

                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                handleDocNoBlur();
                                            }
                                        }}
                                    />
                                    <FieldRenderer
                                        id="rmprDate"
                                        label="RMPR Date"
                                        type="date"
                                        value={state.rmprDate}
                                        onChange={(val) => updateState({ rmprDate: val })}
                                        disabled={isFormDisabled}
                                    />
                                </div>

                                <div className="global-tran-textbox-group-div-ui">
                                    <FieldRenderer
                                        id="woNo"
                                        label="WO No."
                                        type="text"
                                        value={state.woNo || ""}
                                        readOnly
                                        disabled
                                    />
                                    <FieldRenderer
                                        id="WHCode"
                                        label="Warehouse"
                                        type="lookup"
                                        value={state.WHCode || ""}
                                        readOnly
                                        required
                                        disabled={isFormDisabled}
                                        onLookup={() => updateState({ warehouseLookupOpen: true })}
                                    />

                                    <FieldRenderer
                                        id="LocCode"
                                        label="Location"
                                        type="lookup"
                                        value={state.LocCode || ""}
                                        readOnly
                                        required
                                        disabled={isFormDisabled}
                                        onLookup={() => {
                                            if (!state.WHCode) {
                                                Swal.fire({
                                                    icon: "warning",
                                                    title: "Warehouse Required",
                                                    text: "Please select Warehouse first before selecting Location.",
                                                });
                                                return;
                                            }
                                            updateState({ locationLookupOpen: true, selectedWH: state.WHCode });
                                        }}
                                    />
                                </div>

                                <div className="global-tran-textbox-group-div-ui">
                                    <FieldRenderer
                                        id="refNo"
                                        label="Reference No."
                                        type="text"
                                        value={state.refNo || ""}
                                        onChange={(val) => updateState({ refNo: val })}
                                        disabled={isFormDisabled}
                                    />
                                </div>

                                <div className="col-span-full">
                                    <label
                                        htmlFor="remarks"
                                        className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300"
                                    >
                                        Remarks
                                    </label>
                                    <textarea
                                        id="remarks"
                                        className="w-full min-h-[95px] resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                                        value={state.remarks || ""}
                                        onChange={(e) => updateState({ remarks: e.target.value })}
                                        disabled={isFormDisabled}
                                    />
                                </div>
                            </div>

                            <div className="global-tran-tab-div-ui mt-4">
                                <div className="global-tran-tab-nav-ui">
                                    <div className="flex flex-row sm:flex-row">
                                        <button
                                            type="button"
                                            className="global-tran-tab-padding-ui global-tran-tab-text_active-ui"
                                        >
                                            Item Details
                                        </button>
                                    </div>
                                </div>

                                <div className="global-tran-table-main-div-ui">
                                    <div className="global-tran-table-main-sub-div-ui">
                                        <table className="min-w-full border-separate border-spacing-0 [&_td]:border-b [&_td]:border-r [&_td]:border-slate-200 [&_tr>td:first-child]:border-l [&_th]:border-b [&_th]:border-slate-200">
                                            <thead className="global-tran-thead-div-ui">
                                                <tr>
                                                    {orderedDetailColumns.map((column) =>
                                                        renderDetailHeader(column.label, column.key, column.width, {
                                                            orderedColumns: orderedDetailColumns,
                                                        })
                                                    )}
                                                    {!isFormDisabled && (
                                                        <th className="global-tran-th-ui" style={{ minWidth: 90 }}>Actions</th>
                                                    )}
                                                </tr>
                                            </thead>
                                            <tbody className="relative">
                                                {state.detailRows.length === 0 ? (
                                                    <tr>
                                                        <td
                                                            className="global-tran-td-ui text-center text-gray-500"
                                                            colSpan={orderedDetailColumns.length + 1}
                                                        >
                                                            No item details yet.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    sortedDetailRows.map(({ row, originalIndex }) => (
                                                        <tr key={row.id || originalIndex} className="global-tran-tr-ui">
                                                            {orderedDetailColumns.map((column) => renderDetailCell(column, row, originalIndex))}
                                                            {!isFormDisabled && (
                                                                <td className="global-tran-td-ui text-center" style={{ minWidth: 90 }}>
                                                                    <button
                                                                        type="button"
                                                                        className="global-tran-td-button-delete-ui"
                                                                        onClick={() => deleteDetailRow(originalIndex)}
                                                                        disabled={isFormDisabled}
                                                                    >
                                                                        <FontAwesomeIcon icon={faMinus} />
                                                                    </button>
                                                                </td>
                                                            )}
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                        {renderDetailHeaderContextMenu()}
                                    </div>
                                </div>

                                <div className="global-tran-tab-footer-main-div-ui">
                                    <div className="global-tran-tab-footer-button-div-ui">
                                        <div className="relative inline-block">
                                            {showTypeDropdown && !state.isOpenReferenceWO && (
                                                <div className="absolute bottom-[110%] left-0 z-[9999] mb-2 w-[220px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.16)] dark:border-slate-700 dark:bg-slate-800">
                                                    <div className="border-b border-slate-100 px-3 py-2 dark:border-slate-700">
                                                        <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500">
                                                            Add Item
                                                        </div>
                                                    </div>

                                                    <div className="p-1.5">
                                                        <button
                                                            type="button"
                                                            className="mt-1 flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-all duration-150 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-100 dark:hover:bg-slate-700"
                                                            onClick={handleOpenRMLookup}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                                                                    <FontAwesomeIcon icon={faBoxesStacked} />
                                                                </span>
                                                                <div className="flex flex-col items-start">
                                                                    <span>Raw Materials</span>
                                                                    <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500">
                                                                        Add RM item
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                                                                RM
                                                            </span>
                                                        </button>

                                                        {!hasItemDetails && (
                                                            <>
                                                                <div className="my-1.5 border-t border-slate-100 dark:border-slate-700" />

                                                                <button
                                                                    type="button"
                                                                    className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium text-blue-700 transition-all duration-150 hover:bg-blue-50 hover:text-blue-900 dark:text-blue-300 dark:hover:bg-slate-700"
                                                                    onClick={handleOpenWOReferenceLookup}
                                                                >
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-slate-700 dark:text-blue-300">
                                                                            <FontAwesomeIcon icon={faMagnifyingGlass} />
                                                                        </span>
                                                                        <div className="flex flex-col items-start">
                                                                            <span>Open Reference WO</span>
                                                                            <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500">
                                                                                Pull items from WO
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600 dark:bg-slate-700 dark:text-blue-300">
                                                                        WO
                                                                    </span>
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            <button
                                                type="button"
                                                onClick={handleAddRowClick}
                                                className="global-tran-tab-footer-button-add-ui"
                                                disabled={isFormDisabled || state.isOpenReferenceWO}
                                                style={{ visibility: (isFormDisabled || state.isOpenReferenceWO) ? "hidden" : "visible" }}
                                            >
                                                <FontAwesomeIcon icon={faPlus} className="mr-2" />
                                                Add
                                            </button>
                                        </div>
                                    </div>

                                    <div className="global-tran-tab-footer-total-main-div-ui">
                                        <div className="global-tran-tab-footer-total-div-ui">
                                            <label className="global-tran-tab-footer-total-label-ui">Total Net Amount:</label>
                                            <label className="global-tran-tab-footer-total-value-ui">{totals.amount}</label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="global-tran-tab-div-ui mt-4">
                                <div className="global-tran-tab-nav-ui">
                                    <div className="flex flex-row sm:flex-row">
                                        <button
                                            type="button"
                                            className="global-tran-tab-padding-ui global-tran-tab-text_active-ui"
                                        >
                                            General Ledger
                                        </button>
                                    </div>

                                    <div className="flex justify-end">
                                        <button
                                            type="button"
                                            onClick={() => handleActivityOption("GenerateGL")}
                                            className="global-tran-button-generateGL"
                                            disabled={isFormDisabled}
                                            style={{ visibility: isFormDisabled ? "hidden" : "visible" }}
                                        >
                                            Generate GL Entries
                                        </button>
                                    </div>
                                </div>

                                <div className="global-tran-table-main-div-ui">
                                    <div className="global-tran-table-main-sub-div-ui">
                                        <table className="min-w-full border-separate border-spacing-0 [&_td]:border-b [&_td]:border-r [&_td]:border-slate-200 [&_tr>td:first-child]:border-l [&_th]:border-b [&_th]:border-slate-200">
                                            <thead className="global-tran-thead-div-ui">
                                                <tr>
                                                    {orderedSummaryColumns.map((column) =>
                                                        renderSummaryHeader(column.label, column.key, column.width, {
                                                            orderedColumns: orderedSummaryColumns,
                                                        })
                                                    )}
                                                    {!isFormDisabled && (
                                                        <th className="global-tran-th-ui" style={{ minWidth: 90 }}>Actions</th>
                                                    )}
                                                </tr>
                                            </thead>
                                            <tbody className="relative">
                                                {state.detailRowsGL.length === 0 ? (
                                                    <tr>
                                                        <td
                                                            className="global-tran-td-ui text-center text-gray-500"
                                                            colSpan={orderedSummaryColumns.length + 1}
                                                        >
                                                            No general ledger entries yet.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    sortedSummaryRows.map(({ row, originalIndex }) => (
                                                        <tr key={row.id || originalIndex} className="global-tran-tr-ui">
                                                            {orderedSummaryColumns.map((column) => renderSummaryCell(column, row, originalIndex))}
                                                            {!isFormDisabled && (
                                                                <td className="global-tran-td-ui text-center" style={{ minWidth: 90 }}>
                                                                    <button
                                                                        type="button"
                                                                        className="global-tran-td-button-delete-ui"
                                                                        onClick={() => deleteSummaryRow(originalIndex)}
                                                                        disabled={isFormDisabled}
                                                                    >
                                                                        <FontAwesomeIcon icon={faMinus} />
                                                                    </button>
                                                                </td>
                                                            )}
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                        {renderSummaryHeaderContextMenu()}
                                    </div>
                                </div>

                                <div className="global-tran-tab-footer-main-div-ui">
                                    <div className="global-tran-tab-footer-button-div-ui">
                                        <button
                                            type="button"
                                            onClick={() => addSummaryRow()}
                                            className="global-tran-tab-footer-button-add-ui"
                                            disabled={isFormDisabled}
                                            style={{ visibility: isFormDisabled ? "hidden" : "visible" }}
                                        >
                                            <FontAwesomeIcon icon={faPlus} className="mr-2" />
                                            Add
                                        </button>
                                    </div>

                                    <div className="global-tran-tab-footer-total-main-div-ui">
                                        <div className="global-tran-tab-footer-total-div-ui">
                                            <label className="global-tran-tab-footer-total-label-ui">Total Debit (PHP):</label>
                                            <label className="global-tran-tab-footer-total-value-ui">{totals.debit}</label>
                                        </div>
                                        <div className="global-tran-tab-footer-total-div-ui">
                                            <label className="global-tran-tab-footer-total-label-ui">Total Credit (PHP):</label>
                                            <label className="global-tran-tab-footer-total-value-ui">{totals.credit}</label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                </div>
            </div>

            <div className={state.topTab === "history" ? "" : "hidden"}>
                <AllTranHistory
                    showHeader={false}
                    isActive={state.topTab === "history"}
                    endpoint="/getRMPRHistory"
                    cacheKey={`RMPR:${state.branchCode || ""}:${state.documentNo || ""}`}
                    activeTabKey="RMPR_Summary"
                    branchCode={state.branchCode}
                    startDate={null}
                    endDate={null}
                    status="All"
                    statusFormatter={formatDocumentStatusLabel}
                    columnFormatters={{
                        status: formatDocumentStatusLabel,
                        doc_stat: formatDocumentStatusLabel,
                        docStatus: formatDocumentStatusLabel,
                        stat: formatDocumentStatusLabel,
                    }}
                    onRowDoubleClick={handleHistoryRowPick}
                    historyExportName={`${documentTitle} History`}
                />
            </div>

            {state.branchModalOpen && (
                <BranchLookupModal
                    isOpen={state.branchModalOpen}
                    onClose={handleCloseBranchModal}
                    onSelect={handleCloseBranchModal}
                />
            )}

            {state.showWOLookup && (
                <WOLookupModal
                    isOpen={state.showWOLookup}
                    branchCode={state.branchCode}
                    whouseCode={state.WHCode}
                    locCode={state.LocCode}
                    endpoint="getRMPRWO"
                    docType="RMPR"
                    moduleLabel="RMPR"
                    onClose={() => updateState({ showWOLookup: false })}
                    onSelect={handleCloseWOLookup}
                />
            )}

            {state.warehouseLookupOpen && (
                <WarehouseLookupModal
                    isOpen={state.warehouseLookupOpen}
                    onClose={handleCloseWarehouseLookup}
                    onSelect={handleCloseWarehouseLookup}
                    filter="ActiveAll"
                    branchCode={state.branchCode || ""}
                invType="RM"
                />
            )}

            {state.locationLookupOpen && (
                <LocationLookupModal
                    isOpen={state.locationLookupOpen}
                    onClose={handleCloseLocationLookup}
                    onSelect={handleCloseLocationLookup}
                    filter="ActiveAll"
                    whCode={state.selectedWH || state.WHCode || ""}
                    WHCode={state.selectedWH || state.WHCode || ""}
                    whouseCode={state.selectedWH || state.WHCode || ""}
                />
            )}

            {state.itemLookupOpen && (
                <ItemMastLookupModal
                    isOpen={state.itemLookupOpen}
                    endpoint="getInvLookupRM"
                    onClose={handleCloseItemLookup}
                    onGetSelectedItems={handleCloseItemLookup}
                    onCancel={() => updateState({ itemLookupOpen: false, selectedRowIndex: null })}
                    enableMultiSelect
                    customParam="ActiveAll"
                    docType="PRRM"
                />
            )}

            {state.showQstatModal && (
                <QstatLookupModal
                    isOpen={state.showQstatModal}
                    onClose={handleCloseQStatLookup}
                    onSelect={handleCloseQStatLookup}
                    filter="ActiveAll"
                />
            )}

            {state.showRCLookup && (
                <RCLookupModal
                    isOpen={state.showRCLookup}
                    onClose={handleCloseRCModal}
                    onSelect={handleCloseRCModal}
                    customParam="ActiveDept"
                />
            )}

            <COAMastLookupModal
                isOpen={state.showCOALookup}
                onClose={handleCloseCOALookup}
                onSelect={handleCloseCOALookup}
            />

            <SLMastLookupModal
                isOpen={state.showSLLookup}
                onClose={handleCloseSLLookup}
                onSelect={handleCloseSLLookup}
            />

            <VATLookupModal
                isOpen={state.showVATLookup}
                onClose={handleCloseVATLookup}
                onSelect={handleCloseVATLookup}
                customParam="ActiveAll"
            />

            <ATCLookupModal
                isOpen={state.showEWTLookup}
                onClose={handleCloseEWTLookup}
                onSelect={handleCloseEWTLookup}
            />
            {state.showCancelModal && (
                <CancelTranModal
                    isOpen={state.showCancelModal}
                    onClose={handleCloseCancel}
                    onCancel={() => updateState({ showCancelModal: false })}
                />
            )}

            {state.showPostModal && (
                <PostTranModal
                    isOpen={state.showPostModal}
                    onClose={handleClosePost}
                    onCancel={() => updateState({ showPostModal: false })}
                />
            )}

            {state.showStockCard && (
                <SearchStockCard
                    isOpen={state.showStockCard}
                    module="RM"
                    onClose={() => updateState({ showStockCard: false })}
                />
            )}

            {state.showAllTranDocNo && (
                <AllTranDocNo
                    isOpen={state.showAllTranDocNo}
                    params={{
                        branchCode: state.branchCode,
                        branchName: state.branchName,
                        docType,
                        documentTitle,
                        fieldNo: "rmprNo",
                    }}
                    onRetrieve={handleTranDocNoRetrieval}
                    onResponse={{ documentNo: state.documentNo }}
                    onSelected={handleTranDocNoSelection}
                    onClose={() => updateState({ showAllTranDocNo: false })}
                />
            )}
        </div>
    );
};

export default RMPR;
