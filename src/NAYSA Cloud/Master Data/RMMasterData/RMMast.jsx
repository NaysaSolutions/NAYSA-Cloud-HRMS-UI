// src/NAYSA Cloud/Master Data/RMMasterData/RMMast.jsx

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
import RMMast_SetupTab from "@/NAYSA Cloud/Master Data/RMMasterData/RMMast_SetupTab.jsx";
import RMMast_DataTab from "@/NAYSA Cloud/Master Data/RMMasterData/RMMast_DataTab.jsx";
import RMMast_ReferenceCodeTab from "@/NAYSA Cloud/Master Data/RMMasterData/RMMast_ReferenceCodeTab.jsx";

import {
    useSwalErrorAlert,
    useSwalSuccessAlert,
    useSwalErrorAlertAPI,
    useSwalDeleteConfirm,
    useSwalDeleteRecord,
} from "@/NAYSA Cloud/Global/behavior.jsx";

import { usePagePermission } from "@/NAYSA Cloud/Global/usePagePermission.js";
import PermissionBadge from "@/NAYSA Cloud/Global/PermissionBadge.jsx";

// ─────────────────────────────────────────────────────────────────────────────
//  Empty form — mirrors rm_mast columns exactly (camelCase aliases from sproc)
// ─────────────────────────────────────────────────────────────────────────────
const emptyForm = {
    itemCode:    "",                    // item_code
    itemDesc:    "",                    // item_name
    itemDesc2:   "",                    // rm2_name
    itemDesc3:   "",                    // rm3_name
    uom:         "", uomName:     "",   // uom_code
    uom2:        "",                    // uom2_code
    qtyPerUom2:  "0.000000",            // uom2_qty
    categoryCode: "", categoryName: "", // categ_code
    classCode:    "", className:   "",  // class_code
    active:      "Y",                   // active
    status:      "New",

    subClass1Code: "", subClass1Name: "",   // rmsubclass1_code
    subClass2Code: "", subClass2Name: "",   // rmsubclass2_code
    subClass3Code: "", subClass3Name: "",   // rmsubclass3_code

    // conversions / variables (vacant slots)
    vacant01: "0.000000", vacant02: "0.000000", vacant03: "0.000000",
    vacant04: "0.000000", vacant05: "0.000000", vacant06: "0.000000",
    vacant07: "", vacant08: "", vacant09: "",
    vacant10: "", vacant11: "", vacant12: "",

    // pricing / inventory
    sellingPrice:  "0.000000",          // selling_price
    unitPrice:     "0.000000",          // unit_price
    qtyOnHand:     "0.000",             // qty_onhand
    qtyOrder:      "0.000",             // qty_order
    qtyAvail:      "0.000",             // qty_avail
    vatCode:       "",                  // vat_code
    stockValuation:"",                  // stock_valuation
    stdPoPrice:    "0.000000",          // base_price

    // last purchase
    lastPurFrom:   "",                  // lastpur_from
    lastPurDate:   "",                  // lastpur_date
    lastPurQty:    "0.000000",          // lastpur_qty
    lastPurPrice:  "0.000000",          // lastpur_price

    // planning / ordering
    shelfLife:          "0",            // shelf_life
    reOrderLevel:       "0.000",        // reorder_qty
    minOrderQty:        "0.000",        // min_qty
    maxOrderQty:        "0.000",        // max_qty
    purchasingLeadTime: "0",            // pur_leadtime
    productionLeadTime: "0",            // prod_leadtime
    safetyStock:        "0.000",        // safety_stock
    stdPackingQty:      "0.000",        // std_pack_qty
    planType:           "Purchased",    // plan_type
    mrpFlag:            "N",            // mrp_flag

    // standard costs
    stdDlCost:   "0.000000",            // std_dlcost
    stdFohCost:  "0.000000",            // std_fohcost
    stdOsCost:   "0.000000",            // std_oscost
    stdDmCost:   "0.000000",            // std_dmcost

    barcode:     "",                    // barcode

    // audit
    registeredBy:   "", registeredDate: "",
    updatedBy:      "", updatedDate:    "",
    __isNew: false,
};

// ─────────────────────────────────────────────────────────────────────────────
//  Component
// ─────────────────────────────────────────────────────────────────────────────
const RMMast = () => {
    const [activeTab, setActiveTab]       = useState("setup");
    const [isLoading, setIsLoading]       = useState(false);
    const generationMode                  = "Manual";   // item_code is always user-supplied

    const { user } = useAuth();
    const userCode = user?.USER_CODE || user?.userCode || user?.code || "";

    const [form, setForm]                         = useState({ ...emptyForm });
    const [selectedItemCode, setSelectedItemCode] = useState("");
    const [isEditing, setIsEditing]               = useState(false);

    const [masterAllRows, setMasterAllRows] = useState([]);
    const [masterRows, setMasterRows]       = useState([]);

    // Reference Tab
    const refTabRef                         = useRef(null);
    const [refState, setRefState]           = useState({ isEditing: false, canSave: false, activeRefTab: "category" });

    // Page permissions
    const { pagePermission, isReadOnly, isFullAccess, canAdd, canEdit, canSave, canDelete } =
        usePagePermission("RMMast");

    // ── init ─────────────────────────────────────────────────────────────────
    useEffect(() => {
        loadMasterList();
    }, []);

    // ── helpers ──────────────────────────────────────────────────────────────
    const updateForm = (patch) => setForm((prev) => ({ ...prev, ...patch }));

    const parseSprocJsonResult = (rows) => {
        if (!rows) return [];
        const r = rows?.[0]?.result;
        if (typeof r === "string") {
            try { return JSON.parse(r); } catch { return []; }
        }
        if (Array.isArray(rows) && rows.length && typeof rows[0] === "object") return rows;
        return [];
    };

    // ── load master list ──────────────────────────────────────────────────────
    const loadMasterList = async () => {
        setIsLoading(true);
        try {
            const res  = await apiClient.get("/rmMast");
            const list = parseSprocJsonResult(res?.data?.data);
            setMasterAllRows(list);
            setMasterRows(list);
        } catch {
            setMasterAllRows([]);
            setMasterRows([]);
        } finally {
            setIsLoading(false);
        }
    };

    // ── fetch single record ───────────────────────────────────────────────────
    const fetchItemByCode = async (itemCode, enterEditMode = false) => {
        const code = String(itemCode || "").trim();
        if (!code) return;

        setIsLoading(true);
        try {
            const res    = await apiClient.post("/getRMMast", { ITEM_CODE: code });
            const parsed = parseSprocJsonResult(res?.data?.data);
            const row    = Array.isArray(parsed) ? parsed?.[0] : null;

            if (!row) {
                await useSwalErrorAlert("Info", "Item not found.");
                return;
            }

            updateForm({ ...emptyForm, __isNew: false, ...row, itemCode: code });
            setSelectedItemCode(code);
            if (enterEditMode) setIsEditing(true);
        } catch {
            await useSwalErrorAlertAPI("Fetch Error", "Failed to fetch item.");
        } finally {
            setIsLoading(false);
        }
    };

    // ── duplicate check ───────────────────────────────────────────────────────
    const checkDuplicate = async (itemCode) => {
        const code = String(itemCode || "").trim();
        if (!code) return false;

        try {
            const res  = await apiClient.post("/checkDuplicateRMMast", {
                json_data: { itemCode: code },
            });
            const row   = res?.data?.data?.[0];
            const isDup = String(row?.result ?? "0") === "1";
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

    // ── in-use check ──────────────────────────────────────────────────────────
    const checkInUsed = async (itemCode) => {
        const code = String(itemCode || "").trim();
        if (!code) return false;

        try {
            const res   = await apiClient.post("/checkInUsedRMMast", {
                json_data: { itemCode: code },
            });
            const row    = res?.data?.data?.[0];
            const isUsed =
                String(row?.result ?? row?.isInUsed ?? row?.isinused ?? "0") === "1" ||
                Number(row?.isInUsed ?? row?.isinused ?? row?.inusedcount ?? 0) > 0;

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

    // ── delete ────────────────────────────────────────────────────────────────
    const deleteItem = async () => {
        if (!canDelete) {
            await useSwalErrorAlert("Read Only", "You are not allowed to delete records.");
            return;
        }

        const code = String(form?.itemCode || "").trim();
        if (!code) return;

        const inUse = await checkInUsed(code);
        if (inUse) return;

        const confirm = await useSwalDeleteConfirm("Delete Item?", `Delete Item No ${code}?`);
        if (!confirm?.isConfirmed) return;

        setIsLoading(true);
        try {
            const res = await apiClient.post("/deleteRMMast", {
                json_data: { itemCode: code, userCode },
            });

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

    // ── upsert ────────────────────────────────────────────────────────────────
    const upsertItem = async () => {
        if (!canSave) {
            await useSwalErrorAlert("Read Only", "You are not allowed to save changes.");
            return;
        }

        const code = String(form?.itemCode || "").trim();

        if (form.__isNew) {
            const isDup = await checkDuplicate(code);
            if (isDup) return;
        }

        setIsLoading(true);
        try {
            const payload = {
                json_data: {
                    itemCode:           code,
                    itemName:           form.itemDesc        || null,
                    itemDesc2:          form.itemDesc2       || null,
                    itemDesc3:          form.itemDesc3       || null,
                    categCode:          form.categoryCode    || null,
                    classCode:          form.classCode       || null,
                    subclass1:          form.subClass1Code   || null,
                    subclass2:          form.subClass2Code   || null,
                    subclass3:          form.subClass3Code   || null,
                    uomCode:            form.uom             || null,
                    uomCode2:           form.uom2            || null,
                    uomQty2:            form.qtyPerUom2      || null,
                    active:             form.active          || "Y",
                    qtyOnHand:          form.qtyOnHand       || null,
                    qtyOrder:           form.qtyOrder        || null,
                    qtyAvail:           form.qtyAvail        || null,
                    sellingPrice:       form.sellingPrice    || null,
                    unitPrice:          form.unitPrice       || null,
                    conv1:              form.vacant01        || null,
                    conv2:              form.vacant02        || null,
                    conv3:              form.vacant03        || null,
                    conv4:              form.vacant04        || null,
                    conv5:              form.vacant05        || null,
                    conv6:              form.vacant06        || null,
                    var1:               form.vacant07        || null,
                    var2:               form.vacant08        || null,
                    var3:               form.vacant09        || null,
                    var4:               form.vacant10        || null,
                    var5:               form.vacant11        || null,
                    var6:               form.vacant12        || null,
                    vatCode:            form.vatCode         || null,
                    stockValuation:     form.stockValuation  || null,
                    basePrice:          form.stdPoPrice      || null,
                    lastPurFrom:        form.lastPurFrom     || null,
                    lastPurDate:        form.lastPurDate     || null,
                    lastPurQty:         form.lastPurQty      || null,
                    lastPurPrice:       form.lastPurPrice    || null,
                    shelfLife:          form.shelfLife       || null,
                    reorderQty:         form.reOrderLevel    || null,
                    minQty:             form.minOrderQty     || null,
                    maxQty:             form.maxOrderQty     || null,
                    purLeadTime:        form.purchasingLeadTime || null,
                    prodLeadTime:       form.productionLeadTime || null,
                    safetyStock:        form.safetyStock     || null,
                    stdPackQty:         form.stdPackingQty   || null,
                    planType:           form.planType        || null,
                    mrpFlag:            form.mrpFlag         || "N",
                    stdDlCost:          form.stdDlCost       || null,
                    stdFohCost:         form.stdFohCost      || null,
                    stdOsCost:          form.stdOsCost       || null,
                    stdDmCost:          form.stdDmCost       || null,
                    barcode:            form.barcode         || null,
                    userCode:           userCode             || null,
                },
            };

            const res = await apiClient.post("/upsertRMMast", payload);

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
        } catch {
            await useSwalErrorAlert("Save Failed", "Failed to save item.");
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
        setSelectedItemCode("");
        setForm({ ...emptyForm, __isNew: true });
        setIsEditing(true);
        setActiveTab("setup");
    };

    const handleEdit = async () => {
        if (!canEdit) {
            await useSwalErrorAlert("Read Only", "You are not allowed to edit records.");
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

    // ── tabs ──────────────────────────────────────────────────────────────────
    const tabs = [
        { id: "setup",  label: "Item Masterfile Set Up", icon: faFolderOpen },
        { id: "master", label: "Item Master Data",        icon: faList },
        { id: "ref",    label: "Reference Codes",         icon: faTags },
    ];

    // ── header buttons ────────────────────────────────────────────────────────
    const headerButtons = useMemo(() => {
        const baseBtn = "flex items-center justify-center h-8 w-8 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md transition-all shadow-sm text-white";

        if (activeTab === "setup") {
            const hasRecord = String(form?.itemCode || "").trim() && !form.__isNew;
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
    }, [activeTab, isLoading, isEditing, form, refState, isReadOnly, canAdd, canEdit, canSave, canDelete]);

    // ── render ────────────────────────────────────────────────────────────────
    return (
        <div className="global-ref-main-div-ui">
            <div className="global-ref-header-ui">
                <div className="w-full flex flex-col lg:flex-row items-center justify-between gap-3">

                    {/* LEFT: title + tabs */}
                    <div className="flex flex-col lg:flex-row items-center lg:items-center gap-2 lg:gap-4 w-full lg:w-auto">
                        <div className="flex-shrink-0 text-center lg:text-left">
                            <h1 className="global-ref-headertext-ui truncate">RM Master Data</h1>
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
                    <RMMast_SetupTab
                        form={form}
                        isEditing={isEditing && isFullAccess}
                        isReadOnly={isReadOnly}
                        isLoading={isLoading}
                        generationMode={generationMode}
                        onChangeForm={updateForm}
                        onLookupSelect={(itemCode) => fetchItemByCode(itemCode, false)}
                        onBlurItemCode={isReadOnly ? undefined : checkDuplicate}
                    />
                )}

                {activeTab === "master" && (
                    <RMMast_DataTab
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
                    <RMMast_ReferenceCodeTab
                        ref={refTabRef}
                        onStateChange={setRefState}
                        variant="rm"
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

export default RMMast;