import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer";

import SearchCusMast from "@/NAYSA Cloud/Lookup/SearchCustMast.jsx";
import SearchBranchRef from "@/NAYSA Cloud/Lookup/SearchBranchRef.jsx";
import SearchATCRef from "@/NAYSA Cloud/Lookup/SearchATCRef.jsx";
import SearchVATRef from "@/NAYSA Cloud/Lookup/SearchVATRef.jsx";
import SearchBillTermRef from "@/NAYSA Cloud/Lookup/SearchBillTermRef.jsx";
import SearchCurrRef from "@/NAYSA Cloud/Lookup/SearchCurrRef.jsx";
import SearchSalesRepRef from "@/NAYSA Cloud/Lookup/SearchSalesRepRef.jsx";
import CustTypeLookupModal from "@/NAYSA Cloud/Lookup/SearchCustType.jsx";
import AreaLookupModal from "@/NAYSA Cloud/Lookup/SearchArea.jsx";
import ZoneLookupModal from "@/NAYSA Cloud/Lookup/SearchZone.jsx";
import WarehouseLookupModal from "@/NAYSA Cloud/Lookup/SearchWareMast.jsx";
import RegistrationInfo from "@/NAYSA Cloud/Global/RegistrationInfo.jsx";
import {
  useFieldLenghtCheck,
  useGetFieldLength,
} from "@/NAYSA Cloud/Global/procedure";

const SectionHeader = ({ title }) => (
  <div className="mb-3">
    <div className="text-[9px] sm:text-[12px] font-bold text-slate-500 tracking-widest border-b pb-2">
      {title}
    </div>
  </div>
);

const Card = ({ children, className = "" }) => (
  <div
    className={[
      "global-tran-textbox-group-div-ui flex flex-col",
      "transition-all duration-150",
      "focus-within:ring-2 focus-within:ring-blue-400/60 focus-within:shadow-2xl",
      "focus-within:-translate-y-[1px]",
      className,
    ].join(" ")}
  >
    {children}
  </div>
);

const normalizeUpper = (v) => String(v ?? "").toUpperCase().trim();

const getValue = (input) => {
  if (input && typeof input === "object") {
    if ("target" in input) return input.target?.value ?? "";
    if ("value" in input) return input.value ?? "";
  }
  return input ?? "";
};

// --- Sidebar tab definitions ---
const TABS = [
  {
    id: "contact",
    label: "Contact",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
        <path d="M2 14c0-3.314 2.686-5 6-5s6 1.686 6 5" />
      </svg>
    ),
  },
  {
    id: "accounting",
    label: "Accounting",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="12" height="10" rx="1.5" />
        <path d="M5 7h6M5 10h4" />
      </svg>
    ),
  },
  {
    id: "sales",
    label: "Sales",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12l3-4 3 2 3-5 3 3" />
        <path d="M2 14h12" />
      </svg>
    ),
  },
  {
    id: "cc",
    label: "Credit & Collection",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1.5" y="4" width="13" height="9" rx="1.5" />
        <path d="M1.5 7h13" />
        <path d="M5 10.5h2M10 10.5h1.5" />
      </svg>
    ),
  },
  {
    id: "tcsignatory",
    label: "TC Signatory",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.5 2.5l3 3-7 7H3.5v-3l7-7z" />
        <path d="M8.5 4.5l3 3" />
      </svg>
    ),
  },
];

const CustSetupTab = forwardRef(
  (
    {
      isLoading,
      isEditing,
      form = {},
      generationMode,
      sltypeOptions = [],
      sourceOptions = [],
      activeOptions = [],
      onChangeForm,
      onNameBlur,
      onSelectCustomerCode,
      taxClassOptions = [],
    },
    ref
  ) => {
    useImperativeHandle(ref, () => ({}));

    const isNewRecord = form.__isNew;
    const isReadOnly = !isEditing;
    const isDisabled = isReadOnly || isLoading;

    const [tblFieldArray, setTblFieldArray] = useState([]);
    const [activeTab, setActiveTab] = useState("contact");
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    useEffect(() => {
      const run = async () => {
        try {
          const result = await useFieldLenghtCheck("cust_mast");
          if (result) setTblFieldArray(result);
        } catch (e) {
          console.error("Failed to load field lengths:", e);
        }
      };
      run();
    }, []);

    const getLen = (col, fallback = undefined) => {
      const n = useGetFieldLength(tblFieldArray, col);
      return n || fallback;
    };

    // Same Manual/Auto behavior used by Payee Code.
    // Manual + new record = editable.
    // Auto + new record = read-only with lookup.
    // Existing record = read-only with lookup.
    const isManualMode = useMemo(() => {
      const mode = normalizeUpper(generationMode || "Auto");
      return mode === "MANUAL" || mode === "M";
    }, [generationMode]);

    const canTypeCustomerCode = isNewRecord && isManualMode;
    const customerCodeOverrideRef = useRef(null);

    useEffect(() => {
      const wrapper = customerCodeOverrideRef.current;
      if (!wrapper) return undefined;

      const input = wrapper.querySelector("input");
      if (!input) return undefined;

      if (canTypeCustomerCode) {
        const maxLen = getLen("cust_code", 20);

        input.removeAttribute("readonly");
        input.removeAttribute("disabled");
        input.setAttribute("maxlength", maxLen);
        input.style.pointerEvents = "auto";
        input.onclick = (e) => e.stopPropagation();

        input.oninput = (e) => {
          let val = e.target.value;

          if (val.length > maxLen) {
            val = val.substring(0, maxLen);
            e.target.value = val;
          }

          onChangeForm({ custCode: val });
        };
      } else {
        input.setAttribute("readonly", "true");
        input.style.pointerEvents = "";
        input.onclick = null;
        input.oninput = null;
      }

      return () => {
        input.onclick = null;
        input.oninput = null;
      };
    }, [canTypeCustomerCode, onChangeForm, tblFieldArray]);

    const sl = useMemo(
      () => normalizeUpper(form?.sltypeCode || ""),
      [form?.sltypeCode]
    );

    const taxClass = useMemo(
      () => normalizeUpper(form?.taxClass || ""),
      [form?.taxClass]
    );

    const isCustomer = ["CU", "CUST", "CUSTOMER"].includes(sl);
    const isEmployee = ["EM", "EMP", "EMPLOYEE"].includes(sl);
    const isIndividual = isEmployee || taxClass === "WI";

    const buildRegisteredName = (fn, mn, ln) => {
      return [fn, mn, ln]
        .map((v) => String(v ?? "").trim())
        .filter(Boolean)
        .join(" ");
    };

    const nameAutoRef = useRef({ businessTouched: false });

    const mappedSltypeOptions = useMemo(() => {
      const base = [
        { value: "CUSTOMER", label: "CUSTOMER" },
        { value: "AGENCY", label: "AGENCY" },
        { value: "OTHERS", label: "OTHERS" },
        { value: "EM", label: "EMPLOYEE" },
      ];

      const normalizeOption = (o) => {
        const value = normalizeUpper(
          typeof o === "string"
            ? o
            : o?.value ?? o?.code ?? o?.sltypeCode ?? o?.sltype_code ?? ""
        );

        if (!value) return null;

        const rawLabel = normalizeUpper(
          typeof o === "string"
            ? value
            : o?.label ?? o?.name ?? o?.sltypeName ?? o?.sltype_name ?? value
        );

        // Display EMPLOYEE but save EM, so code generation becomes EM000001.
        if (["EM", "EMP", "EMPLOYEE"].includes(value) || rawLabel === "EMPLOYEE") {
          return { value: "EM", label: "EMPLOYEE" };
        }

        return { value, label: rawLabel };
      };

      const extra = (Array.isArray(sltypeOptions) ? sltypeOptions : [])
        .map(normalizeOption)
        .filter(Boolean);

      const seen = new Set();
      return [...extra, ...base].filter((x) => {
        const key = x.label || x.value;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }, [sltypeOptions]);

    useEffect(() => {
      if (!isEditing) return;

      if (["EMP", "EMPLOYEE"].includes(sl)) {
        onChangeForm({ sltypeCode: "EM" });
        return;
      }

      const desiredTaxClass = isCustomer ? "WC" : isEmployee ? "WI" : "";
      if (desiredTaxClass && taxClass !== desiredTaxClass) {
        onChangeForm({ taxClass: desiredTaxClass });
      }
    }, [isEditing, isCustomer, isEmployee, sl, taxClass, onChangeForm]);

    useEffect(() => {
      if (!isEditing || !isIndividual) return;
      const reg = buildRegisteredName(form.firstName, form.middleName, form.lastName);
      if (reg && ((form.custName || "") !== reg || (form.businessName || "") !== reg)) {
        onChangeForm({
          custName: reg,
          businessName: reg,
        });
      }
    }, [
      isEditing,
      isIndividual,
      form.firstName,
      form.middleName,
      form.lastName,
      form.custName,
      form.businessName,
      onChangeForm,
    ]);

    const mappedTaxClassOptions = useMemo(() => {
      const base = [
        { value: "WC", label: "Corporation" },
        { value: "WI", label: "Individual" },
      ];
      const extra = (Array.isArray(taxClassOptions) ? taxClassOptions : [])
        .map((o) => {
          const val = normalizeUpper(o?.value ?? o?.code ?? o);
          return val === "WC" || val === "WI" || !val
            ? null
            : { value: val, label: o?.label || o?.name || val };
        })
        .filter(Boolean);
      const seen = new Set();
      return [...base, ...extra].filter(
        (x) => !seen.has(x.value) && seen.add(x.value)
      );
    }, [taxClassOptions]);

    // --- Lookup open states (individual, matching PayeeSetupTab pattern) ---
    const [isCustLookupOpen, setIsCustLookupOpen] = useState(false);
    const [isBranchLookupOpen, setIsBranchLookupOpen] = useState(false);
    const [isATCLookupOpen, setIsATCLookupOpen] = useState(false);
    const [isVATLookupOpen, setIsVATLookupOpen] = useState(false);
    const [isBillTermLookupOpen, setIsBillTermLookupOpen] = useState(false);
    const [isCurrLookupOpen, setIsCurrLookupOpen] = useState(false);
    const [isSalesRepLookupOpen, setIsSalesRepLookupOpen] = useState(false);
    const [isCustTypeLookupOpen, setIsCustTypeLookupOpen] = useState(false);
    const [isAreaLookupOpen, setIsAreaLookupOpen] = useState(false);
    const [isZoneLookupOpen, setIsZoneLookupOpen] = useState(false);
    const [isWarehouseLookupOpen, setIsWarehouseLookupOpen] = useState(false);
    const [isChainCustomerLookupOpen, setIsChainCustomerLookupOpen] = useState(false);

    const openCustomerLookup = () => {
      if (isLoading) return;
      setIsCustLookupOpen(true);
    };

    return (
      <>
        <div className="flex flex-col gap-6 rounded-lg relative">

          {/* ── TOP CARD: Basic Information ── */}
          <Card className="border border-blue-500/30 p-6 rounded-lg">
            <SectionHeader title="BASIC INFORMATION" />

            {/* Row 1: SL Type | Active | Branch */}
            <div className="grid grid-cols-3 gap-3">
              <FieldRenderer
                label="SL Type"
                type="select"
                value={form?.sltypeCode || ""}
                options={mappedSltypeOptions}
                onChange={(v) => {
                  const nextSl = normalizeUpper(getValue(v));
                  const updates = { sltypeCode: nextSl };

                  if (["EM", "EMP", "EMPLOYEE"].includes(nextSl)) {
                    updates.sltypeCode = "EM";
                    updates.taxClass = "WI";
                  } else if (["CU", "CUST", "CUSTOMER"].includes(nextSl)) {
                    updates.taxClass = "WC";
                  }

                  onChangeForm(updates);
                }}
                readOnly={isReadOnly}
                disabled={isDisabled}
              />
              <FieldRenderer
                label="Active?"
                type="select"
                value={form?.active || "Y"}
                options={activeOptions}
                onChange={(v) => onChangeForm({ active: getValue(v) })}
                readOnly={isReadOnly}
                disabled={isDisabled}
              />
              <FieldRenderer
                label="Branch"
                type="lookup"
                value={form?.branchCode || ""}
                onLookup={isDisabled ? undefined : () => setIsBranchLookupOpen(true)}
                readOnly={isReadOnly}
                disabled={isDisabled}
              />
            </div>

            {/* Row 2: Customer Code | Tax Rate Class | Old Code */}
            <div className="grid grid-cols-3 gap-3">
              <div
                ref={customerCodeOverrideRef}
                className={`w-full ${
                  !canTypeCustomerCode
                    ? "[&>div]:!bg-[#F1F5F9] [&_input]:!bg-transparent [&_input]:!pointer-events-none [&_input]:!text-slate-600 [&_button]:!text-slate-400 [&_label]:!bg-[#F1F5F9]"
                    : ""
                }`}
              >
                <FieldRenderer
                  key={`customer-code-${canTypeCustomerCode ? "manual" : "readonly"}`}
                  label="Customer Code"
                  required
                  type="lookup"
                  editableLookup
                  value={form?.custCode || ""}
                  onChange={
                    canTypeCustomerCode
                      ? (v) => onChangeForm({ custCode: getValue(v) })
                      : undefined
                  }
                  onLookup={
                    canTypeCustomerCode
                      ? undefined
                      : openCustomerLookup
                  }
                  readOnly={!canTypeCustomerCode}
                  disabled={isLoading}
                  maxLength={getLen("cust_code", 20)}
                />
              </div>
              <FieldRenderer
                label="Tax Rate Class"
                required
                type="select"
                value={taxClass}
                options={mappedTaxClassOptions}
                onChange={(v) => onChangeForm({ taxClass: getValue(v) })}
                readOnly={isReadOnly}
                disabled={isDisabled}
              />
              <FieldRenderer
                label="Old Code"
                type="text"
                value={form?.oldCode || ""}
                onChange={(v) => onChangeForm({ oldCode: getValue(v) })}
                readOnly={isReadOnly}
                disabled={isDisabled}
                maxLength={getLen("old_code", 50)}
              />
            </div>

            {/* Row 3: Registered Name | Business Name */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FieldRenderer
                label="Registered Name"
                required
                type="text"
                value={form?.custName || ""}
                onChange={(v) => onChangeForm({ custName: getValue(v) })}
                onBlur={async () => {
                  if (!isEditing || !form?.custName) return;
                  await onNameBlur?.(form?.custName);
                }}
                readOnly={isReadOnly || isIndividual}
                disabled={isDisabled || isIndividual}
                maxLength={getLen("cust_name", 150)}
              />
              <FieldRenderer
                label="Business Name"
                required={!isIndividual}
                type="text"
                value={form?.businessName || ""}
                onChange={(v) => {
                  const businessName = getValue(v);
                  nameAutoRef.current.businessTouched = true;
                  const updates = { businessName };
                  if (!isIndividual) {
                    updates.custName = businessName;
                  }
                  onChangeForm(updates);
                }}
                readOnly={isReadOnly}
                disabled={isDisabled}
                maxLength={getLen("business_name", 150)}
              />
            </div>

            {/* Row 4: First Name | Middle Name | Last Name */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <FieldRenderer
                label="First Name"
                required={isIndividual}
                type="text"
                value={form?.firstName || ""}
                onChange={(v) => onChangeForm({ firstName: getValue(v) })}
                readOnly={isReadOnly || !isIndividual}
                disabled={isDisabled || !isIndividual}
                maxLength={getLen("first_name", 100)}
              />
              <FieldRenderer
                label="Middle Name"
                type="text"
                value={form?.middleName || ""}
                onChange={(v) => onChangeForm({ middleName: getValue(v) })}
                readOnly={isReadOnly || !isIndividual}
                disabled={isDisabled || !isIndividual}
                maxLength={getLen("middle_name", 100)}
              />
              <FieldRenderer
                label="Last Name"
                required={isIndividual}
                type="text"
                value={form?.lastName || ""}
                onChange={(v) => onChangeForm({ lastName: getValue(v) })}
                readOnly={isReadOnly || !isIndividual}
                disabled={isDisabled || !isIndividual}
                maxLength={getLen("last_name", 100)}
              />
            </div>
          </Card>

         

          {/* ── MIDDLE CARD: Collapsible Sidebar ── */}
          <Card className="border border-blue-500/30 rounded-lg overflow-hidden !focus-within:ring-0 !focus-within:shadow-none !focus-within:-translate-y-0">
            <div className="flex flex-col md:flex-row">

              {/* ── Sidebar ── */}
              <div
                className={`flex md:flex-col border-b md:border-b-0 md:border-r border-blue-500/30 bg-slate-50 transition-all duration-200 ${sidebarCollapsed ? "md:w-12 md:min-w-[48px]" : "md:w-48 md:min-w-[192px]"}`}
              >
                {/* Toggle button — desktop only */}
                <button
                  type="button"
                  onClick={() => setSidebarCollapsed((v) => !v)}
                  className="hidden md:flex items-center justify-end px-3 py-3 border-b border-blue-500/30 hover:bg-white transition-colors"
                >
                  <svg
                    width="18" height="18" viewBox="0 0 16 16" fill="none"
                    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
                    className={`text-slate-400 transition-transform duration-200 ${sidebarCollapsed ? "rotate-180" : ""}`}
                  >
                    <path d="M10 3L5 8L10 13" />
                  </svg>
                </button>

                {/* Tab items */}
                <div className="flex flex-row md:flex-col gap-2 md:gap-1 p-2 flex-1 overflow-x-auto">
                  {TABS.map((tab) => (
                    <div key={tab.id} className="relative group flex-shrink-0 md:flex-shrink">
                      <button
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-3 w-full text-left rounded transition-colors duration-150 overflow-hidden whitespace-nowrap
                          ${sidebarCollapsed ? "md:justify-center md:px-0 md:py-2 px-4 py-2" : "px-4 py-2 md:px-3 md:py-2.5"}
                          ${activeTab === tab.id
                            ? "bg-blue-50 text-blue-700 md:border-b-0 border-b-2 md:border-l-2 border-blue-600 rounded-none"
                            : "text-slate-500 hover:bg-white hover:text-slate-700"
                          }`}
                      >
                        <span className="flex-shrink-0">{tab.icon}</span>
                        <span className={`text-[12px] font-medium truncate ${sidebarCollapsed ? "md:hidden" : "block"}`}>
                          {tab.label}
                        </span>
                      </button>
                      {/* Tooltip when collapsed */}
                      {sidebarCollapsed && (
                        <div className="absolute left-12 top-1/2 -translate-y-1/2 z-10 hidden md:group-hover:block bg-white border border-slate-200 rounded-md px-3 py-1.5 text-[12px] font-medium text-slate-700 whitespace-nowrap shadow-sm pointer-events-none">
                          {tab.label}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Content Area ── */}
              <div className="flex-1 p-5 md:p-6 space-y-4 min-w-0">

                {/* ── CONTACT ── */}
                {activeTab === "contact" && (
                  <>
                    <SectionHeader title="CONTACT INFORMATION" />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <FieldRenderer
                        label="Contact Person"
                        type="text"
                        value={form?.custContact || ""}
                        onChange={(v) => onChangeForm({ custContact: getValue(v) })}
                        readOnly={isReadOnly}
                        disabled={isDisabled}
                        maxLength={getLen("cust_contact", 100)}
                      />
                      <FieldRenderer
                        label="Position"
                        type="text"
                        value={form?.custPosition || ""}
                        onChange={(v) => onChangeForm({ custPosition: getValue(v) })}
                        readOnly={isReadOnly}
                        disabled={isDisabled}
                        maxLength={getLen("cust_position", 100)}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <FieldRenderer
                        label="Telephone No."
                        type="text"
                        value={form?.custTelno || ""}
                        onChange={(v) => onChangeForm({ custTelno: getValue(v) })}
                        readOnly={isReadOnly}
                        disabled={isDisabled}
                        maxLength={getLen("cust_telno", 50)}
                      />
                      <FieldRenderer
                        label="Mobile No."
                        type="text"
                        value={form?.custMobileno || ""}
                        onChange={(v) => onChangeForm({ custMobileno: getValue(v) })}
                        readOnly={isReadOnly}
                        disabled={isDisabled}
                        maxLength={getLen("cust_mobileno", 50)}
                      />
                    </div>

                    <FieldRenderer
                      label="Email Address"
                      type="text"
                      value={form?.custEmail || ""}
                      onChange={(v) => onChangeForm({ custEmail: getValue(v) })}
                      readOnly={isReadOnly}
                      disabled={isDisabled}
                      maxLength={getLen("cust_email", 150)}
                    />

                    <FieldRenderer
                      label="Address 1"
                      required
                      type="text"
                      value={form?.custAddr1 || ""}
                      onChange={(v) => onChangeForm({ custAddr1: getValue(v) })}
                      readOnly={isReadOnly}
                      disabled={isDisabled}
                      maxLength={getLen("cust_addr1", 255)}
                    />

                    <FieldRenderer
                      label="Address 2"
                      type="text"
                      value={form?.custAddr2 || ""}
                      onChange={(v) => onChangeForm({ custAddr2: getValue(v) })}
                      readOnly={isReadOnly}
                      disabled={isDisabled}
                      maxLength={getLen("cust_addr2", 255)}
                    />

                    <FieldRenderer
                      label="Address 3"
                      type="text"
                      value={form?.custAddr3 || ""}
                      onChange={(v) => onChangeForm({ custAddr3: getValue(v) })}
                      readOnly={isReadOnly}
                      disabled={isDisabled}
                      maxLength={getLen("cust_addr3", 255)}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <FieldRenderer
                        label="ZIP Code"
                        type="text"
                        value={form?.custZip || ""}
                        onChange={(v) => onChangeForm({ custZip: getValue(v) })}
                        readOnly={isReadOnly}
                        disabled={isDisabled}
                        maxLength={getLen("cust_zip", 20)}
                      />
                      <FieldRenderer
                        label="Source"
                        required
                        type="select"
                        value={form?.source || ""}
                        options={sourceOptions}
                        onChange={(v) => onChangeForm({ source: getValue(v) })}
                        readOnly={isReadOnly}
                        disabled={isDisabled}
                      />
                    </div>
                  </>
                )}

                {/* ── ACCOUNTING ── */}
                {activeTab === "accounting" && (
                  <>
                    <SectionHeader title="ACCOUNTING INFORMATION" />

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <FieldRenderer
                        label="TIN"
                        required
                        type="text"
                        value={form?.custTin || ""}
                        onChange={(v) => onChangeForm({ custTin: getValue(v) })}
                        readOnly={isReadOnly}
                        disabled={isDisabled}
                        maxLength={getLen("cust_tin", 50)}
                      />
                      <FieldRenderer
                        label="ATC Code"
                        type="lookup"
                        value={form?.atcCode || ""}
                        onLookup={isDisabled ? undefined : () => setIsATCLookupOpen(true)}
                        readOnly={isReadOnly}
                        disabled={isDisabled}
                      />
                      <FieldRenderer
                        label="VAT Code"
                        required
                        type="lookup"
                        value={form?.vatCode || ""}
                        onLookup={isDisabled ? undefined : () => setIsVATLookupOpen(true)}
                        readOnly={isReadOnly}
                        disabled={isDisabled}
                      />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <FieldRenderer
                        label="Billing Terms"
                        required
                        type="lookup"
                        value={form?.billtermCode || ""}
                        onLookup={isDisabled ? undefined : () => setIsBillTermLookupOpen(true)}
                        readOnly={isReadOnly}
                        disabled={isDisabled}
                        maxLength={getLen("billterm_code", 20)}
                        labelClassName="!text-[12px]"
                      />
                      {/* <FieldRenderer
                        label="Business Style"
                        type="select"
                        value={form?.businessStyle || ""}
                        options={[]}
                        onChange={(v) => onChangeForm({ businessStyle: getValue(v) })}
                        readOnly={isReadOnly}
                        disabled={isDisabled}
                      /> */}
                      <FieldRenderer
                        label="Currency"
                        type="lookup"
                        value={form?.currCode || ""}
                        onLookup={isDisabled ? undefined : () => setIsCurrLookupOpen(true)}
                        readOnly={isReadOnly}
                        disabled={isDisabled}
                      />
                    </div>
                  </>
                )}

                {/* ── SALES ── */}
                {activeTab === "sales" && (
                  <>
                    <SectionHeader title="SALES INFORMATION" />

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <FieldRenderer
                        label="Agent"
                        required
                        type="lookup"
                        value={form?.salesRep || form?.salesRepCode || ""}
                        onLookup={isDisabled ? undefined : () => setIsSalesRepLookupOpen(true)}
                        readOnly={isReadOnly}
                        disabled={isDisabled}
                      />
                      <FieldRenderer
                        label="Customer Type"
                        type="lookup"
                        value={
                          form?.custtypeCode ||
                          form?.custTypeCode ||
                          form?.customerType ||
                          ""
                        }
                        onLookup={isDisabled ? undefined : () => setIsCustTypeLookupOpen(true)}
                        readOnly={isReadOnly}
                        disabled={isDisabled}
                      />
                      <FieldRenderer
                        label="Customer Since"
                        type="date"
                        value={form?.custSince || form?.customerSince || ""}
                        onChange={(v) => {
                          const value = getValue(v);
                          onChangeForm({ custSince: value, customerSince: value });
                        }}
                        readOnly={isReadOnly}
                        disabled={isDisabled}
                      />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <FieldRenderer
                        label="Area"
                        type="lookup"
                        value={form?.area || form?.areaCode || ""}
                        onLookup={isDisabled ? undefined : () => setIsAreaLookupOpen(true)}
                        readOnly={isReadOnly}
                        disabled={isDisabled}
                      />
                      <FieldRenderer
                        label="Zone"
                        type="lookup"
                        value={form?.zone || form?.zoneCode || ""}
                        onLookup={isDisabled ? undefined : () => setIsZoneLookupOpen(true)}
                        readOnly={isReadOnly}
                        disabled={isDisabled}
                      />
                      {/* <FieldRenderer
                        label="Price Group"
                        type="select"
                        value={form?.priceGroup || ""}
                        options={[]}
                        onChange={(v) => onChangeForm({ priceGroup: getValue(v) })}
                        readOnly={isReadOnly}
                        disabled={isDisabled}
                      /> */}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <FieldRenderer
                        label="Chain Flag"
                        type="select"
                        value={form?.chainFlag || ""}
                        options={[
                          { value: "Y", label: "Yes" },
                          { value: "N", label: "No" },
                        ]}
                        onChange={(v) => {
                          const chainFlag = getValue(v);

                          if (chainFlag !== "Y") {
                            onChangeForm({
                              chainFlag: "N",
                              chainCode: "",
                              chainCustomer: "",
                              chainCustomerCode: "",
                              chainCustomerName: "",
                              custGroup: "",
                            });
                            return;
                          }

                          const selfCode = form?.custCode || "";
                          const selfName = form?.custName || form?.businessName || "";

                          onChangeForm({
                            chainFlag: "Y",
                            chainCode: selfCode,
                            chainCustomerCode: selfCode,
                            chainCustomer: selfName,
                            chainCustomerName: selfName,
                            custGroup: selfCode,
                          });
                        }}
                        readOnly={isReadOnly}
                        disabled={isDisabled}
                      />
                      <FieldRenderer
                        label="Chain Code"
                        type="text"
                        value={form?.chainCode || form?.chainCustomerCode || ""}
                        readOnly
                        disabled
                      />
                      <FieldRenderer
                        label="Chain Customer"
                        type="lookup"
                        value={form?.chainCustomer || form?.chainCustomerName || ""}
                        onLookup={isDisabled || form?.chainFlag !== "Y" ? undefined : () => setIsChainCustomerLookupOpen(true)}
                        readOnly={isReadOnly}
                        disabled={isDisabled || form?.chainFlag !== "Y"}
                      />
                    </div>

                    {/* <FieldRenderer
                      label="Shipping Lines"
                      type="select"
                      value={form?.shippingLines || ""}
                      options={[]}
                      onChange={(v) => onChangeForm({ shippingLines: getValue(v) })}
                      readOnly={isReadOnly}
                      disabled={isDisabled}
                    /> */}

                    <FieldRenderer
                      label="Direct SI/DR WH"
                      type="lookup"
                      value={form?.whCode || form?.directWarehouse || ""}
                      onLookup={isDisabled ? undefined : () => setIsWarehouseLookupOpen(true)}
                      readOnly={isReadOnly}
                      disabled={isDisabled}
                    />
                  </>
                )}

                {/* ── CREDIT & COLLECTION ── */}
                {activeTab === "cc" && (
                  <>
                    <SectionHeader title="CREDIT & COLLECTION INFORMATION" />

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <FieldRenderer
                        label="Credit Investigator"
                        type="text"
                        value={form?.creditInvestigator || ""}
                        onChange={(v) => onChangeForm({ creditInvestigator: getValue(v) })}
                        readOnly={isReadOnly}
                        disabled={isDisabled}
                      />
                      <FieldRenderer
                        label="Credit Limit"
                        type="number"
                        value={form?.creditLimit || "0"}
                        onChange={(v) => onChangeForm({ creditLimit: getValue(v) })}
                        readOnly={isReadOnly}
                        disabled={isDisabled}
                      />
                      <FieldRenderer
                        label="Total AR"
                        type="number"
                        value={form?.totalAR || ""}
                        readOnly={true}
                        disabled={true}
                      />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <FieldRenderer
                        label="Credit Balance"
                        type="number"
                        value={form?.creditBalance || "0"}
                        readOnly={true}
                        disabled={true}
                      />
                    </div>
                  </>
                )}

                {/* ── TC SIGNATORY ── */}
                {activeTab === "tcsignatory" && (
                  <>
                    <SectionHeader title="TAX CERTIFICATE SIGNATORY" />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <FieldRenderer
                        label="Name"
                        type="text"
                        value={form?.taxSignatoryName || ""}
                        onChange={(v) => onChangeForm({ taxSignatoryName: getValue(v) })}
                        readOnly={isReadOnly}
                        disabled={isDisabled}
                      />
                      <FieldRenderer
                        label="TIN"
                        type="text"
                        value={form?.taxSignatoryTin || ""}
                        onChange={(v) => onChangeForm({ taxSignatoryTin: getValue(v) })}
                        readOnly={isReadOnly}
                        disabled={isDisabled}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <FieldRenderer
                        label="Position"
                        type="text"
                        value={form?.taxSignatoryPosition || ""}
                        onChange={(v) => onChangeForm({ taxSignatoryPosition: getValue(v) })}
                        readOnly={isReadOnly}
                        disabled={isDisabled}
                      />
                      <FieldRenderer
                        label="Email Address"
                        type="text"
                        value={form?.taxSignatoryEmail || ""}
                        onChange={(v) => onChangeForm({ taxSignatoryEmail: getValue(v) })}
                        readOnly={isReadOnly}
                        disabled={isDisabled}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <FieldRenderer
                        label="ZIP Code"
                        type="text"
                        value={form?.taxSignatoryZip || ""}
                        onChange={(v) => onChangeForm({ taxSignatoryZip: getValue(v) })}
                        readOnly={isReadOnly}
                        disabled={isDisabled}
                      />
                    </div>
                  </>
                )}

              </div>{/* end content area */}
            </div>{/* end flex row */}
          </Card>

           <RegistrationInfo
            layout="straight"
            disabled
            data={{
              registeredBy: form?.registeredBy || "",
              registeredDate: form?.registeredDate || "",
              lastUpdatedBy: form?.updatedBy || "",
              lastUpdatedDate: form?.updatedDate || "",
            }}
          />

        </div>

        {/* ── LOOKUP MODALS ── */}
        <SearchCusMast
          isOpen={isCustLookupOpen}
          customParam="ActiveAll"
          onClose={async (selected) => {
            setIsCustLookupOpen(false);
            if (!selected) return;
            const code = getValue(selected?.custCode) || getValue(selected?.cust_code);
            const tin = getValue(selected?.custTin) || getValue(selected?.cust_tin) || getValue(selected?.tin);
            if (!code) return;
            onChangeForm({ custCode: code, custTin: tin, __isNew: false });
            await onSelectCustomerCode?.(code);
          }}
        />

        <SearchCusMast
          isOpen={isChainCustomerLookupOpen}
          customParam="ActiveChain"
          onClose={(selected) => {
            setIsChainCustomerLookupOpen(false);
            if (!selected) return;

            const chainCode =
              getValue(selected?.custCode) ||
              getValue(selected?.cust_code) ||
              getValue(selected?.chainCode) ||
              getValue(selected?.code);

            const chainCustomer =
              getValue(selected?.custName) ||
              getValue(selected?.cust_name) ||
              getValue(selected?.chainCustomer) ||
              getValue(selected?.name);

            if (!chainCode) return;

            onChangeForm({
              chainFlag: "Y",
              chainCode,
              chainCustomerCode: chainCode,
              chainCustomer,
              chainCustomerName: chainCustomer,
              custGroup: chainCode,
            });
          }}
        />

        <SearchBranchRef
          isOpen={isBranchLookupOpen}
          onClose={(selected) => {
            setIsBranchLookupOpen(false);
            if (!selected) return;
            const branchCode = getValue(selected?.branchCode) || getValue(selected?.branch_code);
            if (!branchCode) return;
            onChangeForm({ branchCode });
          }}
        />

        <SearchATCRef
          isOpen={isATCLookupOpen}
          onClose={(selected) => {
            setIsATCLookupOpen(false);
            if (!selected) return;
            onChangeForm({
              atcCode: getValue(selected?.atcCode) || getValue(selected?.atc_code),
              atcName: getValue(selected?.atcName) || getValue(selected?.atc_name),
            });
          }}
        />

        <SearchVATRef
          isOpen={isVATLookupOpen}
          onClose={(selected) => {
            setIsVATLookupOpen(false);
            if (!selected) return;
            onChangeForm({
              vatCode: getValue(selected?.vatCode) || getValue(selected?.vat_code),
              vatName: getValue(selected?.vatName) || getValue(selected?.vat_name),
            });
          }}
        />

        <SearchBillTermRef
          isOpen={isBillTermLookupOpen}
          onClose={(selected) => {
            setIsBillTermLookupOpen(false);
            if (!selected) return;
            onChangeForm({
              billtermCode: getValue(selected?.billtermCode) || getValue(selected?.billterm_code) || getValue(selected?.code),
              billtermName: getValue(selected?.billtermName) || getValue(selected?.billterm_name) || getValue(selected?.name),
            });
          }}
        />

        <SearchCurrRef
          isOpen={isCurrLookupOpen}
          onClose={(selected) => {
            setIsCurrLookupOpen(false);
            if (!selected) return;
            onChangeForm({
              currCode: getValue(selected?.currCode),
              currName: getValue(selected?.currName),
            });
          }}
        />

        <SearchSalesRepRef
          isOpen={isSalesRepLookupOpen}
          onClose={(selected) => {
            setIsSalesRepLookupOpen(false);
            if (!selected) return;

            const salesRepCode =
              getValue(selected?.salesRepCode) ||
              getValue(selected?.agentCode) ||
              getValue(selected?.agent_code) ||
              getValue(selected?.code);

            const salesRepName =
              getValue(selected?.salesRepName) ||
              getValue(selected?.agentName) ||
              getValue(selected?.agent_name) ||
              getValue(selected?.name);

            onChangeForm({
              salesRep: salesRepCode,
              salesRepCode,
              salesRepName,
            });
          }}
        />

        <CustTypeLookupModal
          isOpen={isCustTypeLookupOpen}
          onClose={(selected) => {
            setIsCustTypeLookupOpen(false);
            if (!selected) return;

            const custtypeCode =
              getValue(selected?.custTypeCode) ||
              getValue(selected?.custtypeCode) ||
              getValue(selected?.custtype_code) ||
              getValue(selected?.code);

            const custtypeName =
              getValue(selected?.custTypeName) ||
              getValue(selected?.custtypeName) ||
              getValue(selected?.custtype_name) ||
              getValue(selected?.name);

            if (!custtypeCode) return;

            onChangeForm({
              custtypeCode,
              custTypeCode: custtypeCode,
              customerType: custtypeCode,
              custtypeName,
              customerTypeName: custtypeName,
            });
          }}
        />

        <AreaLookupModal
          isOpen={isAreaLookupOpen}
          onClose={(selected) => {
            setIsAreaLookupOpen(false);
            if (!selected) return;
            onChangeForm({
              area: getValue(selected?.areaCode),
              areaName: getValue(selected?.areaName),
            });
          }}
        />

        <ZoneLookupModal
          isOpen={isZoneLookupOpen}
          onClose={(selected) => {
            setIsZoneLookupOpen(false);
            if (!selected) return;
            onChangeForm({
              zone: getValue(selected?.zoneCode),
              zoneName: getValue(selected?.zoneName),
            });
          }}
        />

        <WarehouseLookupModal
          isOpen={isWarehouseLookupOpen}
          filter="ActiveAll"
          branchCode={form?.branchCode || ""}
          onClose={(selected) => {
            setIsWarehouseLookupOpen(false);
            if (!selected) return;

            const whCode =
              getValue(selected?.whCode) ||
              getValue(selected?.wh_code) ||
              getValue(selected?.whouseCode) ||
              getValue(selected?.whouse_code);

            const whName =
              getValue(selected?.whName) ||
              getValue(selected?.wh_name) ||
              getValue(selected?.whouseName) ||
              getValue(selected?.whouse_name);

            onChangeForm({
              whCode,
              directWarehouse: whCode,
              whName,
              directWarehouseName: whName,
            });
          }}
        />
      </>
    );
  }
);

CustSetupTab.displayName = "CustSetupTab";
export default CustSetupTab;