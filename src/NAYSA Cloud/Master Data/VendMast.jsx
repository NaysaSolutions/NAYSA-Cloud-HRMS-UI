// src/NAYSA Cloud/Reference File/VendMast.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
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

import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import ButtonBar from "@/NAYSA Cloud/Global/ButtonBar";
import SearchAttachment from "@/NAYSA Cloud/Lookup/SearchAttachment.jsx";
import SearchVendMast from "@/NAYSA Cloud/Lookup/SearchVendMast.jsx";

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
import PayeeSetupTab from "@/NAYSA Cloud/Master Data/CustMastTabs/PayeeSetupTab";
import PayeeMasterDataTab from "@/NAYSA Cloud/Master Data/CustMastTabs/PayeeMasterDataTab";
import ReferenceCodesTab from "@/NAYSA Cloud/Master Data/CustMastTabs/ReferenceCodesTab";
import { usePagePermission } from "@/NAYSA Cloud/Global/usePagePermission.js";
import PermissionBadge from "@/NAYSA Cloud/Global/PermissionBadge.jsx";

const normalizeSlType = (v) => {
  const s = String(v ?? "").toUpperCase().trim();
  if (!s) return "";
  if (["AG", "CU", "EM", "OT", "SU", "TN"].includes(s)) return s;
  if (s === "CUSTOMER") return "CU";
  if (s === "SUPPLIER") return "SU";
  if (s === "AGENCY") return "AG";
  if (s === "EMPLOYEE") return "EM";
  if (s === "OTHERS") return "OT";
  if (s === "TENANT") return "TN";
  return s;
};

const emptyForm = {
  sltypeCode: "SU",
  vendCode: "",
  vendName: "",
  vendContact: "",
  vendPosition: "",
  vendTelno: "",
  vendMobileno: "",
  vendEmail: "",
  vendAddr1: "",
  vendAddr2: "",
  vendAddr3: "",
  vendZip: "",
  vendTin: "",
  custCode: "",
  custName: "",
  custTin: "",
  custFaxNo: "",
  businessName: "",
  checkName: "",
  firstName: "",
  middleName: "",
  lastName: "",
  taxClass: "",
  atcCode: "",
  vatCode: "",
  paytermCode: "",
  source: "L",
  currCode: "PHP",
  branchCode: "",
  acctCode: "",
  active: "Y",
  oldCode: "",
  registeredBy: "",
  registeredDate: "",
  updatedBy: "",
  updatedDate: "",
  __isNew: false,
};

const VendMast = () => {
  const [activeTab, setActiveTab] = useState("setup");
  const [isLoading, setIsLoading] = useState(false);

  const docType = "VendMast";
  const guideRef = useRef(null);
  const pdfLink = reftablesPDFGuide?.[docType] || "#";
  const videoLink = reftablesVideoGuide?.[docType] || "#";
  const [isOpenGuide, setOpenGuide] = useState(false);

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

  const {
    pagePermission,
    isReadOnly,
    isFullAccess,
    canAdd,
    canEdit,
    canSave,
    canDelete,
  } = usePagePermission({
    componentKey: "VendMast",
    menuName: "Payee Master Data",
    debug: true,
  });

  const showReadOnlyAlert = async (action = "perform this action") => {
    await Swal.fire({
      icon: "warning",
      title: "Read Only",
      text: `You only have read access. You are not allowed to ${action}.`,
    });
  };

  const [form, setForm] = useState({ ...emptyForm });
  const [selectedVendCode, setSelectedVendCode] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const refTabRef = useRef(null);
  const [refState, setRefState] = useState({ isEditing: false, canSave: false });

  const allowedDuplicatePayeeNameRef = useRef("");

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAttachOpen, setIsAttachOpen] = useState(false);

  const [subsidiaryType, setSubsidiaryType] = useState("");
  const [masterFilters, setMasterFilters] = useState({});
  const [masterAllRows, setMasterAllRows] = useState([]);
  const [masterRows, setMasterRows] = useState([]);

  const updateForm = (patch) => {
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const showValidation = async (title, lines) => {
    const msg = Array.isArray(lines) ? lines.join("\n") : String(lines || "");
    return useSwalValidationAlert({ icon: "error", title, message: msg });
  };

  const checkDuplicateVendor = async (vendCode) => {
    const payload = {
      json_data: JSON.stringify({
        json_data: { vendCode: String(vendCode || "").trim() },
      }),
    };
    const res = await apiClient.post("/checkDuplicatePayee", payload);
    const rows = res?.data?.data || [];
    return Number(rows?.[0]?.result ?? 0) === 1;
  };

  const checkInUsedVendor = async (vendCode) => {
    const payload = {
      json_data: JSON.stringify({
        json_data: { vendCode: String(vendCode || "").trim() },
      }),
    };
    const res = await apiClient.post("/checkInUsedPayee", payload);
    const rows = res?.data?.data || [];
    return Number(rows?.[0]?.result ?? 0) === 1;
  };

  const extractSprocError = (axiosResponse) => {
    const payload = axiosResponse?.data;
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
    return String(form?.vendCode || form?.custCode || "").trim();
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
    if (Array.isArray(rows) && rows.length && typeof rows[0] === "object") return rows;
    return [];
  };

  const loadMasterList = async (options = {}) => {
    const {
      page = 1,
      pageSize = 300,
      filters = masterFilters,
      sltypeCode = subsidiaryType,
    } = options;

    const cleanedFilters = Object.fromEntries(
      Object.entries(filters || {}).map(([key, value]) => [key, String(value || "").trim()])
    );

    setIsLoading(true);
    try {
      const res = await apiClient.get("/payee", {
        params: {
          page,
          pageSize,
          sltypeCode: normalizeSlType(sltypeCode),
          ...cleanedFilters,
        },
        timeout: 120000,
      });

      const parsed = parseSprocJsonResult(res?.data?.data);
      const list = Array.isArray(parsed) ? parsed : [];

      const normalized = list.map((x) => ({
        ...x,
        sltypeCode: normalizeSlType(x?.sltypeCode),
        vendCode: x?.vendCode ?? "",
        vendName: x?.vendName ?? "",
        address:
          x?.address ??
          [x?.vendAddr1, x?.vendAddr2, x?.vendAddr3].filter(Boolean).join(" "),
      }));

      setMasterAllRows(normalized);
      setMasterRows(normalized);
    } catch (e) {
      console.error(e);
      Swal.fire(
        "Error",
        e?.code === "ECONNABORTED"
          ? "Payee list loading timed out. Please use a filter or try again."
          : "Failed to load payee list.",
        "error"
      );
      setMasterAllRows([]);
      setMasterRows([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMasterList();
  }, []);

  const handleOpenAttach = async () => {
    if (isReadOnly) {
      await showReadOnlyAlert("attach documents");
      return;
    }

    const code = String(form?.vendCode || form?.custCode || "").trim();
    if (!code) {
      await useSwalValidationAlert({
        icon: "warning",
        title: "Required",
        message: "Payee Code is required.",
      });
      return;
    }
    setIsAttachOpen(true);
  };

  const fetchVendorByCode = async (vendCode) => {
    const code = String(vendCode || "").trim();
    if (!code) return;

    setIsLoading(true);
    try {
      const res = await apiClient.post("/getPayee", { VEND_CODE: code });
      const parsed = parseSprocJsonResult(res?.data?.data);
      const row = Array.isArray(parsed) ? parsed?.[0] : null;

      if (!row) {
        await useSwalErrorAlert("Info", "Payee not found.");
        return;
      }

      const sl = normalizeSlType(row?.sltypeCode ?? "SU");

      updateForm({
        ...emptyForm,
        __isNew: false,
        sltypeCode: sl,
        vendCode: code,
        custCode: code,
        vendName: row?.vendName ?? "",
        custName: row?.vendName ?? "",
        vendContact: row?.vendContact ?? "",
        vendPosition: row?.vendPosition ?? "",
        vendTelno: row?.vendTelno ?? "",
        vendMobileno: row?.vendMobileno ?? "",
        vendEmail: row?.vendEmail ?? "",
        vendAddr1: row?.vendAddr1 ?? "",
        vendAddr2: row?.vendAddr2 ?? "",
        vendAddr3: row?.vendAddr3 ?? "",
        vendZip: row?.vendZip ?? "",
        vendTin: row?.vendTin ?? "",
        custTin: row?.vendTin ?? "",
        businessName: row?.businessName ?? "",
        checkName: row?.checkName ?? "",
        firstName: row?.firstName ?? "",
        middleName: row?.middleName ?? "",
        lastName: row?.lastName ?? "",
        taxClass: row?.taxClass ?? "",
        branchCode: row?.branchCode ?? "",
        source: row?.source ?? "L",
        currCode: row?.currCode ?? "PHP",
        vatCode: row?.vatCode ?? "",
        atcCode: row?.atcCode ?? "",
        paytermCode: row?.paytermCode ?? "",
        acctCode: row?.acctCode ?? "",
        active: row?.active ?? "Y",
        oldCode: row?.oldcode ?? row?.oldCode ?? "",
        registeredBy: row?.registeredBy ?? row?.registered_by ?? "",
        registeredDate: row?.registeredDate ?? row?.registered_date ?? "",
        updatedBy: row?.updatedBy ?? row?.updated_by ?? "",
        updatedDate: row?.updatedDate ?? row?.updated_date ?? "",
      });

      setSelectedVendCode(code);
    } catch (e) {
      console.error(e);
      await useSwalErrorAlertAPI("Fetch Error", e?.message || "Failed to fetch payee.");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteVendor = async () => {
    if (!canDelete) {
      await showReadOnlyAlert("delete payee records");
      return;
    }

    const code = String(form?.vendCode || form?.custCode || "").trim();
    if (!code) {
      await showValidation("Missing Required Field(s)", ["• Payee Code"]);
      return;
    }

    const isUsed = await checkInUsedVendor(code);
    if (isUsed) {
      await useSwalErrorAlert(
        "Delete Not Allowed",
        `Payee Code ${code} is already used in transaction(s).`
      );
      return;
    }

    const confirm = await useSwalDeleteConfirm(
      "Delete Payee?",
      `This will permanently delete Payee Code ${code}. This action cannot be undone.`
    );
    if (!confirm?.isConfirmed) return;

    setIsLoading(true);
    try {
      const res = await apiClient.post("/deletePayee", {
        VEND_CODE: code,
        USER_CODE: userCode,
      });

      const rows = res?.data?.data || [];
      const r0 = rows[0] || {};

      const errorCount = Number(r0.errorcount ?? r0.errorCount ?? 0);
      const errorMsg = String(r0.errormsg ?? r0.errorMsg ?? "");

      if (errorCount > 0) {
        await useSwalErrorAlert("Delete Not Allowed", errorMsg || "Unable to delete payee.");
        return;
      }

      await useSwalDeleteRecord("Deleted", `Payee Code ${code} has been successfully removed.`);

      setForm({ ...emptyForm });
      setSelectedVendCode("");
      setIsEditing(false);
      await loadMasterList();
    } catch (e) {
      console.error(e);
      await useSwalErrorAlert("Error", e?.response?.data?.message || e?.message || "Failed to delete payee.");
    } finally {
      setIsLoading(false);
    }
  };

  const upsertVendor = async () => {
    if (!canSave) {
      await showReadOnlyAlert("save payee records");
      return;
    }

    // 1. DUPLICATE NAME CHECK
    // const canProceed = await confirmDuplicatePayeeName(form.vendName || form.custName);
    // if (!canProceed) return;

    let code = String(form?.vendCode || form?.custCode || "").trim();
    const isAddMode = !selectedVendCode;

    // 2. DUPLICATE CODE CHECK
    if (isAddMode && code) {
      const isDuplicate = await checkDuplicateVendor(code);
      if (isDuplicate) {
        await useSwalErrorAlert("Duplicate Record", `Payee Code ${code} already exists.`);
        return;
      }
    }

    setIsLoading(true);
    try {
      const jsonData = {
        json_data: {
          action: selectedVendCode ? "edit" : "add",
          vendCode: code, 
          vendName: form.vendName || form.custName || "",
          businessName: form.businessName || "",
          checkName: form.checkName || "",
          firstName: form.firstName || "",
          middleName: form.middleName || "",
          lastName: form.lastName || "",
          taxClass: form.taxClass || "",
          vendAddr1: form.vendAddr1 || "",
          vendAddr2: form.vendAddr2 || "",
          vendAddr3: form.vendAddr3 || "",
          vendZip: form.vendZip || "",
          vendTin: form.vendTin || form.custTin || "",
          branchCode: form.branchCode || "",
          vendContact: form.vendContact || "",
          vendPosition: form.vendPosition || "",
          vendTelno: form.vendTelno || "",
          vendMobileno: form.vendMobileno || "",
          vendEmail: form.vendEmail || "",
          source: form.source || "",
          currCode: form.currCode || "",
          vatCode: form.vatCode || "",
          atcCode: form.atcCode || "",
          paytermCode: form.paytermCode || "",
          acctCode: form.acctCode || "",
          sltypeCode: normalizeSlType(form.sltypeCode),
          active: form.active || "Y",
          oldCode: form.oldCode || "",
          userCode,
        },
      };

      const payload = {
        json_data: JSON.stringify(jsonData),
      };

      const res = await apiClient.post("/upsertPayee", payload);
      const sprocErr = extractSprocError(res);

      if (sprocErr?.errorCount > 0) {
        await useSwalErrorAlert(
          "Validation Failed",
          sprocErr.errorMsg || "Please complete the required fields."
        );
        return;
      }

      const finalCode = sprocErr?.generatedCode || code;

      await useSwalSuccessAlert("Success!", "Payee saved successfully.");
      setSelectedVendCode(finalCode);
      setIsEditing(false);
      await loadMasterList();
      await fetchVendorByCode(finalCode);
    } catch (e) {
      console.error(e);
      const sprocErr = extractSprocError(e?.response);
      if (sprocErr?.errorMsg) {
        await useSwalErrorAlert("Save Failed", String(sprocErr.errorMsg));
        return;
      }
      const msg = e?.response?.data?.message || e?.message || "Failed to save payee.";
      await useSwalErrorAlert("Save Failed", msg);
    } finally {
      setIsLoading(false);
    }
  };

  const applyMasterFilters = async () => {
    await loadMasterList({
      page: 1,
      pageSize: 300,
      filters: masterFilters,
      sltypeCode: subsidiaryType,
    });
  };

  const resetMasterFilters = async () => {
    setSubsidiaryType("");
    setMasterFilters({});
    await loadMasterList({ page: 1, pageSize: 300, filters: {}, sltypeCode: "" });
  };

  const handleChangeMasterFilter = (key, value) => {
    setMasterFilters((p) => ({ ...p, [key]: value }));
  };

  const handleAdd = async () => {
    if (!canAdd) {
      await showReadOnlyAlert("add payee records");
      return;
    }

    allowedDuplicatePayeeNameRef.current = ""; // Reset ref memory
    const sl = normalizeSlType(form?.sltypeCode || "SU") || "SU";
    setSelectedVendCode("");
    setForm({
      ...emptyForm,
      sltypeCode: sl,
      vendCode: "",
      custCode: "",
      __isNew: true,
    });
    setIsEditing(true);
    setActiveTab("setup");
  };

  const handleEdit = async () => {
    if (!canEdit) {
      await showReadOnlyAlert("edit payee records");
      return;
    }

    const code = String(form?.vendCode || "").trim();
    if (!code) {
      await useSwalErrorAlert({
        icon: "warning",
        title: "Required",
        message: "Please select a Payee record first.",
      });
      return;
    }
    setIsEditing(true);
    setActiveTab("setup");
  };

  const handleResetSetup = () => {
    allowedDuplicatePayeeNameRef.current = ""; // Reset ref memory
    setSelectedVendCode("");
    setForm({ ...emptyForm });
    setIsEditing(false);
  };

  const tabs = useMemo(
    () => [
      { id: "setup", label: "Payee Set-Up", icon: faFolderOpen },
      { id: "master", label: "Payee Master Data", icon: faList },
      { id: "ref", label: "Reference Codes", icon: faTags },
    ],
    []
  );

  const handleMasterRowDoubleClick = async (row) => {
    const code = String(row?.vendCode || row?.code || "").trim();
    if (!code) return;

    setActiveTab("setup");
    await fetchVendorByCode(code);

    // READ ONLY = retrieve/view only
    // FULL ACCESS = retrieve and edit
    setIsEditing(canEdit);
  };

  const headerButtons = useMemo(() => {
    const baseBtn = "flex items-center justify-center h-8 w-8 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md transition-all shadow-sm";

    if (activeTab === "setup") {
      const hasRecord = String(form?.vendCode || form?.custCode || "").trim() && !form.__isNew;

      return [
        {
          key: "add",
          label: <span className="hidden sm:inline ml-1">Add</span>,
          icon: faPlus,
          onClick: handleAdd,
          disabled: isLoading || !canAdd,
          className: `${baseBtn} ${isLoading || !canAdd ? "bg-blue-400 opacity-50 cursor-not-allowed text-white" : "bg-blue-600 text-white hover:bg-blue-700"}`,
        },
        {
          key: "save",
          label: <span className="hidden sm:inline ml-1">Save</span>,
          icon: faSave,
          onClick: upsertVendor,
          disabled: isLoading || !isEditing || !canSave,
          className: `${baseBtn} ${isLoading || !isEditing || !canSave ? "bg-blue-500 opacity-50 cursor-not-allowed text-white" : "bg-blue-600 text-white hover:bg-blue-700"}`,
        },
        {
          key: "reset",
          label: <span className="hidden sm:inline ml-1">Reset</span>,
          icon: faUndo,
          onClick: handleResetSetup,
          disabled: isLoading,
          className: `${baseBtn} bg-blue-600 text-white hover:bg-blue-700`,
        },
        {
          key: "edit",
          label: <span className="hidden sm:inline ml-1">Edit</span>,
          icon: faPenToSquare,
          onClick: handleEdit,
          disabled: isLoading || isEditing || !hasRecord || !canEdit,
          className: `${baseBtn} ${isLoading || isEditing || !hasRecord || !canEdit ? "bg-blue-400 opacity-50 cursor-not-allowed text-white" : "bg-blue-600 text-white hover:bg-blue-700"}`,
        },
        {
          key: "attach",
          label: <span className="hidden sm:inline ml-1">Attach</span>,
          icon: faPaperclip,
          onClick: handleOpenAttach,
          disabled: isLoading || !hasRecord || isReadOnly,
          className: `${baseBtn} ${isLoading || !hasRecord || isReadOnly ? "bg-blue-400 opacity-50 cursor-not-allowed text-white" : "bg-blue-600 text-white hover:bg-blue-700"}`,
        },
        {
          key: "delete",
          label: <span className="hidden sm:inline ml-1">Delete</span>,
          icon: faTrash,
          onClick: deleteVendor,
          disabled: isLoading || isEditing || !hasRecord || !canDelete,
          className: `${baseBtn} ${isLoading || isEditing || !hasRecord || !canDelete ? "bg-red-400 opacity-50 cursor-not-allowed text-white" : "bg-red-500 text-white hover:bg-red-600"}`,
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
              await showReadOnlyAlert("add reference codes");
              return;
            }
            refTabRef.current?.add?.();
          },
          disabled: !canAdd,
          className: `${baseBtn} ${!canAdd ? "bg-blue-400 opacity-50 cursor-not-allowed text-white" : "bg-blue-600 text-white hover:bg-blue-700"}`,
        },
        {
          key: "save",
          label: <span className="hidden sm:inline ml-1">Save</span>,
          icon: faSave,
          onClick: async () => {
            if (!canSave) {
              await showReadOnlyAlert("save reference codes");
              return;
            }
            refTabRef.current?.save?.();
          },
          disabled: !refState.canSave || !canSave,
          className: `${baseBtn} ${!refState.canSave || !canSave ? "bg-blue-500 opacity-50 cursor-not-allowed text-white" : "bg-blue-600 text-white hover:bg-blue-700"}`,
        },
        {
          key: "reset",
          label: <span className="hidden sm:inline ml-1">Reset</span>,
          icon: faUndo,
          onClick: () => refTabRef.current?.reset?.(),
          className: `${baseBtn} bg-blue-600 text-white hover:bg-blue-700`,
        },
      ];
    }

    return [];
  }, [activeTab, isLoading, isEditing, form, refState, canAdd, canEdit, canSave, canDelete, isReadOnly]);

  return (
    <div className="global-ref-main-div-ui">
      <div className="global-ref-header-ui">
        <div className="w-full flex flex-col lg:flex-row items-center justify-between gap-3">
          {/* LEFT: title + tabs grouped together */}
          <div className="flex flex-col lg:flex-row items-center lg:items-center gap-2 lg:gap-4 w-full lg:w-auto">
            <div className="flex-shrink-0 text-center lg:text-left">
              <h1 className="global-ref-headertext-ui truncate flex items-center gap-2">
                {activeTab === "setup" && "Payee Master Data"}
                {activeTab === "master" && "Payee Master Data"}
                {activeTab === "ref" && "Payee Master Data"} 
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
            {!!headerButtons.length && <ButtonBar buttons={headerButtons} />}
            {activeTab === "setup" && (
              <div ref={guideRef} className="relative z-[60]">
                <button
                  onClick={() => setOpenGuide((v) => !v)}
                  className="flex items-center justify-center h-8 w-8 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-sm"
                >
                  <FontAwesomeIcon icon={faInfoCircle} className="text-[12px]" />
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
          <PayeeSetupTab
            isLoading={isLoading}
            isEditing={isEditing && canEdit}
            isReadOnly={isReadOnly}
            canAdd={canAdd}
            canEdit={canEdit}
            canSave={canSave}
            canDelete={canDelete}
            form={form}
            sltypeOptions={[
              { value: "AG", label: "AGENCY" },
              { value: "EM", label: "EMPLOYEE" },
              { value: "OT", label: "OTHERS" },
              { value: "SU", label: "SUPPLIER" },
            ]}
            sourceOptions={[
              { value: "L", label: "Local" },
              { value: "F", label: "Foreign" },
            ]}
            activeOptions={[
              { value: "Y", label: "Yes" },
              { value: "N", label: "No" },
            ]}
            onChangeForm={(patch) => {
              // Reset duplicate name memory if name is manually changed
              if (patch.vendName || patch.custName) {
                allowedDuplicatePayeeNameRef.current = "";
              }
              updateForm(patch);
            }}
            // onNameBlur={confirmDuplicatePayeeName} // Pass the name blur logic
            onSelectCustomerCode={fetchVendorByCode}
          />
        )}

        {activeTab === "master" && (
          <PayeeMasterDataTab
            isLoading={isLoading}
            subsidiaryType={subsidiaryType}
            onChangeSubsidiaryType={setSubsidiaryType}
            filters={masterFilters}
            onChangeFilter={handleChangeMasterFilter}
            rows={masterRows}
            onFilter={applyMasterFilters}
            onReset={resetMasterFilters}
            onPrint={() => Swal.fire("Info", "Print not yet wired.", "info")}
            onExport={() => Swal.fire("Info", "Export not yet wired.", "info")}
            onRowDoubleClick={handleMasterRowDoubleClick}
          />
        )}

        {activeTab === "ref" && (
          <ReferenceCodesTab
            ref={refTabRef}
            onStateChange={setRefState}
            variant="vendor"
            isReadOnly={isReadOnly}
            canAdd={canAdd}
            canEdit={canEdit}
            canSave={canSave}
            canDelete={canDelete}
          />
        )}
      </div>

      <SearchAttachment
        isOpen={isAttachOpen}
        onClose={() => setIsAttachOpen(false)}
        params={{
          DocumentID: documentNo,
          Title: "Payee Master Data",
          CodeLabel: "Payee Code",
          Code: documentNo,
          NameLabel: "Payee Name",
          Name: form.vendName || "N/A"
        }}
      />

      <SearchVendMast
        isOpen={isSearchOpen}
        customParam="ActiveAll"
        endpoint="/lookupVendMast"
        onClose={async (selected) => {
          setIsSearchOpen(false);
          if (!selected) return;
          const code = getValue(selected?.vendCode) || getValue(selected?.vend_code);
          if (code) {
              await fetchVendorByCode(code);
          }
        }}
      />
    </div>
  );
};

export default VendMast;