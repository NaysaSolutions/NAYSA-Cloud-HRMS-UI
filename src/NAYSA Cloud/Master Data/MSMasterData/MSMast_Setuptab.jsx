// src/NAYSA Cloud/Reference File/MSMast_SetupTab.jsx
import React, { useEffect, useRef, useState } from "react";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer";
import RegistrationInfo from "@/NAYSA Cloud/Global/RegistrationInfo.jsx";
import { useFieldLenghtCheck, useGetFieldLength } from "@/NAYSA Cloud/Global/procedure";
import SearchMSInvCateg from "@/NAYSA Cloud/Lookup/SearchMSInvCateg.jsx";
import SearchMSInvClass from "@/NAYSA Cloud/Lookup/SearchMSInvClass.jsx";
import SearchUOM from "@/NAYSA Cloud/Lookup/SearchUOM.jsx";
import ItemMastLookupModal from "@/NAYSA Cloud/Lookup/SearchItemMast.jsx";

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

const toBool = (value) => {
  if (typeof value === "boolean") return value;
  return ["1", "Y", "YES", "TRUE"].includes(
    String(value ?? "").trim().toUpperCase()
  );
};

const getNonNegativeNumber = (input) => {
  const value = getValue(input);

  if (value === "" || value === null || value === undefined) return "";

  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) return "";

  return numericValue < 0 ? 0 : value;
};

// --- Sidebar tab definitions ---
const TABS = [
  {
    id: "stockcard",
    label: "Stock Card",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="12" height="12" rx="1.5" />
        <path d="M5 5h6M5 8h4M5 11h3" />
      </svg>
    ),
  },
  {
    id: "others",
    label: "Others",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="4" cy="8" r="1" fill="currentColor" stroke="none" />
        <circle cx="8" cy="8" r="1" fill="currentColor" stroke="none" />
        <circle cx="12" cy="8" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
];

const MSMast_SetupTab = ({
  isLoading,
  isEditing,
  form = {},
  generationMode,
  onChangeForm,
  onLookupSelect,
  onBlurItemCode,
}) => {
  const isReadOnly = !isEditing;
  const isNewRecord = form.__isNew;
  const isDisabled = isReadOnly || isLoading;
  const isUsed = toBool(
    form.isUsed ??
    form.inUsed ??
    form.inUse ??
    form.used ??
    form.__isUsed
  );
  const lockUsedFields = !isNewRecord && isUsed;

  const [isCategOpen, setIsCategOpen] = useState(false);
  const [isClassOpen, setIsClassOpen] = useState(false);
  const [isItemLookupOpen, setIsItemLookupOpen] = useState(false);
  const [uomTarget, setUomTarget] = useState(null);
  const [activeTab, setActiveTab] = useState("stockcard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [tblFieldArray, setTblFieldArray] = useState([]);

  useEffect(() => {
    const run = async () => {
      try {
        const result = await useFieldLenghtCheck("ms_mast");
        if (result) setTblFieldArray(result);
      } catch (e) {
        console.error("Failed to load field lengths:", e);
      }
    };
    run();
  }, []);

  const getLen = (col, fallback = undefined) =>
    useGetFieldLength(tblFieldArray, col) || fallback;

  const canType = isNewRecord;
  const overrideRef = useRef(null);

  useEffect(() => {
    const attach = () => {
      if (!overrideRef.current) return;
      const input = overrideRef.current.querySelector("input");
      if (!input) return;
      if (canType) {
        const maxLen = getLen("item_code", 30);
        input.removeAttribute("readonly");
        input.setAttribute("maxlength", maxLen);
        input.onclick = (e) => e.stopPropagation();
        input.oninput = (e) => {
          let val = e.target.value;
          if (val.length > maxLen) val = val.substring(0, maxLen);
          onChangeForm({ itemCode: String(val).toUpperCase() });
        };
        input.onblur = (e) => {
          const val = String(e.target.value || "").trim();
          if (val) onBlurItemCode?.(val);
        };
      } else {
        input.setAttribute("readonly", "true");
        input.removeAttribute("maxlength");
        input.onclick = null;
        input.oninput = null;
        input.onblur = null;
      }
    };
    attach();
    const t = setTimeout(attach, 50);
    return () => clearTimeout(t);
  }, [canType, isNewRecord, onChangeForm, onBlurItemCode, tblFieldArray]);

  return (
    <>
      <div className="flex flex-col gap-6 rounded-lg relative">

        {/* ── TOP CARD: Basic Information ── */}
        <Card className="border border-blue-500/30 p-6 rounded-lg">
          <SectionHeader title="BASIC INFORMATION" />

          <div
            ref={overrideRef}
            className={`w-full ${!canType
              ? "[&>div]:!bg-[#F1F5F9] [&_input]:!bg-transparent [&_input]:!pointer-events-none [&_input]:!text-slate-600 [&_label]:!bg-[#F1F5F9]"
              : ""
              }`}
          >
            <FieldRenderer
              label="Item No"
              required
              editableLookup
              type="lookup"
              value={form.itemCode || ""}
              onChange={(v) => onChangeForm({ itemCode: String(getValue(v)).toUpperCase() })}
              onLookup={canType ? undefined : () => !isLoading && setIsItemLookupOpen(true)}
              readOnly={true}
              disabled={false}
              lookupDisabled={isLoading}
              hideClearButton={!isNewRecord}
              maxLength={getLen("item_code", 30)}
            />
          </div>

          <FieldRenderer
            label="Item Description"
            required
            type="text"
            value={form.itemDesc || ""}
            onChange={(v) => onChangeForm({ itemDesc: getValue(v) })}
            readOnly={isReadOnly}
            disabled={isDisabled}
            maxLength={getLen("item_name", 200)}
          />

          {/* UOM row */}
          <div className="grid grid-cols-5 gap-2 mt-1">
            <div className="col-span-2">
              <FieldRenderer
                label="UOM"
                required
                type="lookup"
                value={form.uom || ""}
                onChange={(v) => onChangeForm({ uom: getValue(v) })}
                onLookup={() => !(isDisabled || lockUsedFields) && setUomTarget("uom")}
                readOnly={isReadOnly || lockUsedFields}
                disabled={isDisabled || lockUsedFields}
                hideClearButton={lockUsedFields}
              />
            </div>
            <div className="col-span-2">
              <FieldRenderer
                label="UOM Code 2"
                type="lookup"
                value={form.uom2 || ""}
                onChange={(v) => onChangeForm({ uom2: getValue(v) })}
                onLookup={() => !(isDisabled || lockUsedFields) && setUomTarget("uom2")}
                readOnly={isReadOnly || lockUsedFields}
                disabled={isDisabled || lockUsedFields}
                hideClearButton={lockUsedFields}
              />
            </div>
            <div className="col-span-1">
              <FieldRenderer
                label="Qty / UOM2"
                type="number"
                value={form.qtyPerUom2 || ""}
                onChange={(v) => onChangeForm({ qtyPerUom2: getNonNegativeNumber(v) })}
                onKeyDown={(e) => {
                  if (["-", "+"].includes(e.key)) e.preventDefault();
                }}
                min={0}
                readOnly={isReadOnly || lockUsedFields}
                disabled={isDisabled || lockUsedFields}
              />
            </div>
          </div>

          {/* Category */}
          <div className="grid grid-cols-3 gap-2 mt-1">
            <FieldRenderer
              label="Category"
              required
              type="lookup"
              value={form.categoryCode || ""}
              onChange={(v) => onChangeForm({ categoryCode: getValue(v) })}
              onLookup={() => !(isDisabled || lockUsedFields) && setIsCategOpen(true)}
              readOnly={isReadOnly || lockUsedFields}
              disabled={isDisabled || lockUsedFields}
              hideClearButton={lockUsedFields}
            />
            <div className="col-span-2">
              <FieldRenderer
                type="text"
                value={form.categoryName || ""}
                readOnly
                disabled
              />
            </div>
          </div>

          {/* {lockUsedFields && (
            // <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
            //   UOM, UOM Code 2, Qty / UOM2, and Category are locked because this item is already used.
            // </div>
          )} */}

          {/* Classification */}
          <div className="grid grid-cols-3 gap-2 mt-1">
            <FieldRenderer
              label="Classification"
              type="lookup"
              value={form.classCode || ""}
              onChange={(v) => onChangeForm({ classCode: getValue(v), className: "" })}
              onLookup={() => !isDisabled && setIsClassOpen(true)}
              readOnly={isReadOnly}
              disabled={isDisabled}
            />
            <div className="col-span-2">
              <FieldRenderer
                type="text"
                value={form.className || ""}
                readOnly
                disabled
              />
            </div>
          </div>

          {/* Active / Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
            <FieldRenderer
              label="Active"
              type="select"
              options={[{ value: "Y", label: "Yes" }, { value: "N", label: "No" }]}
              value={form.active || "Y"}
              onChange={(v) => onChangeForm({ active: getValue(v) })}
              readOnly={isReadOnly}
              disabled={isDisabled}
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

              {activeTab === "stockcard" && (
                <>
                  <SectionHeader title="STOCK CARD INFORMATION" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <FieldRenderer label="Qty on Hand" type="number" value={form.qtyOnHand || ""} readOnly disabled />
                    <FieldRenderer label="Unit Cost" type="number" value={form.unitCost || ""} readOnly disabled />
                  </div>
                </>
              )}

              {activeTab === "others" && (
                <>
                  <SectionHeader title="ORDERING & PRICING" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <FieldRenderer
                      label="Re-Order Level"
                      type="number"
                      value={form.reOrderLevel || ""}
                      onChange={(v) => onChangeForm({ reOrderLevel: getValue(v) })}
                      readOnly={isReadOnly}
                      disabled={isDisabled}
                    />
                    <FieldRenderer
                      label="Standard PO Price"
                      type="number"
                      value={form.stdPoPrice || ""}
                      onChange={(v) => onChangeForm({ stdPoPrice: getValue(v) })}
                      readOnly={isReadOnly}
                      disabled={isDisabled}
                    />
                    <FieldRenderer label="Last Purchase Date" type="text" value={form.lastPurDate || ""} readOnly disabled />
                    <FieldRenderer label="Last Purchase Price" type="number" value={form.lastPurPrice || ""} readOnly disabled />
                    <FieldRenderer
                      label="Allow Over Receiving?"
                      type="select"
                      options={[{ value: "Y", label: "Yes" }, { value: "N", label: "No" }]}
                      value={form.allowOverRec || "N"}
                      onChange={(v) => onChangeForm({ allowOverRec: getValue(v) })}
                      readOnly={isReadOnly}
                      disabled={isDisabled}
                    />
                  </div>
                </>
              )}

            </div>
          </div>
        </Card>

        {/* ── Registration Info ── */}
        <RegistrationInfo
          layout="straight"
          disabled
          data={{
            registeredBy: form.registeredByName || form.registeredBy || "",
            registeredDate: form.registeredDate || "",
            lastUpdatedBy: form.updatedByName || form.updatedBy || "",
            lastUpdatedDate: form.updatedDate || "",
          }}
        />

      </div>

      {/* ── LOOKUP MODALS ── */}
      <SearchMSInvCateg
        isOpen={isCategOpen}
        onClose={(selected) => {
          setIsCategOpen(false);
          if (selected) onChangeForm({ categoryCode: selected.code, categoryName: selected.description });
        }}
      />
      <SearchMSInvClass
        isOpen={isClassOpen}
        onClose={(selected) => {
          setIsClassOpen(false);
          if (selected) onChangeForm({ classCode: selected.code, className: selected.description });
        }}
      />
      <SearchUOM
        isOpen={uomTarget !== null}
        onClose={(selected) => {
          if (selected && uomTarget) onChangeForm({ [uomTarget]: selected.uomCode });
          setUomTarget(null);
        }}
      />
      <ItemMastLookupModal
        isOpen={isItemLookupOpen}
        endpoint="/lookupMSMast"
        docType="PRMS"
        enableMultiSelect={false}
        onClose={(payload) => {
          setIsItemLookupOpen(false);
          const selected = payload?.records?.[0];
          if (selected) onLookupSelect(selected.itemCode);
        }}
      />
    </>
  );
};

export default MSMast_SetupTab;