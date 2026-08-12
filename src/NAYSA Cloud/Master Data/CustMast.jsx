// src/NAYSA Cloud/Reference File/CustMast.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { usePagePermission } from "@/NAYSA Cloud/Global/usePagePermission.js";
import Swal from "sweetalert2";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faFolderOpen,
    faPaperclip,
    faList,
    faTags,
    faPlus,
    faSave,
    faUndo,
    faPenToSquare,
    faTrash,
    faInfoCircle,
    faChevronDown,
    faFilePdf,
    faVideo
} from "@fortawesome/free-solid-svg-icons";

import { apiClient, fetchData } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import ButtonBar from "@/NAYSA Cloud/Global/ButtonBar";
import SearchAttachment from "@/NAYSA Cloud/Lookup/SearchAttachment.jsx";
import SearchCusMast from "@/NAYSA Cloud/Lookup/SearchCustMast.jsx";

import { reftablesPDFGuide, reftablesVideoGuide } from "@/NAYSA Cloud/Global/reftable";

import {
    useSwalErrorAlert,
    useSwalValidationAlert,
    useSwalSuccessAlert,
    useSwalErrorAlertAPI,
    useSwalDeleteConfirm,
    useSwalDeleteRecord,
    useSwalProceedConfirm // Added for duplicate name check
} from "@/NAYSA Cloud/Global/behavior.jsx";

import CustSetupTab from "./CustSetupTab";
import CustMasterDataTab from "@/NAYSA Cloud/Master Data/CustMasterDataTab.jsx";
import ReferenceCodesTab from "@/NAYSA Cloud/Master Data/CustMastTabs/ReferenceCodesTab";
import PermissionBadge from "@/NAYSA Cloud/Global/PermissionBadge.jsx";

const normalizeSlType = (v) => {
    const s = String(v ?? "").toUpperCase().trim();
    if (!s) return "";
    if (["CU", "AG", "OT"].includes(s)) return s;
    if (s === "CUSTOMER") return "CU";
    if (s === "AGENCY") return "AG";
    if (s === "OTHERS") return "OT";
    return s;
};

const sltypeOptions = [
    { value: "CU", label: "CUSTOMER" },
    { value: "AG", label: "AGENCY" },
    { value: "OT", label: "OTHERS" },
];

const activeOptions = [
    { value: "Y", label: "Yes" },
    { value: "N", label: "No" },
];

const sourceOptions = [
    { value: "L", label: "Local" },
    { value: "F", label: "Foreign" },
];

const mappedTaxClassOptions = [
    { value: "WC", label: "Corporate" },
    { value: "WI", label: "Individual" },
];

const payeeTypeOptions = [];

const emptyForm = {
    sltypeCode: "CU",
    custCode: "",
    taxClass: "",
    custName: "",
    businessName: "",
    firstName: "",
    middleName: "",
    lastName: "",
    oldCode: "",
    branchCode: "",
    salesRep: "",
    salesRepCode: "",
    salesRepName: "",
    area: "",
    areaCode: "",
    areaName: "",
    zone: "",
    zoneCode: "",
    zoneName: "",
    whCode: "",
    directWarehouse: "",
    whName: "",
    directWarehouseName: "",
    chainFlag: "N",
    chainCode: "",
    chainCustomer: "",
    chainCustomerCode: "",
    chainCustomerName: "",
    custGroup: "",
    priceGroup: "",
    active: "Y",
    custContact: "",
    custPosition: "",
    custTelno: "",
    custMobileno: "",
    custEmail: "",
    custtypeCode: "",
    custtypeName: "",
    customerType: "",
    customerTypeName: "",
    custAddr1: "",
    custAddr2: "",
    custAddr3: "",
    custZip: "",
    custTin: "",
    atcCode: "",
    vatCode: "",
    billtermCode: "",
    source: "L",
    currCode: "PHP",
    registeredBy: "",
    registeredDate: "",
    updatedBy: "",
    updatedDate: "",
    creditInvestigator: "",
    creditLimit: "0",
    totalAR: "",
    creditBalance: "0",
    customerRemarks: "",
    customizedDrForm: "",
    customizedSiForm: "",
    customizedDrcForm: "",
    customizedBsForm: "",
    customizedSviForm: "",
    taxSignatoryName: "",
    taxSignatoryTin: "",
    taxSignatoryPosition: "",
    taxSignatoryEmail: "",
    taxSignatoryZip: "",
    shipmentCode1: "",
    shipmentCode2: "",
    shipmentCode3: "",
    shipmentCode4: "",
    destination2: "",
    __isNew: false,
};

const CustMast = () => {
    const [activeTab, setActiveTab] = useState("setup");
    const [isLoading, setIsLoading] = useState(false);

    const docType = "CustMast";
    const guideRef = useRef(null);
    const pdfLink = reftablesPDFGuide?.[docType] || "#";
    const videoLink = reftablesVideoGuide?.[docType] || "#";
    const [isOpenGuide, setOpenGuide] = useState(false);

    const {
            pagePermission,
            isReadOnly,
            isFullAccess,
            canAdd,
            canEdit,
            canSave,
            canDelete,
        } = usePagePermission({
            componentKey: "CustMast",
            debug: true, // change to false after testing
        });
    

    // --- DUPLICATE NAME LOGIC ---
    const allowedDuplicateCustNameRef = useRef("");
    const normalizeText = (value) => String(value || "").trim().replace(/\s+/g, " ").toUpperCase();

    const findDuplicateCustName = (custName = form.custName, rows = masterAllRows) => {
        const normalizedName = normalizeText(custName);
        if (!normalizedName) return null;

        return rows.find((row) => {
            const sameName = normalizeText(row?.custName) === normalizedName;
            const sameCode = normalizeText(row?.custCode) === normalizeText(selectedCustCode || form.custCode);
            return sameName && !sameCode;
        });
    };

    const confirmDuplicateCustName = async (custName = form.custName) => {
        const normalizedName = normalizeText(custName);
        if (!normalizedName) return true;
        if (allowedDuplicateCustNameRef.current === normalizedName) return true;

        let rows = masterAllRowsRef.current;

        if (!masterListLoadedRef.current) {
            rows = await loadMasterList({ showLoader: false, showError: true });
        }

        const duplicateRecord = findDuplicateCustName(custName, rows);
        if (!duplicateRecord) return true;

        const result = await useSwalProceedConfirm(
            "Duplicate Customer Name",
            `Customer Name "${custName}" already exists with Customer Code ${duplicateRecord.custCode}.\n\nDo you want to proceed?`,
            "Yes, Proceed"
        );

        if (result.isConfirmed) {
            allowedDuplicateCustNameRef.current = normalizedName;
            return true;
        }

        allowedDuplicateCustNameRef.current = "";
        updateForm({ custName: "" });
        return false;
    };

    const referenceCodesRef = useRef(null);
    const [refTabState, setRefTabState] = useState({
        isEditing: false,
        canSave: false,
    });

    useEffect(() => {
        const handleClick = (e) => {
            if (guideRef.current && !guideRef.current.contains(e.target)) {
                setOpenGuide(false);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => {
            document.removeEventListener("mousedown", handleClick);
        };
    }, []);

    const { user } = useAuth();
    const userCode = user?.userCode || user?.USER_CODE || user?.code || "";

    // ============================================================
    // CUSTOMER CODE GENERATION MODE
    // Read directly from HS_DOC through HSDocController.
    //
    // HS_DOC CU:
    //   Manual -> Customer Code is editable when adding a new record.
    //   Auto   -> Customer Code remains read-only and is generated on Save.
    //
    // Important:
    // HSDocController returns sproc_PHP_HSDoc output in data[0].result
    // as a JSON string, so it must be parsed before reading docSeries.
    // ============================================================
    const [generationMode, setGenerationMode] = useState("Auto");

    const parseHSDocRow = (response) => {
        const rows = response?.data;

        if (!Array.isArray(rows) || rows.length === 0) {
            return null;
        }

        const firstRow = rows[0];

        // Standard sproc_PHP_HSDoc response:
        // { result: '[{"docCode":"CU","docSeries":"Manual",...}]' }
        if (typeof firstRow?.result === "string") {
            try {
                const parsed = JSON.parse(firstRow.result);

                if (Array.isArray(parsed)) {
                    return parsed[0] || null;
                }

                if (parsed && typeof parsed === "object") {
                    return parsed;
                }
            } catch (error) {
                console.error("Unable to parse CU HS_DOC result:", error);
            }
        }

        // Defensive fallback if the stored procedure later returns a direct row.
        return firstRow && typeof firstRow === "object"
            ? firstRow
            : null;
    };

    const normalizeGenerationMode = (value) => {
        const mode = String(value ?? "")
            .trim()
            .toUpperCase();

        if (mode === "MANUAL" || mode === "M") {
            return "Manual";
        }

        return "Auto";
    };

    const loadCustomerGenerationMode = async ({ showError = false } = {}) => {
        try {
            const response = await fetchData("getHSDoc", {
                DOC_ID: "CU",
            });

            if (!response?.success) {
                throw new Error(
                    response?.message || "Unable to retrieve Customer document setup."
                );
            }

            const hsDoc = parseHSDocRow(response);

            if (!hsDoc) {
                throw new Error("HS_DOC setup for CU was not found.");
            }

            const mode = normalizeGenerationMode(
                hsDoc?.docSeries ??
                hsDoc?.DOC_SERIES ??
                hsDoc?.doc_series
            );

            setGenerationMode(mode);
            return mode;
        } catch (error) {
            console.error("Failed to load CU HS_DOC:", error);

            // Safe fallback: if HS_DOC cannot be verified, do not allow
            // accidental manual entry.
            setGenerationMode("Auto");

            if (showError) {
                await useSwalErrorAlert(
                    "Customer Code Setup",
                    error?.message ||
                    "Unable to determine whether Customer Code is Manual or Auto."
                );
            }

            return null;
        }
    };

    // Load once when Customer Master opens.
    useEffect(() => {
        loadCustomerGenerationMode();
    }, []);

    const [form, setForm] = useState({ ...emptyForm });
    const [selectedCustCode, setSelectedCustCode] = useState("");
    const [isEditing, setIsEditing] = useState(false);

    const [isAttachOpen, setIsAttachOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    const [subsidiaryType, setSubsidiaryType] = useState("");
    const [masterFilters, setMasterFilters] = useState({});
    const [masterAllRows, setMasterAllRows] = useState([]);
    const [masterRows, setMasterRows] = useState([]);
    const masterAllRowsRef = useRef([]);
    const masterListLoadedRef = useRef(false);
    const masterListPromiseRef = useRef(null);

    const updateForm = (patch) => {
        setForm((prev) => ({ ...prev, ...patch }));
    };

    const showValidation = async (title, lines) => {
        const msg = Array.isArray(lines) ? lines.join("\n") : String(lines || "");
        return useSwalValidationAlert({ icon: "error", title, message: msg });
    };

    const checkDuplicateCustomer = async (custCode) => {
        const payload = {
            json_data: JSON.stringify({
                json_data: { custCode: String(custCode || "").trim() },
            }),
        };
        const res = await apiClient.post("/checkDuplicateCustomer", payload);
        const rows = res?.data?.data || [];
        return Number(rows?.[0]?.result ?? 0) === 1;
    };

    const checkInUsedCustomer = async (custCode) => {
        const payload = {
            json_data: JSON.stringify({
                json_data: { custCode: String(custCode || "").trim() },
            }),
        };
        const res = await apiClient.post("/checkInUsedCustomer", payload);
        const rows = res?.data?.data || [];
        return Number(rows?.[0]?.result ?? 0) === 1;
    };

    const extractSprocValidation = (axiosResponse) => {
        const payload = axiosResponse?.data ?? axiosResponse;
        const data = payload?.data;

        if (
            Array.isArray(data) &&
            data[0] &&
            (data[0].errorCount !== undefined ||
                data[0].errorMsg !== undefined ||
                data[0].errorcount !== undefined ||
                data[0].errormsg !== undefined)
        ) {
            return {
                errorCount: Number(data[0].errorCount ?? data[0].errorcount ?? 0),
                errorMsg: String(data[0].errorMsg ?? data[0].errormsg ?? ""),
                generatedCode: String(data[0].generatedCode ?? data[0].generatedcode ?? "")
            };
        }

        if (Array.isArray(data) && data[0]?.result) {
            try {
                const parsed = JSON.parse(data[0].result);
                const row = Array.isArray(parsed) ? parsed[0] : parsed;
                if (
                    row &&
                    (row.errorCount !== undefined ||
                        row.errorMsg !== undefined ||
                        row.errorcount !== undefined ||
                        row.errormsg !== undefined)
                ) {
                    return {
                        errorCount: Number(row.errorCount ?? row.errorcount ?? 0),
                        errorMsg: String(row.errorMsg ?? row.errormsg ?? ""),
                        generatedCode: String(row.generatedCode ?? row.generatedcode ?? "")
                    };
                }
            } catch { }
        }

        const fallbackMsg = payload?.message || payload?.error || payload?.msg;
        if (fallbackMsg) return { errorCount: 1, errorMsg: String(fallbackMsg) };

        return null;
    };

    const documentNo = useMemo(() => {
        return String(form?.custCode || "").trim();
    }, [form]);

    const parseSprocJsonResult = (rows) => {
        if (!rows) return [];
        const r = rows?.[0]?.result;
        if (typeof r === "string") {
            try {
                return JSON.parse(r);
            } catch {
                return [];
            }
        }
        if (Array.isArray(rows) && rows.length && typeof rows[0] === "object") {
            return rows;
        }
        return [];
    };

    const handleOpenAttach = async () => {
        if (!isFullAccess) {
            await useSwalErrorAlert("Read Only", "You only have read access. Attaching files is not allowed.");
            return;
        }

        const code = String(form?.custCode || "").trim();
        if (!code) {
            await useSwalValidationAlert({
                icon: "warning",
                title: "Required",
                message: "Customer Code is required.",
            });
            return;
        }
        setIsAttachOpen(true);
    };

    const loadMasterList = async ({
        showLoader = true,
        showError = true,
        force = false,
    } = {}) => {
        if (!force && masterListLoadedRef.current) {
            return masterAllRowsRef.current;
        }

        if (!force && masterListPromiseRef.current) {
            return masterListPromiseRef.current;
        }

        const request = (async () => {
            if (showLoader) setIsLoading(true);

            try {
                const res = await apiClient.get("/customer");
                const parsed = parseSprocJsonResult(res?.data?.data);
                const list = Array.isArray(parsed) ? parsed : [];

                const normalized = list.map((x) => ({
                    ...x,
                    sltypeCode: normalizeSlType(x?.sltypeCode ?? "CU"),
                    custCode: x?.custCode ?? "",
                    custName: x?.custName ?? "",
                    address:
                        x?.address ??
                        [x?.custAddr1, x?.custAddr2, x?.custAddr3]
                            .filter(Boolean)
                            .join(" "),
                }));

                masterAllRowsRef.current = normalized;
                masterListLoadedRef.current = true;
                setMasterAllRows(normalized);
                setMasterRows(normalized);
                return normalized;
            } catch (e) {
                console.error(e);
                masterListLoadedRef.current = false;

                if (showError) {
                    await useSwalErrorAlert("Error", "Failed to load customer list.");
                }

                return masterAllRowsRef.current;
            } finally {
                if (showLoader) setIsLoading(false);
            }
        })();

        masterListPromiseRef.current = request;

        try {
            return await request;
        } finally {
            if (masterListPromiseRef.current === request) {
                masterListPromiseRef.current = null;
            }
        }
    };

    useEffect(() => {
        if (activeTab === "master" && !masterListLoadedRef.current) {
            loadMasterList();
        }
    }, [activeTab]);

    const fetchCustomerByCode = async (custCode) => {
        const code = String(custCode || "").trim();
        if (!code) return;

        setIsLoading(true);
        try {
            const res = await apiClient.post("/getCustomer", { CUST_CODE: code });
            const parsed = parseSprocJsonResult(res?.data?.data);
            const row = Array.isArray(parsed) ? parsed?.[0] : null;

            if (!row) {
                await useSwalErrorAlert("Info", "Customer not found.");
                return;
            }

            const sl = normalizeSlType(row?.sltypeCode ?? "CU");

            updateForm({
                ...emptyForm,
                __isNew: false,
                sltypeCode: sl,
                custCode: code,
                custName: row?.custName ?? "",
                businessName: row?.businessName ?? "",
                firstName: row?.firstName ?? "",
                middleName: row?.middleName ?? "",
                lastName: row?.lastName ?? "",
                taxClass: row?.taxClass ?? "",
                custAddr1: row?.custAddr1 ?? "",
                custAddr2: row?.custAddr2 ?? "",
                custAddr3: row?.custAddr3 ?? "",
                custZip: row?.custZip ?? "",
                custTin: row?.custTin ?? "",
                branchCode: row?.branchCode ?? "",
                salesRep: row?.salesRep ?? row?.salesRepCode ?? row?.agentCode ?? row?.agent_code ?? "",
                salesRepCode: row?.salesRepCode ?? row?.salesRep ?? row?.agentCode ?? row?.agent_code ?? "",
                salesRepName: row?.salesRepName ?? row?.agentName ?? row?.agent_name ?? "",
                area: row?.area ?? row?.areaCode ?? row?.area_code ?? "",
                areaCode: row?.areaCode ?? row?.area ?? row?.area_code ?? "",
                areaName: row?.areaName ?? row?.area_name ?? "",
                zone: row?.zone ?? row?.zoneCode ?? row?.zone_code ?? "",
                zoneCode: row?.zoneCode ?? row?.zone ?? row?.zone_code ?? "",
                zoneName: row?.zoneName ?? row?.zone_name ?? "",
                whCode: row?.whCode ?? row?.directWarehouse ?? row?.whouseCode ?? row?.whouse_code ?? "",
                directWarehouse: row?.directWarehouse ?? row?.whCode ?? row?.whouseCode ?? row?.whouse_code ?? "",
                whName: row?.whName ?? row?.directWarehouseName ?? row?.whouseName ?? row?.whouse_name ?? "",
                directWarehouseName: row?.directWarehouseName ?? row?.whName ?? row?.whouseName ?? row?.whouse_name ?? "",
                chainFlag: row?.chainFlag ?? row?.custChain ?? row?.cust_chain ?? "N",
                chainCode: row?.chainCode ?? row?.chainCustomerCode ?? row?.custGroup ?? row?.cust_group ?? "",
                chainCustomerCode: row?.chainCustomerCode ?? row?.chainCode ?? row?.custGroup ?? row?.cust_group ?? "",
                chainCustomer: row?.chainCustomer ?? row?.chainCustomerName ?? row?.custGroupName ?? row?.cust_group_name ?? "",
                chainCustomerName: row?.chainCustomerName ?? row?.chainCustomer ?? row?.custGroupName ?? row?.cust_group_name ?? "",
                custGroup: row?.custGroup ?? row?.cust_group ?? row?.chainCode ?? row?.chainCustomerCode ?? "",
                priceGroup: row?.priceGroup ?? row?.priceGroupCode ?? row?.price_group ?? "",
                custContact: row?.custContact ?? "",
                custPosition: row?.custPosition ?? "",
                custTelno: row?.custTelno ?? "",
                custMobileno: row?.custMobileno ?? "",
                custEmail: row?.custEmail ?? "",
                custtypeCode:
                    row?.custtypeCode ??
                    row?.custTypeCode ??
                    row?.customerType ??
                    row?.custtype_code ??
                    "",
                custtypeName:
                    row?.custtypeName ??
                    row?.custTypeName ??
                    row?.customerTypeName ??
                    row?.custtype_name ??
                    "",
                customerType:
                    row?.customerType ??
                    row?.custtypeCode ??
                    row?.custTypeCode ??
                    row?.custtype_code ??
                    "",
                customerTypeName:
                    row?.customerTypeName ??
                    row?.custtypeName ??
                    row?.custTypeName ??
                    row?.custtype_name ??
                    "",
                source: row?.source ?? "L",
                currCode: row?.currCode ?? "PHP",
                vatCode: row?.vatCode ?? "",
                atcCode: row?.atcCode ?? "",
                billtermCode: row?.billtermCode ?? row?.paytermCode ?? "",
                active: row?.active ?? "Y",
                oldCode: row?.oldcode ?? row?.oldCode ?? "",
                creditInvestigator: row?.creditInvestigator ?? "",
                creditLimit: row?.creditLimit ?? "0",
                totalAR: row?.totalAR ?? "",
                creditBalance: row?.creditBalance ?? "0",
                customerRemarks: row?.customerRemarks ?? "",
                customizedDrForm: row?.customizedDrForm ?? "",
                customizedSiForm: row?.customizedSiForm ?? "",
                customizedDrcForm: row?.customizedDrcForm ?? "",
                customizedBsForm: row?.customizedBsForm ?? "",
                customizedSviForm: row?.customizedSviForm ?? "",
                taxSignatoryName: row?.taxSignatoryName ?? "",
                taxSignatoryTin: row?.taxSignatoryTin ?? "",
                taxSignatoryPosition: row?.taxSignatoryPosition ?? "",
                taxSignatoryEmail: row?.taxSignatoryEmail ?? "",
                taxSignatoryZip: row?.taxSignatoryZip ?? "",
                shipmentCode1: row?.shipmentCode1 ?? "",
                shipmentCode2: row?.shipmentCode2 ?? "",
                shipmentCode3: row?.shipmentCode3 ?? "",
                shipmentCode4: row?.shipmentCode4 ?? "",
                destination2: row?.destination2 ?? "",
                registeredBy: row?.registeredBy ?? row?.registered_by ?? "",
                registeredDate: row?.registeredDate ?? row?.registered_date ?? "",
                updatedBy: row?.updatedBy ?? row?.updated_by ?? "",
                updatedDate: row?.updatedDate ?? row?.updated_date ?? "",
            });

            setSelectedCustCode(code);
        } catch (e) {
            console.error(e);
            await useSwalErrorAlertAPI("Fetch Error", e?.message || "Failed to fetch customer.");
        } finally {
            setIsLoading(false);
        }
    };

    const deleteCustomer = async () => {
        if (!canDelete) {
            await useSwalErrorAlert("Read Only", "You only have read access. Deleting customers is not allowed.");
            return;
        }

        const code = String(form?.custCode || "").trim();

        if (!code) {
            await showValidation("Missing Required Field(s)", ["• Customer Code"]);
            return;
        }

        const isUsed = await checkInUsedCustomer(code);
        if (isUsed) {
            await useSwalErrorAlert(
                "Delete Not Allowed",
                `Customer Code ${code} is already used in transaction(s).`
            );
            return;
        }

        const confirm = await useSwalDeleteConfirm(
            "Delete Customer?",
            `This will permanently delete Customer Code ${code}. This action cannot be undone.`
        );
        if (!confirm?.isConfirmed) return;

        setIsLoading(true);
        try {
            const res = await apiClient.post("/deleteCustomer", {
                CUST_CODE: code,
            });

            const row = res?.data?.data?.[0] || {};
            const errorCount = Number(row?.errorcount ?? row?.errorCount ?? 0);
            const errorMsg = String(row?.errormsg ?? row?.errorMsg ?? "");

            if (res?.data?.success === false || errorCount > 0) {
                await useSwalErrorAlert("Delete Not Allowed", errorMsg || res?.data?.message || "Failed to delete customer.");
                return;
            }

            await useSwalDeleteRecord("Deleted", `Customer Code ${code} has been successfully removed.`);

            setForm({ ...emptyForm });
            setSelectedCustCode("");
            setIsEditing(false);

            await loadMasterList({ force: true });
        } catch (e) {
            console.error(e);
            const row = e?.response?.data?.data?.[0] || {};
            const errorMsg = row?.errormsg || row?.errorMsg || e?.response?.data?.message || "Failed to delete customer.";
            await useSwalErrorAlert("Delete Not Allowed", String(errorMsg));
        } finally {
            setIsLoading(false);
        }
    };

    const upsertCustomer = async () => {
        if (!canSave) {
            await useSwalErrorAlert("Read Only", "You only have read access. Saving customers is not allowed.");
            return;
        }

        // 1. DUPLICATE NAME CHECK
        const canProceed = await confirmDuplicateCustName(form.custName);
        if (!canProceed) return;

        let code = String(form?.custCode || "").trim();
        const isAddMode = !selectedCustCode;

        // Manual CU setup requires the user to supply Customer Code.
        if (
            isAddMode &&
            String(generationMode || "").trim().toUpperCase() === "MANUAL" &&
            !code
        ) {
            await showValidation(
                "Missing Required Field(s)",
                ["• Customer Code"]
            );
            return;
        }

        // 2. DUPLICATE CODE CHECK
        if (isAddMode && code) {
            const isDuplicate = await checkDuplicateCustomer(code);
            if (isDuplicate) {
                await useSwalErrorAlert("Duplicate Record", `Customer Code ${code} already exists.`);
                return;
            }
        }

        setIsLoading(true);
        try {
            const jsonData = {
                json_data: {
                    action: selectedCustCode ? "edit" : "add",
                    custCode: code,
                    custName: form.custName || "",
                    businessName: form.businessName || "",
                    firstName: form.firstName || "",
                    middleName: form.middleName || "",
                    lastName: form.lastName || "",
                    taxClass: form.taxClass || "",
                    custAddr1: form.custAddr1 || "",
                    custAddr2: form.custAddr2 || "",
                    custAddr3: form.custAddr3 || "",
                    custZip: form.custZip || "",
                    custTin: form.custTin || "",
                    branchCode: form.branchCode || "",
                    salesRep: form.salesRep || form.salesRepCode || "",
                    salesRepCode: form.salesRepCode || form.salesRep || "",
                    salesRepName: form.salesRepName || "",
                    area: form.area || form.areaCode || "",
                    areaCode: form.areaCode || form.area || "",
                    areaName: form.areaName || "",
                    zone: form.zone || form.zoneCode || "",
                    zoneCode: form.zoneCode || form.zone || "",
                    zoneName: form.zoneName || "",
                    whCode: form.whCode || form.directWarehouse || "",
                    directWarehouse: form.directWarehouse || form.whCode || "",
                    whName: form.whName || form.directWarehouseName || "",
                    directWarehouseName: form.directWarehouseName || form.whName || "",
                    chainFlag: form.chainFlag || "N",
                    chainCode: form.chainCode || form.chainCustomerCode || form.custGroup || "",
                    chainCustomerCode: form.chainCustomerCode || form.chainCode || form.custGroup || "",
                    chainCustomer: form.chainCustomer || form.chainCustomerName || "",
                    chainCustomerName: form.chainCustomerName || form.chainCustomer || "",
                    custGroup: form.custGroup || form.chainCode || form.chainCustomerCode || "",
                    priceGroup: form.priceGroup || "",
                    custContact: form.custContact || "",
                    custPosition: form.custPosition || "",
                    custTelno: form.custTelno || "",
                    custMobileno: form.custMobileno || "",
                    custEmail: form.custEmail || "",
                    custtypeCode: form.custtypeCode || form.customerType || "",
                    custTypeCode: form.custtypeCode || form.customerType || "",
                    customerType: form.customerType || form.custtypeCode || "",
                    custtypeName: form.custtypeName || form.customerTypeName || "",
                    customerTypeName: form.customerTypeName || form.custtypeName || "",
                    source: form.source || "",
                    currCode: form.currCode || "",
                    vatCode: form.vatCode || "",
                    atcCode: form.atcCode || "",
                    billtermCode: form.billtermCode || "",
                    sltypeCode: normalizeSlType(form.sltypeCode || "CU"),
                    active: form.active || "Y",
                    oldCode: form.oldCode || "",
                    creditInvestigator: form.creditInvestigator || "",
                    creditLimit: form.creditLimit || 0,
                    customerRemarks: form.customerRemarks || "",
                    customizedDrForm: form.customizedDrForm || "",
                    customizedSiForm: form.customizedSiForm || "",
                    customizedDrcForm: form.customizedDrcForm || "",
                    customizedBsForm: form.customizedBsForm || "",
                    customizedSviForm: form.customizedSviForm || "",
                    taxSignatoryName: form.taxSignatoryName || "",
                    taxSignatoryTin: form.taxSignatoryTin || "",
                    taxSignatoryPosition: form.taxSignatoryPosition || "",
                    taxSignatoryEmail: form.taxSignatoryEmail || "",
                    taxSignatoryZip: form.taxSignatoryZip || "",
                    shipmentCode1: form.shipmentCode1 || "",
                    shipmentCode2: form.shipmentCode2 || "",
                    shipmentCode3: form.shipmentCode3 || "",
                    shipmentCode4: form.shipmentCode4 || "",
                    destination2: form.destination2 || "",
                    userCode,
                },
            };

            const payload = {
                json_data: JSON.stringify(jsonData),
            };

            const res = await apiClient.post("/upsertCustomer", payload);
            const sprocValidation = extractSprocValidation(res);

            if (Number(sprocValidation?.errorCount ?? 0) > 0) {
                await useSwalErrorAlert(
                    "Validation Failed",
                    String(sprocValidation?.errorMsg || "Please complete the required fields.")
                );
                return;
            }

            const finalCode = sprocValidation?.generatedCode || code;

            await useSwalSuccessAlert("Success!", "Customer saved successfully.");
            setSelectedCustCode(finalCode);
            setIsEditing(false);
            await loadMasterList({ force: true });
            await fetchCustomerByCode(finalCode);
        } catch (e) {
            console.error(e);
            const sprocValidation = extractSprocValidation(e?.response);
            if (Number(sprocValidation?.errorCount ?? 0) > 0) {
                await useSwalErrorAlert("Save Failed", String(sprocValidation?.errorMsg));
                return;
            }
            const msg = e?.response?.data?.message || e?.message || "Failed to save customer.";
            await useSwalErrorAlert("Save Failed", msg);
        } finally {
            setIsLoading(false);
        }
    };

    const applyMasterFilters = () => {
        const selectedType = normalizeSlType(subsidiaryType);

        const filtered = masterAllRows.filter((row) => {
            const rowType = normalizeSlType(row?.sltypeCode || "CU");
            if (selectedType && rowType !== selectedType) return false;

            for (const [key, val] of Object.entries(masterFilters || {})) {
                const q = String(val || "").trim().toLowerCase();
                if (!q) continue;
                const cell = String(row?.[key] || "").toLowerCase();
                if (!cell.includes(q)) return false;
            }
            return true;
        });

        setMasterRows(filtered);
    };

    const resetMasterFilters = () => {
        setSubsidiaryType("");
        setMasterFilters({});
        setMasterRows(masterAllRows);
    };

    const handleChangeMasterFilter = (key, value) => {
        setMasterFilters((p) => ({ ...p, [key]: value }));
    };

    const handleAdd = async () => {
        if (!canAdd) {
            await useSwalErrorAlert(
                "Read Only",
                "You only have read access. Adding customers is not allowed."
            );
            return;
        }

        // Always re-read HS_DOC before entering Add mode.
        // This makes a recent SQL change from Auto -> Manual take effect
        // without depending on cached AuthContext reference data.
        const latestGenerationMode = await loadCustomerGenerationMode({
            showError: true,
        });

        if (!latestGenerationMode) {
            return;
        }

        allowedDuplicateCustNameRef.current = "";
        const sl = normalizeSlType(form?.sltypeCode || "CU") || "CU";

        setSelectedCustCode("");
        setForm({
            ...emptyForm,
            sltypeCode: sl,
            custCode: "",
            __isNew: true,
        });

        setIsEditing(true);
        setActiveTab("setup");
    };

    const handleEdit = async () => {
        if (!canEdit) {
            await useSwalErrorAlert("Read Only", "You only have read access. Editing customers is not allowed.");
            return;
        }

        const code = String(form?.custCode || "").trim();
        if (!code) {
            await useSwalErrorAlert("Required", "Please select a Customer record first.");
            return;
        }
        setIsEditing(true);
        setActiveTab("setup");
    };

    const handleResetSetup = () => {
        allowedDuplicateCustNameRef.current = ""; // Reset ref
        setSelectedCustCode("");
        setForm({ ...emptyForm });
        setIsEditing(false);
    };

    const tabs = useMemo(
        () => [
            { id: "setup", label: "Customer Set-Up", icon: faFolderOpen },
            { id: "master", label: "Customer Master Data", icon: faList },
            { id: "ref", label: "Reference Codes", icon: faTags },
        ],
        []
    );

    const handleMasterRowDoubleClick = async (row) => {
        const code = String(row?.custCode || row?.code || "").trim();
        if (!code) return;
        setActiveTab("setup");
        await fetchCustomerByCode(code);
        setIsEditing(canEdit);
    };

    const headerButtons = useMemo(() => {
        const baseBtn = "flex items-center justify-center h-8 w-8 sm:w-auto sm:h-8 sm:px-4 text-[12px] font-medium rounded-md transition-all shadow-sm";
        const primaryBtn = `${baseBtn} bg-blue-600 text-white hover:bg-blue-700`;
        const disabledPrimaryBtn = `${baseBtn} bg-blue-500 opacity-50 cursor-not-allowed text-white`;
        const resetBtn = `${baseBtn} bg-blue-500 text-white hover:bg-blue-600`;
        const dangerBtn = `${baseBtn} bg-red-500 text-white hover:bg-red-600`;
        const disabledDangerBtn = `${baseBtn} bg-red-400 opacity-50 cursor-not-allowed text-white`;

        if (activeTab === "setup") {
            const hasRecord = String(form?.custCode || "").trim() && !form.__isNew;

            return [
                {
                    key: "add",
                    label: <span className="hidden sm:inline ml-1">Add</span>,
                    icon: faPlus,
                    onClick: handleAdd,
                    disabled: isLoading || !canAdd,
                    className: isLoading || !canAdd ? disabledPrimaryBtn : primaryBtn,
                },
                {
                    key: "save",
                    label: <span className="hidden sm:inline ml-1">Save</span>,
                    icon: faSave,
                    onClick: upsertCustomer,
                    disabled: isLoading || !isEditing || !canSave,
                    className: isLoading || !isEditing || !canSave ? disabledPrimaryBtn : primaryBtn,
                },
                {
                    key: "reset",
                    label: <span className="hidden sm:inline ml-1">Reset</span>,
                    icon: faUndo,
                    onClick: handleResetSetup,
                    disabled: false,
                    className: resetBtn,
                },
                {
                    key: "edit",
                    label: <span className="hidden sm:inline ml-1">Edit</span>,
                    icon: faPenToSquare,
                    onClick: handleEdit,
                    disabled: isLoading || isEditing || !hasRecord || !canEdit,
                    className: isLoading || isEditing || !hasRecord || !canEdit ? disabledPrimaryBtn : primaryBtn,
                },
                {
                    key: "attach",
                    label: <span className="hidden sm:inline ml-1">Attach File</span>,
                    icon: faPaperclip,
                    onClick: handleOpenAttach,
                    disabled: isLoading || !hasRecord || !isFullAccess,
                    className: isLoading || !hasRecord || !isFullAccess ? disabledPrimaryBtn : primaryBtn,
                },
                {
                    key: "delete",
                    label: <span className="hidden sm:inline ml-1">Delete</span>,
                    icon: faTrash,
                    onClick: deleteCustomer,
                    disabled: isLoading || isEditing || !hasRecord || !canDelete,
                    className: isLoading || isEditing || !hasRecord || !canDelete ? disabledDangerBtn : dangerBtn,
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
                        if (!canAdd) {
                            await useSwalErrorAlert("Read Only", "You only have read access. Adding reference codes is not allowed.");
                            return;
                        }
                        referenceCodesRef.current?.add?.();
                    },
                    disabled: isLoading || !canAdd,
                    className: isLoading || !canAdd ? disabledPrimaryBtn : primaryBtn,
                },
                {
                    key: "save",
                    label: <span className="hidden sm:inline ml-1">Save</span>,
                    icon: faSave,
                    onClick: async () => {
                        if (!canSave) {
                            await useSwalErrorAlert("Read Only", "You only have read access. Saving reference codes is not allowed.");
                            return;
                        }
                        referenceCodesRef.current?.save?.();
                    },
                    disabled: isLoading || !refTabState?.canSave || !canSave,
                    className: isLoading || !refTabState?.canSave || !canSave ? disabledPrimaryBtn : primaryBtn,
                },
                {
                    key: "reset",
                    label: <span className="hidden sm:inline ml-1">Reset</span>,
                    icon: faUndo,
                    onClick: () => referenceCodesRef.current?.reset?.(),
                    disabled: false,
                    className: resetBtn,
                },
            ];
        }

        return [];
    }, [activeTab, isLoading, isEditing, form, refTabState, canAdd, canEdit, canSave, canDelete, isFullAccess]);

    return (
        <div className="global-ref-main-div-ui">
            <div className="global-ref-header-ui">
                <div className="w-full flex flex-col lg:flex-row items-center justify-between gap-3">
                    {/* LEFT: title + tabs grouped together */}
                    <div className="flex flex-col lg:flex-row items-center lg:items-center gap-2 lg:gap-4 w-full lg:w-auto">
                        <div className="flex-shrink-0 text-center lg:text-left">
                            <h1 className="global-ref-headertext-ui truncate">
                                {activeTab === "setup" && "Customer Master Data"}
                                {activeTab === "master" && "Customer Master Data"}
                                {activeTab === "ref" && "Customer Master Data"}
                            </h1>
                        </div>

                        

                        <div className="overflow-x-auto no-scrollbar">
                            <div className="flex flex-nowrap border-b border-blue-300 dark:border-gray-700">
                                {tabs.map((tab) => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`shrink-0 whitespace-nowrap px-3 py-1 sm:py-2 sm:px-4 text-[10px] sm:text-[13px] font-bold transition-all border-b-2 rounded-md
                                            ${activeTab === tab.id
                                                ? "border-blue-700 text-blue-700 bg-blue-50/50"
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

                    {/* RIGHT: buttons stay on the far right */}
                    <div className="flex-shrink-0 w-full lg:w-auto flex flex-wrap items-center justify-center lg:justify-end gap-1.5">
                        <PermissionBadge
                            permission={pagePermission}
                            isReadOnly={isReadOnly}
                            isFullAccess={isFullAccess}
                        />
                        {!!headerButtons.length && (
                            <ButtonBar buttons={headerButtons} />
                        )}

                        {activeTab === "setup" && (
                            <div ref={guideRef} className="relative z-[60]">
                                <button
                                    onClick={() => setOpenGuide((v) => !v)}
                                    className="flex items-center justify-center h-8 w-8 sm:w-auto sm:h-8 sm:px-4 text-[12px] font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-sm"
                                >
                                    <FontAwesomeIcon icon={faInfoCircle} className="text-[14px] sm:text-[12px]" />
                                    <span className="hidden sm:inline ml-1">Info</span>
                                    <FontAwesomeIcon icon={faChevronDown} className="hidden sm:inline ml-1 text-[10px] opacity-80" />
                                </button>

                                {isOpenGuide && (
                                    <div className="absolute right-0 mt-2 w-52 rounded-md shadow-xl bg-white ring-1 ring-black/10 z-[60] overflow-hidden">
                                        <button onClick={() => { window.open(pdfLink, "_blank"); setOpenGuide(false); }} className="block w-full text-left px-4 py-2 text-xs hover:bg-blue-50 border-b border-gray-100 transition-colors">
                                            <FontAwesomeIcon icon={faFilePdf} className="mr-2 text-red-500" /> PDF Guide
                                        </button>
                                        <button onClick={() => { window.open(videoLink, "_blank"); setOpenGuide(false); }} className="block w-full text-left px-4 py-2 text-xs hover:bg-blue-50 transition-colors">
                                            <FontAwesomeIcon icon={faVideo} className="mr-2 text-blue-500" /> Video Guide
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        
                    </div>
                </div>
            </div>

            <div
                className="global-tran-tab-div-ui mt-36 sm:mt-32 md:mt-28 lg:mt-24"
                style={{ minHeight: "calc(100vh - 170px)" }}
            >
                {activeTab === "setup" && (
                    <CustSetupTab
                        form={form}
                        generationMode={generationMode}
                        isEditing={isEditing && isFullAccess}
                        isReadOnly={isReadOnly}
                        pagePermission={pagePermission}
                        isLoading={isLoading}
                        onChangeForm={(patch) => {
                            // Reset name check memory if name changes manually
                            if (patch.custName) {
                                allowedDuplicateCustNameRef.current = "";
                            }
                            updateForm(patch);
                        }}
                        onNameBlur={confirmDuplicateCustName}
                        onLookupCode={() => setIsSearchOpen(true)}
                        onSelectCustomerCode={fetchCustomerByCode}
                        sltypeOptions={sltypeOptions}
                        activeOptions={activeOptions}
                        sourceOptions={sourceOptions}
                        mappedTaxClassOptions={mappedTaxClassOptions}
                        payeeTypeOptions={payeeTypeOptions}
                    />
                )}

                {activeTab === "master" && (
                    <CustMasterDataTab
                        isLoading={isLoading}
                        rows={masterRows}
                        onRowDoubleClick={handleMasterRowDoubleClick}
                        subsidiaryType={subsidiaryType}
                        onChangeSubsidiaryType={setSubsidiaryType}
                        filters={masterFilters}
                        onChangeFilter={handleChangeMasterFilter}
                        onFilter={applyMasterFilters}
                        onReset={resetMasterFilters}
                    />
                )}

                {activeTab === "ref" && (
                    <ReferenceCodesTab
                        ref={referenceCodesRef}
                        variant="customer"
                        isReadOnly={isReadOnly}
                        canAdd={canAdd}
                        canEdit={canEdit}
                        canSave={canSave}
                        canDelete={canDelete}
                        onStateChange={setRefTabState}
                    />
                )}
            </div>

            <SearchAttachment
                isOpen={isAttachOpen}
                onClose={() => setIsAttachOpen(false)}
                params={{
                    DocumentID: documentNo,
                    CodeLabel: "Customer Code",
                    Code: documentNo,
                    NameLabel: "Customer Name",
                    Name: form.custName || form.businessName || "N/A"
                }}
            />

            <SearchCusMast
                isOpen={isSearchOpen}
                customParam="ActiveAll"
                onClose={async (selected) => {
                    setIsSearchOpen(false);
                    if (!selected) return;
                    const code = getValue(selected?.custCode) || getValue(selected?.cust_code);
                    if (code) {
                        await fetchCustomerByCode(code);
                    }
                }}
            />
        </div>
    );
};

export default CustMast;