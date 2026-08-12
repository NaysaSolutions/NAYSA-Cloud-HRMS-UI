// src/NAYSA Cloud/Master Data/FAMasterData/FAMast.jsx

import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faFolderOpen,
    faList,
    faTags,
    faPlus,
    faSave,
    faUndo,
    faPenToSquare,
    faTrash,
    faTable,
    faChartLine,
    faMagnifyingGlass,
    faFilter,
    faTimes,
} from "@fortawesome/free-solid-svg-icons";

import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import ButtonBar from "@/NAYSA Cloud/Global/ButtonBar";
import FAMast_SetupTab from "@/NAYSA Cloud/Master Data/FAMasterData/FAMast_SetupTab.jsx";
import FAMast_DataTab from "@/NAYSA Cloud/Master Data/FAMasterData/FAMast_DataTab.jsx";
import FAMast_FinancialInfoTab from "@/NAYSA Cloud/Master Data/FAMasterData/FAMast_FinancialInfoTab.jsx";
import FAMast_ReferenceCodeTab from "@/NAYSA Cloud/Master Data/FAMasterData/FAMast_ReferenceCodeTab.jsx";

import {
    useSwalErrorAlert,
    useSwalSuccessAlert,
    useSwalErrorAlertAPI,
    useSwalDeleteConfirm,
    useSwalDeleteRecord,
} from "@/NAYSA Cloud/Global/behavior.jsx";

import { usePagePermission } from "@/NAYSA Cloud/Global/usePagePermission.js";
import PermissionBadge from "@/NAYSA Cloud/Global/PermissionBadge.jsx";

import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import SearchBranchRef from "@/NAYSA Cloud/Lookup/SearchBranchRef.jsx";
import SearchRCMast from "@/NAYSA Cloud/Lookup/SearchRCMast.jsx";
import SearchFACateg from "@/NAYSA Cloud/Lookup/SearchFACateg.jsx";
import SearchFAClass from "@/NAYSA Cloud/Lookup/SearchFAClass.jsx";
import SearchFALoc from "@/NAYSA Cloud/Lookup/SearchFALoc.jsx";
import SearchFAAsset from "@/NAYSA Cloud/Lookup/SearchFAAsset.jsx";

// ─────────────────────────────────────────────────────────────────────────────
//  Empty form — mirrors fa_mast columns exactly (camelCase aliases from sproc)
// ─────────────────────────────────────────────────────────────────────────────
const emptyForm = {
    // identity
    faCode:             "",         // fa_code
    faName:             "",         // fa_name

    // classification
    categCode:          "", categName:    "",   // categ_code
    classCode:          "", className:   "",    // class_code

    // location / branch
    flocCode:           "", flocName:    "",    // floc_code
    branchCode:         "", branchName:  "",    // branch_code

    // acquisition references
    farrId:             "",         // farr_id
    farrNo:             "",         // farr_no
    groupId:            "",         // group_id
    serialGroupId:      "",         // serial_group_id
    poId:               "",         // po_id
    poNo:               "",         // po_no
    vendCode:           "", vendName: "",       // vend_code / vend_name
    rrNo:               "",         // rr_no

    // identifiers
    serialNo:           "",         // serial_no
    modelNo:            "",         // model_no
    barCode:            "",         // bar_code
    tagNo:              "",         // tag_no
    oldCode:            "",         // old_code

    // assignment
    rcCode:             "", rcName:  "",        // rc_code
    empNo:              "", empName: "",        // emp_no / emp_name

    // description
    faSpecs:            "",         // fa_specs
    refNo1:             "",         // ref_no1
    refNo2:             "",         // ref_no2

    // status / cutoff
    faStatus:           "A",        // fa_status  (A=Active, D=Disposed, M=?)
    cutoffCode:         "",         // cutoff_code
    gcutoffCode:        "",         // gcutoff_code
    tranMode:           "S",        // tran_mode

    // acquisition cost
    acqDate:            "",         // acq_date
    currCode:           "PHP",      // curr_code
    currRate:           "1.000000", // curr_rate
    eul:                "0",        // eul  (estimated useful life in years)
    rul:                "0",        // rul  (remaining useful life)
    dcutoffCode:        "",         // dcutoff_code

    acqCost:            "0.00",     // acq_cost
    acqCostFx1:         "0.00",     // acq_cost_fx1
    acqCostFx2:         "0.00",     // acq_cost_fx2

    // depreciation
    accumDepr:          "0.00",     // accum_depr
    accumDeprFx1:       "0.00",     // accum_depr_fx1
    accumDeprFx2:       "0.00",     // accum_depr_fx2
    deprMonth:          "0.00",     // depr_month
    deprMonthFx1:       "0.00",     // depr_month_fx1
    deprMonthFx2:       "0.00",     // depr_month_fx2

    // net book value
    nbValue:            "0.00",     // nb_value
    nbValueFx1:         "0.00",     // nb_value_fx1
    nbValueFx2:         "0.00",     // nb_value_fx2

    // salvage (read-only — managed by depreciation transactions, not set here)
    salvageValue:       "0.00",     // salvage_value

    // warranty
    warrantyStartDate:  "",         // warranty_start_date
    warrantyExpiryDate: "",         // warranty_expiry_date
    warrantyMonths:     "0",        // warranty_months
    warrantyNotes:      "",         // warranty_notes

    // lock info (read-only, set by transactions)
    lockedTranCode:     "",         // locked_tran_code
    lockedTranId:       "",         // locked_tran_id
    lockedTranNo:       "",         // locked_tran_no
    lockedTranDate:     "",         // locked_tran_date
    lockedBy:           "",         // locked_by
    lockedDate:         "",         // locked_date

    // audit
    registeredBy:       "", registeredDate: "",
    lastUpdatedBy:      "", lastUpdatedDate: "",

    __isNew: false,
};

const FA_STATUS_OPTIONS = [
    { value: "All",  label: "All Assets" },
    { value: "A", label: "Active" },
    { value: "M", label: "Merged" },
    { value: "S", label: "Split" },
    { value: "D", label: "Disposed" },
    { value: "H", label: "Hold" },
];

const normalizeText = (value) =>
    value === null || value === undefined ? "" : String(value).trim();

const normalizeUpper = (value) => normalizeText(value).toUpperCase();

const pickFirst = (row = {}, keys = []) => {
    for (const key of keys) {
        const value = row?.[key];
        if (value !== null && value !== undefined && String(value).trim() !== "") return value;
    }
    return "";
};

const compactParams = (params = {}) =>
    Object.entries(params).reduce((acc, [key, value]) => {
        const text = normalizeText(value);
        if (text !== "") acc[key] = text;
        return acc;
    }, {});

const buildEmptyMasterFilters = (currentUserRow = {}) => ({
    branchCode: normalizeText(currentUserRow?.branchCode || currentUserRow?.BRANCH_CODE),
    branchName: normalizeText(currentUserRow?.branchName || currentUserRow?.BRANCH_NAME),
    flocCode: "",
    flocName: "",
    rcCode: "",
    rcName: "",
    categCode: "",
    categName: "",
    classCode: "",
    className: "",
    faCode: "",
    faName: "",
    faStatus: "",
    showLookupModal: false,
    lookupType: "",
    modalType: "",
});

const buildMasterFilterParams = (filters = {}) =>
    compactParams({
        search: filters.faCode,
        searchMode: "part",
        branchCode: filters.branchCode,
        flocCode: filters.flocCode,
        rcCode: filters.rcCode,
        categCode: filters.categCode,
        classCode: filters.classCode,
        faCode: filters.faCode,
        faStatus: filters.faStatus,
    });

const rowMatchesCodeNameFilter = (row, filters, codeFilterKey, nameFilterKey, codeKeys, nameKeys) => {
    const codeFilter = normalizeUpper(filters?.[codeFilterKey]);
    const nameFilter = normalizeUpper(filters?.[nameFilterKey]);

    if (!codeFilter && !nameFilter) return true;

    const rowCode = normalizeUpper(pickFirst(row, codeKeys));
    const rowName = normalizeUpper(pickFirst(row, nameKeys));

    if (codeFilter && rowCode) return rowCode === codeFilter;
    if (nameFilter && rowName) return rowName.includes(nameFilter);

    return false;
};

const rowMatchesStatusFilter = (row, filters) => {
    const statusFilter = normalizeUpper(filters?.faStatus);
    if (!statusFilter || statusFilter === "ALL") return true;

    const rowStatus = normalizeUpper(
        pickFirst(row, [
            "faStatus", "FA_STATUS", "fa_status",
            "status",   "STATUS",
            "assetStatus", "ASSET_STATUS", "asset_status",
        ])
    );

    // FIX: if the sproc doesn't return a status column at all, don't silently
    // drop the row — pass it through so the user can still see the data.
    if (!rowStatus) return true;
    return rowStatus === statusFilter || rowStatus.startsWith(statusFilter);
};

const filterRowsByMasterFilters = (rows = [], filters = {}) => {
    const list = Array.isArray(rows) ? rows : [];

    return list.filter((row) =>
        rowMatchesCodeNameFilter(
            row,
            filters,
            "branchCode",
            "branchName",
            ["branchCode", "BRANCH_CODE", "branch_code"],
            ["branchName", "BRANCH_NAME", "branch_name"]
        ) &&
        rowMatchesCodeNameFilter(
            row,
            filters,
            "flocCode",
            "flocName",
            ["flocCode", "FLOC_CODE", "floc_code", "locCode", "LOC_CODE", "loc_code", "locationCode", "LOCATION_CODE"],
            ["flocName", "FLOC_NAME", "floc_name", "locName",  "LOC_NAME",  "loc_name",  "location",     "LOCATION",     "locationName", "LOCATION_NAME"]
        ) &&
        rowMatchesCodeNameFilter(
            row,
            filters,
            "rcCode",
            "rcName",
            ["rcCode", "RC_CODE", "rc_code", "deptCode", "DEPT_CODE", "departmentCode"],
            ["rcName", "RC_NAME", "rc_name", "deptName", "DEPT_NAME", "departmentName"]
        ) &&
        rowMatchesCodeNameFilter(
            row,
            filters,
            "categCode",
            "categName",
            ["categCode", "CATEG_CODE", "categ_code", "categoryCode"],
            ["categName", "CATEG_NAME", "categ_name", "categoryName", "category"]
        ) &&
        rowMatchesCodeNameFilter(
            row,
            filters,
            "classCode",
            "className",
            ["classCode", "CLASS_CODE", "class_code", "subCategoryCode"],
            ["className", "CLASS_NAME", "class_name", "subCategoryName", "assetSubCategory"]
        ) &&
        rowMatchesCodeNameFilter(
            row,
            filters,
            "faCode",
            "faName",
            ["faCode", "FA_CODE", "fa_code"],
            ["faName", "FA_NAME", "fa_name", "description", "assetDescription"]
        ) &&
        rowMatchesStatusFilter(row, filters)
    );
};

const buildMasterFilterContext = (filters = {}) => {
    const parts = [];

    if (filters.branchCode || filters.branchName) {
        parts.push(`Branch: ${filters.branchCode || "All"}${filters.branchName ? ` - ${filters.branchName}` : ""}`);
    }
    if (filters.faCode) parts.push(`Asset: ${filters.faCode}${filters.faName ? ` - ${filters.faName}` : ""}`);
    if (filters.flocCode || filters.flocName) parts.push(`Location: ${filters.flocCode || filters.flocName}`);
    if (filters.rcCode || filters.rcName) parts.push(`Department: ${filters.rcCode || filters.rcName}`);
    if (filters.categCode || filters.categName) parts.push(`Category: ${filters.categCode || filters.categName}`);
    if (filters.classCode || filters.className) parts.push(`Sub Category: ${filters.classCode || filters.className}`);
    if (filters.faStatus) {
        const label = FA_STATUS_OPTIONS.find((option) => option.value === filters.faStatus)?.label || filters.faStatus;
        parts.push(`FA Status: ${label}`);
    }

    return parts.length ? parts.join(" | ") : "No filters applied";
};

// ─────────────────────────────────────────────────────────────────────────────
//  Component
// ─────────────────────────────────────────────────────────────────────────────
const FAMast = () => {
    const [activeTab, setActiveTab]   = useState("setup");
    const [activeMasterDataTab, setActiveMasterDataTab] = useState("assetMaster");
    const [isLoading, setIsLoading]   = useState(false);
    const generationMode              = "Auto";     // fa_code + tag_no are system-generated on save

    const { user, currentUserRow } = useAuth();
    const userCode = user?.USER_CODE || user?.userCode || user?.code || "";

    const [form, setForm]                         = useState({ ...emptyForm });
    const [selectedFaCode, setSelectedFaCode]     = useState("");
    const [isEditing, setIsEditing]               = useState(false);

    const [masterAllRows, setMasterAllRows] = useState([]);
    const [masterRows, setMasterRows]       = useState([]);
    const [financialAllRows, setFinancialAllRows] = useState([]);
    const [financialRows, setFinancialRows]       = useState([]);

    // ── master tab filter state ───────────────────────────────────────────────
    const defaultMasterFilters = useMemo(
        () => buildEmptyMasterFilters(currentUserRow),
        [currentUserRow]
    );
    const [showMasterFilterModal, setShowMasterFilterModal] = useState(false);
    const [masterFiltersByTab, setMasterFiltersByTab] = useState(() => ({
        assetMaster: buildEmptyMasterFilters(),
        financialInfo: buildEmptyMasterFilters(),
    }));
    const activeMasterFilters = masterFiltersByTab[activeMasterDataTab] || defaultMasterFilters;

    // Reference Tab
    const refTabRef               = useRef(null);
    const [refState, setRefState] = useState({ isEditing: false, canSave: false, activeRefTab: "category" });

    // Page permissions
    const { pagePermission, isReadOnly, isFullAccess, canAdd, canEdit, canSave, canDelete } =
        usePagePermission("FAMast");

    // ── init ─────────────────────────────────────────────────────────────────
    // Records are NOT auto-loaded. The user must click Filter (SearchFAAsset)
    // and apply before any data appears in the DataTab or FinancialInfoTab.

    useEffect(() => {
        if (!defaultMasterFilters.branchCode && !defaultMasterFilters.branchName) return;

        setMasterFiltersByTab((prev) => {
            const next = { ...prev };
            ["assetMaster", "financialInfo"].forEach((tabKey) => {
                const existing = next[tabKey] || {};
                next[tabKey] = {
                    ...defaultMasterFilters,
                    ...existing,
                    branchCode: existing.branchCode || defaultMasterFilters.branchCode,
                    branchName: existing.branchName || defaultMasterFilters.branchName,
                };
            });
            return next;
        });
    }, [defaultMasterFilters.branchCode, defaultMasterFilters.branchName]);

    // No auto-load on tab switch — user must apply a filter via SearchFAAsset first.

    // ── helpers ──────────────────────────────────────────────────────────────
    const updateForm = (patch) => setForm((prev) => ({ ...prev, ...patch }));

    const updateMasterFilters = useCallback((patch, tabKey = activeMasterDataTab) => {
        setMasterFiltersByTab((prev) => ({
            ...prev,
            [tabKey]: {
                ...(prev[tabKey] || defaultMasterFilters),
                ...patch,
            },
        }));
    }, [activeMasterDataTab, defaultMasterFilters]);

    const parseSprocJsonResult = (payload) => {
        const parseJson = (value) => {
            if (typeof value !== "string") return value;
            const text = value.trim();
            if (!text) return [];

            try {
                return JSON.parse(text);
            } catch {
                return [];
            }
        };

        const getWrapperValue = (row = {}) => {
            const wrapperKeys = [
                "result", "Result", "RESULT",
                "jsonResult", "JSON_RESULT", "json_result",
                "data", "Data", "DATA",
            ];

            for (const key of wrapperKeys) {
                if (row?.[key] !== undefined && row?.[key] !== null) return row[key];
            }
            return undefined;
        };

        let value = parseJson(payload);
        if (!value) return [];

        // SQL Server FOR JSON commonly comes back as:
        // [{ result: "[{...}]" }] or [{ RESULT: "[{...}]" }]
        if (Array.isArray(value)) {
            if (value.length === 1 && value[0] && typeof value[0] === "object" && !Array.isArray(value[0])) {
                const wrapperValue = getWrapperValue(value[0]);
                if (wrapperValue !== undefined) {
                    const parsedWrapper = parseJson(wrapperValue);
                    return Array.isArray(parsedWrapper)
                        ? parsedWrapper
                        : parsedWrapper && typeof parsedWrapper === "object"
                            ? [parsedWrapper]
                            : [];
                }
            }
            return value;
        }

        if (value && typeof value === "object") {
            const wrapperValue = getWrapperValue(value);
            if (wrapperValue !== undefined && wrapperValue !== value) {
                const parsedWrapper = parseJson(wrapperValue);
                return Array.isArray(parsedWrapper)
                    ? parsedWrapper
                    : parsedWrapper && typeof parsedWrapper === "object"
                        ? [parsedWrapper]
                        : [];
            }
            return [value];
        }

        return [];
    };

    // ── load master list ──────────────────────────────────────────────────────
    const loadMasterList = async (filters = {}) => {
        setIsLoading(true);
        try {
            const filterParams = buildMasterFilterParams(filters);
            const res  = await apiClient.get("/faMast", {
                params: filterParams,
            });
            const list = parseSprocJsonResult(res?.data?.data ?? res?.data);
            setMasterAllRows(list);
            setMasterRows(filterRowsByMasterFilters(list, filters));
        } catch {
            setMasterAllRows([]);
            setMasterRows([]);
        } finally {
            setIsLoading(false);
        }
    };

    // ── load fixed asset financial information list ───────────────────────────
    const loadFinancialInfoList = async (filters = {}) => {
        setIsLoading(true);
        try {
            // GET /faMastFinancialInfo — controller reads individual query params
            // and builds the json_data body before calling the sproc.
            // Use the same /faMast route that works (already has X-Company-DB via apiClient).
            // Pass mode=FinancialInfo so the controller calls the FinancialInfo sproc mode.
            const res = await apiClient.get("/faMast", {
                params: {
                    mode:       "FinancialInfo",
                    branchCode: filters.branchCode || undefined,
                    flocCode:   filters.flocCode   || undefined,
                    rcCode:     filters.rcCode     || undefined,
                    categCode:  filters.categCode  || undefined,
                    classCode:  filters.classCode  || undefined,
                    faCode:     filters.faCode     || undefined,
                    faStatus:   filters.faStatus   || undefined,
                    search:     filters.faName     || undefined,
                    searchMode: filters.faName ? "part" : undefined,
                },
            });

            const list = parseSprocJsonResult(res?.data?.data ?? res?.data);
            setFinancialAllRows(list);
            setFinancialRows(filterRowsByMasterFilters(list, filters));
        } catch (e) {
            console.error("Failed to load Fixed Asset Financial Information", e);
            setFinancialAllRows([]);
            setFinancialRows([]);
        } finally {
            setIsLoading(false);
        }
    };

    // ── master tab header actions ─────────────────────────────────────────────
    const runActiveMasterFilter = async (filters = activeMasterFilters) => {
        if (activeMasterDataTab === "assetMaster") {
            await loadMasterList(filters);
        } else if (activeMasterDataTab === "financialInfo") {
            await loadFinancialInfoList(filters);
        }
    };

    const handleMasterFilter = () => {
        setShowMasterFilterModal(true);
    };

    const handleApplyMasterFilter = async () => {
        // FIX: Read the latest filters directly from state instead of the
        // activeMasterFilters memo, which can be stale when the modal's
        // updateFilters calls haven't caused a re-render yet.
        const latestFilters =
            masterFiltersByTab[activeMasterDataTab] || defaultMasterFilters;
        setShowMasterFilterModal(false);
        await runActiveMasterFilter(latestFilters);
    };

    const handleMasterReset = () => {
        const resetFilters = { ...defaultMasterFilters, showLookupModal: false, lookupType: "", modalType: "" };
        setMasterFiltersByTab((prev) => ({
            ...prev,
            [activeMasterDataTab]: resetFilters,
        }));

        // Clear rows — user must click Filter again to load records.
        if (activeMasterDataTab === "assetMaster") {
            setMasterAllRows([]);
            setMasterRows([]);
        } else if (activeMasterDataTab === "financialInfo") {
            setFinancialAllRows([]);
            setFinancialRows([]);
        }
    };

    // ── fetch single record ───────────────────────────────────────────────────
    const fetchItemByCode = async (faCode, enterEditMode = false) => {
        const code = String(faCode || "").trim();
        if (!code) return;

        setIsLoading(true);
        try {
            const res    = await apiClient.post("/getFAMast", { FA_CODE: code });
            const parsed = parseSprocJsonResult(res?.data?.data ?? res?.data);
            const row    = Array.isArray(parsed) ? parsed?.[0] : null;

            if (!row) {
                await useSwalErrorAlert("Info", "Asset not found.");
                return;
            }

            updateForm({ ...emptyForm, __isNew: false, ...row, faCode: code });
            setSelectedFaCode(code);
            if (enterEditMode) setIsEditing(true);
        } catch {
            await useSwalErrorAlertAPI("Fetch Error", "Failed to fetch asset.");
        } finally {
            setIsLoading(false);
        }
    };

    // ── duplicate check ───────────────────────────────────────────────────────
    const checkDuplicate = async (faCode) => {
        const code = String(faCode || "").trim();
        if (!code) return false;

        try {
            const res  = await apiClient.post("/checkFAMastDuplicate", {
                json_data: { faCode: code },
            });
            const row   = res?.data?.data?.[0];
            const isDup = String(row?.result ?? "0") === "1";
            if (isDup) {
                await useSwalErrorAlert("Duplicate", `FA Code "${code}" already exists.`);
                updateForm({ faCode: "" });
                return true;
            }
        } catch (e) {
            console.error("CheckDuplicate failed", e);
        }
        return false;
    };

    // ── in-use check ──────────────────────────────────────────────────────────
    const checkInUsed = async (faCode) => {
        const code = String(faCode || "").trim();
        if (!code) return false;

        try {
            const res   = await apiClient.post("/checkFAMastInUsed", {
                json_data: { faCode: code },
            });
            const row    = res?.data?.data?.[0];
            const isUsed =
                String(row?.result ?? row?.isInUsed ?? row?.isinused ?? "0") === "1" ||
                Number(row?.isInUsed ?? row?.isinused ?? row?.inusedcount ?? 0) > 0;

            if (isUsed) {
                await useSwalErrorAlert(
                    "Cannot Delete",
                    `FA Code "${code}" is currently in use and cannot be deleted.`
                );
                return true;
            }
        } catch (e) {
            console.error("CheckInUsed failed", e);
        }
        return false;
    };

    // ── delete ────────────────────────────────────────────────────────────────
    const deleteItem = async () => {
        if (!canDelete) {
            await useSwalErrorAlert("Read Only", "You are not allowed to delete records.");
            return;
        }

        const code = String(form?.faCode || "").trim();
        if (!code) return;

        const inUse = await checkInUsed(code);
        if (inUse) return;

        const confirm = await useSwalDeleteConfirm("Delete Asset?", `Delete FA Code "${code}"?`);
        if (!confirm?.isConfirmed) return;

        setIsLoading(true);
        try {
            const res = await apiClient.post("/deleteFAMast", {
                json_data: { faCode: code, userCode },
            });

            const sqlRow = res?.data?.data?.[0];
            if (sqlRow?.errorcount > 0 || sqlRow?.errorCount > 0) {
                await useSwalErrorAlert("Delete Failed", sqlRow?.errormsg || sqlRow?.errorMsg);
                return;
            }

            await useSwalDeleteRecord("Deleted", `FA Code "${code}" removed.`);
            handleResetSetup();
            await loadMasterList();
        } catch (e) {
            await useSwalErrorAlert("Delete Failed", e?.message || "Failed to delete asset.");
        } finally {
            setIsLoading(false);
        }
    };

    // ── upsert ────────────────────────────────────────────────────────────────
    const upsertItem = async () => {
        if (!canSave) {
            await useSwalErrorAlert("Read Only", "You are not allowed to save changes.");
            return;
        }

        // For system-generated mode the code is empty on new records — the sproc
        // will pull the next number from fa_no and return it as generatedCode.
        const code = String(form?.faCode || "").trim();

        setIsLoading(true);
        try {
            const payload = {
                json_data: JSON.stringify({
                    json_data: {
                    faCode:             code || null,   // null on new → server generates
                    faName:             form.faName              || null,
                    categCode:          form.categCode           || null,
                    classCode:          form.classCode           || null,
                    flocCode:           form.flocCode            || null,
                    branchCode:         form.branchCode          || null,
                    farrId:             form.farrId              || null,
                    farrNo:             form.farrNo              || null,
                    groupId:            form.groupId             || null,
                    serialGroupId:      form.serialGroupId       || null,
                    poId:               form.poId                || null,
                    poNo:               form.poNo                || null,
                    vendCode:           form.vendCode            || null,
                    vendName:           form.vendName            || null,
                    serialNo:           form.serialNo            || null,
                    modelNo:            form.modelNo             || null,
                    barCode:            form.barCode             || null,
                    tagNo:              form.tagNo               || null,
                    oldCode:            form.oldCode             || null,
                    rrNo:               form.rrNo                || null,
                    rcCode:             form.rcCode              || null,
                    empNo:              form.empNo               || null,
                    empName:            form.empName             || null,
                    faSpecs:            form.faSpecs             || null,
                    refNo1:             form.refNo1              || null,
                    refNo2:             form.refNo2              || null,
                    faStatus:           form.faStatus            || "A",
                    cutoffCode:         form.cutoffCode          || null,
                    gcutoffCode:        form.gcutoffCode         || null,
                    tranMode:           form.tranMode            || "S",
                    acqDate:            form.acqDate             || null,
                    currCode:           form.currCode            || "PHP",
                    currRate:           form.currRate            || "1.000000",
                    eul:                form.eul                 || null,
                    rul:                form.rul                 || null,
                    dcutoffCode:        form.dcutoffCode         || null,
                    acqCost:            form.acqCost             || null,
                    acqCostFx1:         form.acqCostFx1          || null,
                    acqCostFx2:         form.acqCostFx2          || null,
                    accumDepr:          form.accumDepr           || null,
                    accumDeprFx1:       form.accumDeprFx1        || null,
                    accumDeprFx2:       form.accumDeprFx2        || null,
                    deprMonth:          form.deprMonth           || null,
                    deprMonthFx1:       form.deprMonthFx1        || null,
                    deprMonthFx2:       form.deprMonthFx2        || null,
                    nbValue:            form.nbValue             || null,
                    nbValueFx1:         form.nbValueFx1          || null,
                    nbValueFx2:         form.nbValueFx2          || null,
                    warrantyStartDate:  form.warrantyStartDate   || null,
                    warrantyExpiryDate: form.warrantyExpiryDate  || null,
                    warrantyMonths:     form.warrantyMonths      || null,
                    warrantyNotes:      form.warrantyNotes       || null,
                    userCode:           userCode                 || null,
                    },
                }),
            };

            const res = await apiClient.post("/upsertFAMast", payload);

            // FIX 2: check top-level success flag from the PHP controller first,
            // then fall through to the sproc-level errorcount check.
            if (!res?.data?.success) {
                const msg =
                    res?.data?.errormsg ||
                    res?.data?.message  ||
                    res?.data?.data?.[0]?.errormsg ||
                    "Validation error.";
                await useSwalErrorAlert("Validation Failed", msg);
                return;
            }

            const sqlRow = res?.data?.data?.[0];
            if (sqlRow?.errorcount > 0 || sqlRow?.errorCount > 0) {
                await useSwalErrorAlert("Validation Failed", sqlRow?.errormsg || sqlRow?.errorMsg);
                return;
            }

            // On new records the sproc returns the system-generated fa_code
            const finalCode = sqlRow?.generatedCode || sqlRow?.generatedcode || code;

            await useSwalSuccessAlert("Success!", "Asset saved successfully.");
            setSelectedFaCode(finalCode);
            setIsEditing(false);
            await loadMasterList();
            await fetchItemByCode(finalCode);

        } catch (e) {
            // FIX 3: surface the real error message instead of swallowing it.
            const msg =
                e?.response?.data?.message ||
                e?.response?.data?.errormsg ||
                e?.message ||
                "Failed to save asset.";
            await useSwalErrorAlertAPI("Save Failed", msg);
        } finally {
            setIsLoading(false);
        }
    };

    // ── toolbar handlers ──────────────────────────────────────────────────────
    const handleAdd = async () => {
        if (!canAdd) {
            await useSwalErrorAlert("Read Only", "You only have read access.");
            return;
        }
        setSelectedFaCode("");
        setForm({ ...emptyForm, __isNew: true });
        setIsEditing(true);
        setActiveTab("setup");
    };

    const handleEdit = async () => {
        if (!canEdit) {
            await useSwalErrorAlert("Read Only", "You are not allowed to edit records.");
            return;
        }
        if (!form?.faCode) {
            await useSwalErrorAlert("Required", "Select an asset first.");
            return;
        }
        setIsEditing(true);
        setActiveTab("setup");
    };

    const handleResetSetup = () => {
        setSelectedFaCode("");
        setForm({ ...emptyForm });
        setIsEditing(false);
    };

    const normalizeFinancialRowToSetup = (row = {}) => ({
        ...row,
        flocName: row.flocName || row.locName || "",
        accumDepr: row.accumDepr ?? row.accumulatedDepreciation ?? "0.00",
        deprMonth: row.deprMonth ?? row.depr_month ?? "0.00",
        __isNew: false,
    });

    // ── tabs ──────────────────────────────────────────────────────────────────
    const tabs = [
        { id: "setup",  label: "Asset Masterfile Set Up", icon: faFolderOpen },
        { id: "master", label: "Asset Master Data",        icon: faList       },
        { id: "ref",    label: "Reference Codes",          icon: faTags       },
    ];

    const masterDataTabs = [
        { id: "assetMaster",   label: "Fixed Asset Master Data",            icon: faTable },
        { id: "financialInfo", label: "Fixed Asset Financial Information",  icon: faChartLine },
    ];

    const masterFilterContext = useMemo(
        () => buildMasterFilterContext(activeMasterFilters),
        [activeMasterFilters]
    );

    // ── header buttons ────────────────────────────────────────────────────────
    const headerButtons = useMemo(() => {
        const baseBtn = "flex items-center justify-center h-8 w-8 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md transition-all shadow-sm text-white";

        if (activeTab === "setup") {
            const hasRecord = String(form?.faCode || "").trim() && !form.__isNew;

            return [
                {
                    key: "add",
                    label: <span className="hidden sm:inline ml-1">Add</span>,
                    icon: faPlus,
                    onClick: handleAdd,
                    disabled: isLoading || !canAdd,
                    className: `${baseBtn} ${!canAdd ? "bg-blue-400 cursor-not-allowed opacity-50" : "bg-blue-600 hover:bg-blue-700"}`,
                },
                {
                    key: "save",
                    label: <span className="hidden sm:inline ml-1">Save</span>,
                    icon: faSave,
                    onClick: upsertItem,
                    disabled: isLoading || !isEditing || !canSave,
                    className: `${baseBtn} ${!isEditing || !canSave ? "bg-blue-400 cursor-not-allowed opacity-50" : "bg-blue-600 hover:bg-blue-700"}`,
                },
                {
                    key: "reset",
                    label: <span className="hidden sm:inline ml-1">Reset</span>,
                    icon: faUndo,
                    onClick: handleResetSetup,
                    disabled: isLoading,
                    className: `${baseBtn} bg-blue-600 hover:bg-blue-700`,
                },
                {
                    key: "edit",
                    label: <span className="hidden sm:inline ml-1">Edit</span>,
                    icon: faPenToSquare,
                    onClick: handleEdit,
                    disabled: isLoading || isEditing || !hasRecord || !canEdit,
                    className: `${baseBtn} ${isEditing || !hasRecord || !canEdit ? "bg-blue-400 cursor-not-allowed opacity-50" : "bg-blue-600 hover:bg-blue-700"}`,
                },
                {
                    key: "delete",
                    label: <span className="hidden sm:inline ml-1">Delete</span>,
                    icon: faTrash,
                    onClick: deleteItem,
                    disabled: isLoading || isEditing || !hasRecord || !canDelete,
                    className: `${baseBtn} ${isEditing || !hasRecord || !canDelete ? "bg-red-400 cursor-not-allowed opacity-50" : "bg-red-500 hover:bg-red-600"}`,
                },
            ];
        }

        if (activeTab === "master") {
            return [
                {
                    key: "filter",
                    label: <span className="hidden sm:inline ml-1">Filter</span>,
                    icon: faMagnifyingGlass,
                    onClick: handleMasterFilter,
                    disabled: isLoading,
                    className: `${baseBtn} bg-blue-600 hover:bg-blue-700`,
                },
                {
                    key: "reset",
                    label: <span className="hidden sm:inline ml-1">Reset</span>,
                    icon: faUndo,
                    onClick: handleMasterReset,
                    disabled: isLoading,
                    className: `${baseBtn} bg-blue-600 hover:bg-blue-700`,
                },
            ];
        }

        if (activeTab === "ref") {
            return [
                {
                    key: "add",
                    label: <span className="hidden sm:inline ml-1">Add</span>,
                    icon: faPlus,
                    onClick: async () => {
                        if (isReadOnly) {
                            await useSwalErrorAlert("Read Only", "You only have read access.");
                            return;
                        }
                        refTabRef.current?.add?.();
                    },
                    disabled: !canAdd,
                    className: `${baseBtn} ${!canAdd ? "bg-blue-400 cursor-not-allowed opacity-50" : "bg-blue-600 hover:bg-blue-700"}`,
                },
                {
                    key: "save",
                    label: <span className="hidden sm:inline ml-1">Save</span>,
                    icon: faSave,
                    onClick: async () => {
                        if (isReadOnly) {
                            await useSwalErrorAlert("Read Only", "You are not allowed to save changes.");
                            return;
                        }
                        refTabRef.current?.save?.();
                    },
                    disabled: !refState.canSave || !canSave,
                    className: `${baseBtn} ${!refState.canSave || !canSave ? "bg-blue-400 cursor-not-allowed opacity-50" : "bg-blue-600 hover:bg-blue-700"}`,
                },
                {
                    key: "reset",
                    label: <span className="hidden sm:inline ml-1">Reset</span>,
                    icon: faUndo,
                    onClick: () => refTabRef.current?.reset?.(),
                    className: `${baseBtn} bg-blue-600 hover:bg-blue-700`,
                },
            ];
        }

        return [];
    }, [activeTab, activeMasterDataTab, isLoading, isEditing, form, refState, activeMasterFilters, isReadOnly, canAdd, canEdit, canSave, canDelete, handleMasterFilter, handleMasterReset]);

    // ── render ────────────────────────────────────────────────────────────────
    return (
        <div className="global-ref-main-div-ui">
            <div className="global-ref-header-ui">
                <div className="w-full flex flex-col lg:flex-row items-center justify-between gap-3">

                    {/* LEFT: title + tabs */}
                    <div className="flex flex-col lg:flex-row items-center lg:items-center gap-2 lg:gap-4 w-full lg:w-auto">
                        <div className="flex-shrink-0 text-center lg:text-left">
                            <h1 className="global-ref-headertext-ui truncate">Fixed Asset Master Data</h1>
                        </div>

                        <div className="overflow-x-auto no-scrollbar">
                            <div className="flex flex-nowrap border-b border-blue-300">
                                {tabs.map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`shrink-0 px-3 py-1 sm:py-2 sm:px-4 text-[10px] sm:text-[13px] font-bold border-b-2 rounded-md ${
                                            activeTab === tab.id
                                                ? "border-blue-700 text-blue-700 bg-blue-50"
                                                : "border-transparent text-gray-500 hover:text-blue-500"
                                        }`}
                                    >
                                        <FontAwesomeIcon icon={tab.icon} className="mr-1.5" />
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: permission badge + buttons */}
                    <div className="flex-shrink-0 w-full lg:w-auto flex flex-wrap items-center justify-center lg:justify-end gap-1.5">
                        <PermissionBadge
                            permission={pagePermission}
                            isReadOnly={isReadOnly}
                            isFullAccess={isFullAccess}
                        />
                        {!!headerButtons.length && <ButtonBar buttons={headerButtons} />}
                    </div>
                </div>
            </div>

            <div className="global-tran-tab-div-ui mt-36 sm:mt-32 md:mt-28 lg:mt-24" style={{ minHeight: "calc(100vh - 170px)" }}>

                {activeTab === "setup" && (
                    <FAMast_SetupTab
                        form={form}
                        isEditing={isEditing && isFullAccess}
                        isReadOnly={isReadOnly}
                        isLoading={isLoading}
                        generationMode={generationMode}
                        onChangeForm={updateForm}
                        onLookupSelect={(faCode) => fetchItemByCode(faCode, false)}
                        onBlurFaCode={isReadOnly ? undefined : checkDuplicate}
                    />
                )}

                {activeTab === "master" && (
                    <div className="flex flex-col h-full gap-3">
                        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
                            {masterDataTabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveMasterDataTab(tab.id)}
                                    className={`px-3 py-2 text-[11px] sm:text-[13px] font-bold rounded-md border transition-all ${
                                        activeMasterDataTab === tab.id
                                            ? "bg-blue-50 text-blue-700 border-blue-300 shadow-sm"
                                            : "bg-white text-slate-500 border-slate-200 hover:text-blue-600 hover:border-blue-200"
                                    }`}
                                >
                                    <FontAwesomeIcon icon={tab.icon} className="mr-1.5" />
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-2 rounded-md border border-blue-100 bg-blue-50/70 px-3 py-2 text-[11px] font-medium text-slate-600 sm:text-xs">
                            <FontAwesomeIcon icon={faFilter} className="text-blue-600" />
                            <span className="truncate">{masterFilterContext}</span>
                        </div>

                        {activeMasterDataTab === "assetMaster" && (
                            <FAMast_DataTab
                                rows={masterRows}
                                isLoading={isLoading}
                                userCode={userCode}
                                onRowDoubleClick={async (row) => {
                                    await fetchItemByCode(row.faCode, canEdit);
                                    setActiveTab("setup");
                                }}
                            />
                        )}

                        {activeMasterDataTab === "financialInfo" && (
                            <FAMast_FinancialInfoTab
                                data={financialRows}
                                isLoading={isLoading}
                                onRowDoubleClick={async (row) => {
                                    const code = String(row?.faCode || "").trim();
                                    if (!code) return;

                                    // Immediately place the selected financial info in SetupTab,
                                    // then refresh from Get mode to keep all Setup fields complete.
                                    updateForm({
                                        ...emptyForm,
                                        ...normalizeFinancialRowToSetup(row),
                                        faCode: code,
                                    });
                                    setSelectedFaCode(code);

                                    await fetchItemByCode(code, canEdit);
                                    setActiveTab("setup");
                                }}
                            />
                        )}
                    </div>
                )}

                {activeTab === "ref" && (
                    <FAMast_ReferenceCodeTab
                        ref={refTabRef}
                        onStateChange={setRefState}
                        isReadOnly={isReadOnly}
                        canAdd={canAdd}
                        canEdit={canEdit}
                        canSave={canSave}
                        canDelete={canDelete}
                    />
                )}

            </div>

            {showMasterFilterModal && (
                <FAMastFilterModal
                    tabLabel={masterDataTabs.find((tab) => tab.id === activeMasterDataTab)?.label || "Fixed Asset Master Data"}
                    filters={activeMasterFilters}
                    onClose={() => setShowMasterFilterModal(false)}
                    onApply={handleApplyMasterFilter}
                    updateFilters={updateMasterFilters}
                    isLoading={isLoading}
                />
            )}

            <FAMastLookupManager
                filters={activeMasterFilters}
                updateFilters={updateMasterFilters}
            />
        </div>
    );
};

const FAMastFilterModal = ({
    tabLabel,
    filters,
    onClose,
    onApply,
    updateFilters,
    isLoading,
}) => {
    const clearCategoryAndClass = () =>
        updateFilters({
            categCode: "",
            categName: "",
            classCode: "",
            className: "",
        });

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2 backdrop-blur-[1px] sm:p-3"
            onClick={onClose}
        >
            <div
                className="flex max-h-[84vh] w-full max-w-[95vw] flex-col overflow-hidden rounded-lg bg-white shadow-2xl sm:max-h-[88vh] sm:max-w-4xl sm:rounded-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b bg-gradient-to-r from-blue-50 to-white px-3 py-2.5 sm:px-4 sm:py-3">
                    <h3 className="flex items-center gap-2 truncate text-sm font-semibold text-gray-800 sm:text-base">
                        <FontAwesomeIcon icon={faFilter} className="text-[13px] text-blue-600 sm:text-sm" />
                        <span>Filters - {tabLabel}</span>
                    </h3>

                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1 text-gray-500 transition hover:text-gray-800"
                        disabled={isLoading}
                    >
                        <FontAwesomeIcon icon={faTimes} className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </button>
                </div>

                <div className="space-y-2.5 overflow-y-auto p-2.5 sm:space-y-3 sm:p-4">
                    <FAMastFilterSection title="Asset Identifiers">
                        <FAMastDualFilterInput
                            labelCode="Branch Code"
                            labelName="Branch Name"
                            codeValue={filters.branchCode}
                            nameValue={filters.branchName}
                            modalType="branch"
                            updateFilters={updateFilters}
                            disabled={isLoading}
                            onClear={() => updateFilters({ branchCode: "", branchName: "", flocCode: "", flocName: "" })}
                        />

                        <FAMastDualFilterInput
                            labelCode="Category Code"
                            labelName="FA Category"
                            codeValue={filters.categCode}
                            nameValue={filters.categName}
                            modalType="category"
                            updateFilters={updateFilters}
                            disabled={isLoading}
                            onClear={clearCategoryAndClass}
                        />

                        <FAMastDualFilterInput
                            labelCode="Class Code"
                            labelName="Sub Category"
                            codeValue={filters.classCode}
                            nameValue={filters.className}
                            modalType="class"
                            updateFilters={updateFilters}
                            disabled={isLoading}
                            onClear={() => updateFilters({ classCode: "", className: "" })}
                        />

                        <FAMastDualFilterInput
                            labelCode="Asset Code"
                            labelName="Asset Name"
                            codeValue={filters.faCode}
                            nameValue={filters.faName}
                            modalType="asset"
                            updateFilters={updateFilters}
                            disabled={isLoading}
                            onClear={() => updateFilters({ faCode: "", faName: "" })}
                        />
                    </FAMastFilterSection>

                    <FAMastFilterSection title="Assignments">
                        <FAMastDualFilterInput
                            labelCode="Location Code"
                            labelName="Location Name"
                            codeValue={filters.flocCode}
                            nameValue={filters.flocName}
                            modalType="location"
                            updateFilters={updateFilters}
                            disabled={isLoading}
                            onClear={() => updateFilters({ flocCode: "", flocName: "" })}
                        />

                        <FAMastDualFilterInput
                            labelCode="Department Code"
                            labelName="Department Name"
                            codeValue={filters.rcCode}
                            nameValue={filters.rcName}
                            modalType="dept"
                            updateFilters={updateFilters}
                            disabled={isLoading}
                            onClear={() => updateFilters({ rcCode: "", rcName: "" })}
                        />
                    </FAMastFilterSection>

                    <FAMastFilterSection title="FA Status">
                        <FieldRenderer
                            id="faStatus"
                            label="FA Status"
                            type="select"
                            value={filters.faStatus || ""}
                            disabled={isLoading}
                            onChange={(value) => updateFilters({ faStatus: value })}
                            options={FA_STATUS_OPTIONS}
                        />
                    </FAMastFilterSection>
                </div>

                <div className="border-t bg-gray-50 px-3 py-2.5 sm:px-4">
                    <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border bg-white px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-100 sm:min-w-[110px] sm:w-auto"
                            disabled={isLoading}
                        >
                            <FontAwesomeIcon icon={faTimes} className="h-3.5 w-3.5" />
                            Close
                        </button>

                        <button
                            type="button"
                            onClick={onApply}
                            className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-blue-700 disabled:opacity-60 sm:min-w-[110px] sm:w-auto"
                            disabled={isLoading}
                        >
                            <FontAwesomeIcon icon={faMagnifyingGlass} className="h-3.5 w-3.5" />
                            Apply
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const FAMastFilterSection = ({ title, children }) => (
    <div className="rounded-lg border bg-slate-50/60 p-3 shadow-sm">
        <p className="mb-2 text-sm font-semibold text-gray-700">{title}</p>
        <div className="grid grid-cols-1 gap-2">{children}</div>
    </div>
);

const FAMastDualFilterInput = ({
    labelCode,
    labelName,
    codeValue,
    nameValue,
    modalType,
    updateFilters,
    disabled,
    onClear,
    allowClear = true,
}) => {
    const codeId = `${modalType}_code`;
    const nameId = `${modalType}_name`;

    const openLookup = () => {
        if (disabled) return;
        updateFilters({
            showLookupModal: true,
            lookupType: codeId,
            modalType,
        });
    };

    return (
        <div className="grid grid-cols-1 items-start gap-2 md:grid-cols-12">
            <div className="md:col-span-4">
                <FieldRenderer
                    id={codeId}
                    label={labelCode}
                    type="lookup"
                    value={codeValue || ""}
                    disabled={disabled}
                    readOnly
                    editableLookup={allowClear}
                    onLookup={openLookup}
                    onClear={allowClear ? onClear : undefined}
                    labelClassName="text-[10px] sm:text-xs"
                />
            </div>

            <div className="md:col-span-8">
                <FieldRenderer
                    id={nameId}
                    label={labelName}
                    type="text"
                    value={nameValue || ""}
                    disabled
                    readOnly
                    labelClassName="text-[10px] sm:text-xs"
                />
            </div>
        </div>
    );
};

const FAMastLookupManager = ({ filters, updateFilters }) => {
    const { showLookupModal, modalType } = filters || {};

    if (!showLookupModal) return null;

    const close = () => {
        updateFilters({ showLookupModal: false, lookupType: "", modalType: "" });
    };

    switch (modalType) {
        case "branch":
            return (
                <SearchBranchRef
                    isOpen={showLookupModal}
                    onClose={(row) => {
                        if (row) {
                            updateFilters({
                                branchCode: row.branchCode || row.BRANCH_CODE || "",
                                branchName: row.branchName || row.BRANCH_NAME || "",
                                flocCode: "",
                                flocName: "",
                            });
                        }
                        close();
                    }}
                />
            );

        case "category":
            return (
                <SearchFACateg
                    isOpen={showLookupModal}
                    onClose={(row) => {
                        if (row) {
                            updateFilters({
                                categCode: row.code || row.categCode || row.categoryCode || row.CATEG_CODE || "",
                                categName: row.description || row.categName || row.categoryName || row.CATEG_NAME || "",
                                classCode: "",
                                className: "",
                            });
                        }
                        close();
                    }}
                />
            );

        case "class":
            return (
                <SearchFAClass
                    isOpen={showLookupModal}
                    categCode={filters.categCode}
                    onClose={(row) => {
                        if (row) {
                            updateFilters({
                                classCode: row.code || row.classCode || row.CLASS_CODE || "",
                                className: row.description || row.className || row.assetSubCategory || row.CLASS_NAME || "",
                                categCode: row.categCode || row.categ_code || row.categoryCode || filters.categCode || "",
                            });
                        }
                        close();
                    }}
                />
            );

        case "asset":
            return (
                <SearchFAAsset
                    isOpen={showLookupModal}
                    title="Fixed Asset Master"
                    branchCode={filters.branchCode}
                    activeOnly={false}
                    onClose={(row) => {
                        if (row) {
                            updateFilters({
                                faCode: row.faCode || row.FA_CODE || "",
                                faName: row.faName || row.FA_NAME || row.assetDescription || "",
                            });
                        }
                        close();
                    }}
                />
            );

        case "location":
            return (
                <SearchFALoc
                    isOpen={showLookupModal}
                    branchCode={filters.branchCode}
                    onClose={(row) => {
                        if (row) {
                            updateFilters({
                                flocCode: row.code || row.flocCode || row.floc_code || row.FLOC_CODE || "",
                                flocName: row.description || row.flocName || row.floc_name || row.FLOC_NAME || "",
                            });
                        }
                        close();
                    }}
                />
            );

        case "dept":
            return (
                <SearchRCMast
                    isOpen={showLookupModal}
                    onClose={(row) => {
                        if (row) {
                            updateFilters({
                                rcCode: row.rcCode || row.RC_CODE || "",
                                rcName: row.rcName || row.RC_NAME || "",
                            });
                        }
                        close();
                    }}
                />
            );

        default:
            close();
            return null;
    }
};

export default FAMast;