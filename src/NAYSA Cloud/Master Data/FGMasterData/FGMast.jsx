import React, { useEffect, useMemo, useState, useRef } from "react";
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
} from "@fortawesome/free-solid-svg-icons";

import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import ButtonBar from "@/NAYSA Cloud/Global/ButtonBar";
import { usePagePermission } from "@/NAYSA Cloud/Global/usePagePermission.js";
import PermissionBadge from "@/NAYSA Cloud/Global/PermissionBadge.jsx";
import FGMast_SetupTab from "./FGMast_SetupTab.jsx";
import FGMast_DataTab from "./FGMast_DataTab.jsx";
import FGMast_ReferenceCodeTab from "./FGMast_ReferenceCodeTab.jsx";

import {
    useSwalErrorAlert,
    useSwalSuccessAlert,
    useSwalErrorAlertAPI,
    useSwalDeleteConfirm,
    useSwalDeleteRecord
} from "@/NAYSA Cloud/Global/behavior.jsx";

const emptyForm = {
    itemCode: "",
    itemDesc: "",
    uom: "", uomName: "",
    uom2: "",
    qtyPerUom2: "0.000000",
    categoryCode: "", categoryName: "",
    classCode: "", className: "",
    active: "Y",
    status: "New",

    subClass1Code: "", subClass1Name: "",
    subClass2Code: "", subClass2Name: "",
    subClass3Code: "", subClass3Name: "",
    vacant07: "", vacant08: "", vacant09: "",
    vacant10: "", vacant11: "", vacant12: "",

    reOrderLevel: "0.000",
    sellingPrice: "0.0000",
    stdPoPrice: "0.000000",
    planType: "Purchased",
    shelfLife: "0",
    minOrderQty: "0.00",
    maxOrderQty: "0.00",
    stdPackingQty: "0.00",
    purchasingLeadTime: "0",
    productionLeadTime: "0",

    lastPurDate: "",
    lastPurPrice: "0.000000",
    allowOverRec: "N",
    qtyOnHand: "0.000",
    unitCost: "0.000000",

    stdUnitCost: "0.00",
    stdDlCost: "0.00",
    stdFohCost: "0.00",
    stdOsCost: "0.00",
    stdDmCost: "0.00",

    barcode: "",
    altItemCode: "",
    altItemDesc: "",
    itemDesc2: "",
    itemDesc3: "",
    payeeCode: "", payeeName: "",

    registeredBy: "", registeredDate: "",
    updatedBy: "", updatedDate: "",
    __isNew: false,
};

const FGMast = () => {
    const [activeTab, setActiveTab] = useState("setup");
    const [isLoading, setIsLoading] = useState(false);
    const generationMode = "Manual";

    const { user } = useAuth();
    const userCode = user?.USER_CODE || user?.userCode || user?.code || "";

    const {
        pagePermission,
        isReadOnly,
        isFullAccess,
        canAdd,
        canEdit,
        canSave,
        canDelete,
    } = usePagePermission({
        componentKey: "FGMast",
        menuName: "FG Master Data",
        debug: true,
    });

    const [form, setForm] = useState({ ...emptyForm });
    const [selectedItemCode, setSelectedItemCode] = useState("");
    const [isEditing, setIsEditing] = useState(false);

    const [masterAllRows, setMasterAllRows] = useState([]);
    const [masterRows, setMasterRows] = useState([]);

    // Reference Tab State
    const refTabRef = useRef(null);
    const [refState, setRefState] = useState({ isEditing: false, canSave: false });

    useEffect(() => {
        loadMasterList();
    }, []);

    const updateForm = (patch) => {
        setForm((prev) => ({ ...prev, ...patch }));
    };

    const parseSprocJsonResult = (rows) => {
        if (!rows) return [];
        const r = rows?.[0]?.result;
        if (typeof r === "string") {
            try { return JSON.parse(r); } catch { return []; }
        }
        if (Array.isArray(rows) && rows.length && typeof rows[0] === "object") return rows;
        return [];
    };

    const loadMasterList = async () => {
        setIsLoading(true);
        try {
            const res = await apiClient.get("/fgMast");
            const list = parseSprocJsonResult(res?.data?.data);
            setMasterAllRows(list);
            setMasterRows(list);
        } catch (e) {
            setMasterAllRows([]);
            setMasterRows([]);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchItemByCode = async (itemCode, enterEditMode = false) => {
        const code = String(itemCode || "").trim();
        if (!code) return;

        setIsLoading(true);
        try {
            const res = await apiClient.post("/getFGMast", { ITEM_CODE: code });
            const parsed = parseSprocJsonResult(res?.data?.data);
            const row = Array.isArray(parsed) ? parsed?.[0] : null;

            if (!row) {
                await useSwalErrorAlert("Info", "Item not found.");
                return;
            }

            updateForm({
                ...emptyForm,
                __isNew: false,
                ...row,
                itemCode: code,
            });

            setSelectedItemCode(code);
            if (enterEditMode) setIsEditing(true);
        } catch (e) {
            await useSwalErrorAlertAPI("Fetch Error", "Failed to fetch item.");
        } finally {
            setIsLoading(false);
        }
    };

    // ── Check Duplicate ───────────────────────────────────────────────────────
    // Calls sproc CheckDuplicate mode. Returns true if duplicate found.
    // Response: { result: "1" } = duplicate, { result: "0" } = OK.
    const checkDuplicate = async (itemCode) => {
        const code = String(itemCode || "").trim();
        if (!code) return false;

        try {
            const res = await apiClient.post("/checkDuplicateFGMast", {
                json_data: { itemCode: code },
            });
            const row = res?.data?.data?.[0];
            // Sproc returns: select ... result = '1' or '0'
            const isDup = String(row?.result ?? row?.isDuplicate ?? row?.isdup ?? "0") === "1"
                || Number(row?.isDuplicate ?? row?.isdup ?? row?.duplicatecount ?? 0) > 0;
            if (isDup) {
                await useSwalErrorAlert("Duplicate", `Item No "${code}" already exists.`);
                updateForm({ itemCode: "" });
                return true;
            }
        } catch (e) {
            console.error("CheckDuplicate failed", e);
        }
        return false;
    };

    // ── Check In Used ─────────────────────────────────────────────────────────
    // Calls sproc CheckInUsed mode. Returns true if item is referenced in transactions.
    // Response: { result: "1" } = in use, { result: "0" } = safe to delete.
    const checkInUsed = async (itemCode) => {
        const code = String(itemCode || "").trim();
        if (!code) return false;

        try {
            const res = await apiClient.post("/checkInUsedFGMast", {
                json_data: { itemCode: code },
            });
            const row = res?.data?.data?.[0];
            // Sproc returns: select ... result = '1' or '0'
            const isUsed = String(row?.result ?? row?.isInUsed ?? row?.isinused ?? "0") === "1"
                || Number(row?.isInUsed ?? row?.isinused ?? row?.inusedcount ?? 0) > 0;
            if (isUsed) {
                await useSwalErrorAlert(
                    "Cannot Delete",
                    `Item No "${code}" is currently in use and cannot be deleted.`
                );
                return true;
            }
        } catch (e) {
            console.error("CheckInUsed failed", e);
        }
        return false;
    };

    const deleteItem = async () => {
        if (!canDelete) {
            await useSwalErrorAlert("Read Only", "You are not allowed to delete this item.");
            return;
        }

        const code = String(form?.itemCode || "").trim();
        if (!code) return;

        // Check in-use before showing delete confirmation
        const inUse = await checkInUsed(code);
        if (inUse) return;

        const confirm = await useSwalDeleteConfirm("Delete Item?", `Delete Item No ${code}?`);
        if (!confirm?.isConfirmed) return;

        setIsLoading(true);
        try {
            // Sproc Delete mode handles in-use guard + audit trail on the SQL side
            const payload = {
                json_data: { itemCode: code, userCode },
            };
            const res = await apiClient.post("/deleteFGMast", payload);

            const sqlRow = res?.data?.data?.[0];
            if (sqlRow?.errorcount > 0 || sqlRow?.errorCount > 0) {
                await useSwalErrorAlert("Delete Failed", sqlRow?.errormsg || sqlRow?.errorMsg);
                return;
            }

            await useSwalDeleteRecord("Deleted", `Item No ${code} removed.`);
            handleResetSetup();
            await loadMasterList();
        } catch (e) {
            await useSwalErrorAlert("Delete Failed", e?.message || "Failed to delete item.");
        } finally {
            setIsLoading(false);
        }
    };

    const upsertItem = async () => {
        if (!canSave) {
            await useSwalErrorAlert("Read Only", "You are not allowed to save this item.");
            return;
        }

        const code = String(form?.itemCode || "").trim();

        // Extra duplicate guard on save for new records
        if (!selectedItemCode) {
            const isDup = await checkDuplicate(code);
            if (isDup) return;
        }

        setIsLoading(true);
        try {
            // FIX: pass json_data as a plain object — do NOT JSON.stringify it.
            // The sproc reads fields via json_value(@params, '$.json_data.*'),
            // so the API must receive a real nested JSON object, not a string.
            const payload = {
                json_data: {
                    ...form,
                    action: selectedItemCode ? "edit" : "add",
                    userCode,
                },
            };

            const res = await apiClient.post("/upsertFGMast", payload);

            const sqlRow = res?.data?.data?.[0];
            if (sqlRow?.errorcount > 0 || sqlRow?.errorCount > 0) {
                await useSwalErrorAlert("Validation Failed", sqlRow?.errormsg || sqlRow?.errorMsg);
                return;
            }

            const finalCode = sqlRow?.generatedCode || sqlRow?.generatedcode || code;

            await useSwalSuccessAlert("Success!", "Item saved successfully.");
            setSelectedItemCode(finalCode);
            setIsEditing(false);
            await loadMasterList();
            await fetchItemByCode(finalCode);
        } catch (e) {
            await useSwalErrorAlert("Save Failed", "Failed to save item.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleAdd = async () => {
        if (!canAdd) {
            await useSwalErrorAlert("Read Only", "You are not allowed to add items.");
            return;
        }

        setSelectedItemCode("");
        setForm({ ...emptyForm, __isNew: true });
        setIsEditing(true);
        setActiveTab("setup");
    };

    const handleEdit = async () => {
        if (!canEdit) {
            await useSwalErrorAlert("Read Only", "You are not allowed to edit this item.");
            return;
        }

        if (!form?.itemCode) {
            await useSwalErrorAlert({ title: "Required", message: "Select an Item first." });
            return;
        }
        setIsEditing(true);
        setActiveTab("setup");
    };

    const handleResetSetup = () => {
        setSelectedItemCode("");
        setForm({ ...emptyForm });
        setIsEditing(false);
    };

    const tabs = [
        { id: "setup", label: "Item Masterfile Set Up", icon: faFolderOpen },
        { id: "master", label: "Item Master Data", icon: faList },
        { id: "ref", label: "Reference Codes", icon: faTags },
    ];

    const headerButtons = useMemo(() => {
        const baseBtn = "flex items-center justify-center h-8 w-8 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md transition-all shadow-sm text-white";

        if (activeTab === "setup") {
            const hasRecord = String(form?.itemCode || "").trim() && !form.__isNew;
            return [
                { key: "add",    label: <span className="hidden sm:inline ml-1">Add</span>,    icon: faPlus,        onClick: handleAdd,        disabled: isLoading || !canAdd,                              className: `${baseBtn} ${!canAdd ? "bg-blue-400 cursor-not-allowed opacity-50" : "bg-blue-600 hover:bg-blue-700"}` },
                { key: "save",   label: <span className="hidden sm:inline ml-1">Save</span>,   icon: faSave,        onClick: upsertItem,       disabled: isLoading || !isEditing || !canSave,                className: `${baseBtn} ${!isEditing || !canSave ? "bg-blue-400 cursor-not-allowed opacity-50" : "bg-blue-600 hover:bg-blue-700"}` },
                { key: "reset",  label: <span className="hidden sm:inline ml-1">Reset</span>,  icon: faUndo,        onClick: handleResetSetup, disabled: false,                              className: `${baseBtn} bg-blue-600 hover:bg-blue-700` },
                { key: "edit",   label: <span className="hidden sm:inline ml-1">Edit</span>,   icon: faPenToSquare, onClick: handleEdit,       disabled: isLoading || isEditing || !hasRecord || !canEdit,   className: `${baseBtn} ${isEditing || !hasRecord || !canEdit ? "bg-blue-400 cursor-not-allowed opacity-50" : "bg-blue-600 hover:bg-blue-700"}` },
                { key: "delete", label: <span className="hidden sm:inline ml-1">Delete</span>, icon: faTrash,       onClick: deleteItem,       disabled: isLoading || isEditing || !hasRecord || !canDelete,   className: `${baseBtn} ${isEditing || !hasRecord || !canDelete ? "bg-red-400 cursor-not-allowed opacity-50" : "bg-red-500 hover:bg-red-600"}` },
            ];
        }

        if (activeTab === "ref") {
            return [
                { key: "add",   label: <span className="hidden sm:inline ml-1">Add</span>,   icon: faPlus, onClick: () => refTabRef.current?.add?.(), disabled: !canAdd, className: `${baseBtn} ${!canAdd ? "bg-blue-400 cursor-not-allowed opacity-50" : "bg-blue-600 hover:bg-blue-700"}` },
                { key: "save",  label: <span className="hidden sm:inline ml-1">Save</span>,  icon: faSave, onClick: () => refTabRef.current?.save?.(),  disabled: !canSave || !refState.canSave, className: `${baseBtn} ${!canSave || !refState.canSave ? "bg-blue-400 cursor-not-allowed opacity-50" : "bg-blue-600 hover:bg-blue-700"}` },
                { key: "reset", label: <span className="hidden sm:inline ml-1">Reset</span>, icon: faUndo, onClick: () => refTabRef.current?.reset?.(), disabled: false, className: `${baseBtn} bg-blue-600 hover:bg-blue-700` },
            ];
        }

        return [];
    }, [activeTab, isLoading, isEditing, form, refState, canAdd, canEdit, canSave, canDelete]);

    return (
        <div className="global-ref-main-div-ui">
            <div className="global-ref-header-ui">
                <div className="w-full flex flex-col lg:flex-row items-center justify-between gap-3">
                    {/* LEFT: title + tabs grouped together */}
                    <div className="flex flex-col lg:flex-row items-center lg:items-center gap-2 lg:gap-4 w-full lg:w-auto">
                        <div className="flex-shrink-0 text-center lg:text-left">
                            <div className="flex items-center gap-2">
                                <h1 className="global-ref-headertext-ui truncate">FG Master Data</h1>
                            </div>
                        </div>

                        <div className="overflow-x-auto no-scrollbar">
                            <div className="flex flex-nowrap border-b border-blue-300">
                                {tabs.map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`shrink-0 px-3 py-1 sm:py-2 sm:px-4 text-[10px] sm:text-[13px] font-bold border-b-2 rounded-md ${activeTab === tab.id ? "border-blue-700 text-blue-700 bg-blue-50" : "border-transparent text-gray-500 hover:text-blue-500"}`}
                                    >
                                        <FontAwesomeIcon icon={tab.icon} className="mr-1.5" /> {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    

                    {/* RIGHT: buttons stay on the far right */}
                    <div className="flex-shrink-0 w-full lg:w-auto flex flex-wrap items-center justify-center lg:justify-end gap-1.5">
                        <PermissionBadge
                                    variant="reference"
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
                    <FGMast_SetupTab
                        form={form}
                        isEditing={isEditing && isFullAccess}
                        isLoading={isLoading}
                        generationMode={generationMode}
                        onChangeForm={updateForm}
                        onLookupSelect={(itemCode) => fetchItemByCode(itemCode, false)}
                        onBlurItemCode={isReadOnly ? undefined : checkDuplicate}
                    />
                )}
                {activeTab === "master" && (
                    <FGMast_DataTab
                        rows={masterRows}
                        isLoading={isLoading}
                        onFilter={loadMasterList}
                        onReset={loadMasterList}
                        onRowDoubleClick={async (row) => {
                            await fetchItemByCode(row.itemCode, false);
                            setActiveTab("setup");
                        }}
                    />
                )}
                {activeTab === "ref" && (
                    <FGMast_ReferenceCodeTab
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
        </div>
    );
};

export default FGMast;