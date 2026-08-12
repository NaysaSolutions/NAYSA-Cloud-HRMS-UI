// src/NAYSA Cloud/Reference File/MSMast_ReferenceCodeTab.jsx
import React, { forwardRef, useImperativeHandle, useMemo, useState, useRef, useCallback, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSitemap,
  faLayerGroup,
  faListAlt,
  faRulerCombined,
  faTags,
  faChevronLeft,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";

// Import your dedicated components
import CategoryCodes from "@/NAYSA Cloud/Master Data/MSMasterData/ReferenceCodes/MSCategoryCodes";
import ClassificationCodes from "@/NAYSA Cloud/Master Data/MSMasterData/ReferenceCodes/MSClassificationCodes";
// import SubclassCodes from "@/NAYSA Cloud/Master Data/MSMasterData/ReferenceCodes/SubclassCodes";
// import UOMCodes from "@/NAYSA Cloud/Master Data/MSMasterData/ReferenceCodes/UOMCodes";
// import SupplementaryCodes from "@/NAYSA Cloud/Master Data/MSMasterData/ReferenceCodes/SupplementaryCodes";

const SectionHeader = ({ title, subtitle }) => (
  <div className="mb-3">
    <div className="text-sm font-bold text-gray-800">{title}</div>
    {subtitle ? <div className="text-xs text-gray-500 mt-0.5 leading-4">{subtitle}</div> : null}
  </div>
);

const Card = ({ children, className = "" }) => (
  <div className={`global-tran-textbox-group-div-ui self-start !h-fit ${className}`}>
    {children}
  </div>
);

const MSMast_ReferenceCodeTab = forwardRef(({
  onStateChange,
  isReadOnly = false,
  canAdd = true,
  canEdit = true,
  canSave = true,
  canDelete = true,
}, ref) => {
  const categoryRef = useRef(null);
  const classRef = useRef(null);
  const subclassRef = useRef(null);
  const uomRef = useRef(null);
  const suppRef = useRef(null);

  const permissionProps = {
    isReadOnly,
    canAdd,
    canEdit,
    canSave,
    canDelete,
  };

  const [collapseNav, setCollapseNav] = useState(false);

  const refTabs = useMemo(() => [
    { id: "category", label: "Category Codes", icon: faSitemap },
    { id: "classification", label: "Classification Codes", icon: faLayerGroup },
    // { id: "subclass", label: "Sub Class Codes", icon: faListAlt },
    // { id: "uom", label: "UOM Codes", icon: faRulerCombined },
    // { id: "supplementary", label: "Supplementary Codes", icon: faTags },
  ], []);

  const [activeRefTab, setActiveRefTab] = useState(refTabs[0].id);

  // Ref mirror so childStateChange closure always reads the latest value without stale closure issues
  const activeRefTabRef = useRef(refTabs[0].id);

  // Switch sub-tab and notify MSMast which one is now active
  const switchRefTab = (id) => {
    activeRefTabRef.current = id;
    setActiveRefTab(id);
    onStateChange?.((prev) => ({ ...prev, activeRefTab: id }));
  };

  // Wrapper given to every child component.
  // Children call onStateChange({ isEditing, canSave }) as a plain object which would
  // overwrite activeRefTab in MSMast's refState. This wrapper always re-stamps it.
  const childStateChange = useCallback((patch) => {
    const updater = typeof patch === "function"
      ? (prev) => ({ ...patch(prev), activeRefTab: activeRefTabRef.current })
      : (prev) => ({ ...prev, ...patch, activeRefTab: activeRefTabRef.current });
    onStateChange?.(updater);
  }, [onStateChange]);

  // Emit initial activeRefTab on mount so MSMast header is correct right away
  useEffect(() => {
    onStateChange?.((prev) => ({ ...prev, activeRefTab: refTabs[0].id }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Wire top-level parent buttons to the active child
  useImperativeHandle(ref, () => ({
    add: () => {
      if (activeRefTab === "category") categoryRef.current?.add?.();
      if (activeRefTab === "classification") classRef.current?.add?.();
      if (activeRefTab === "subclass") subclassRef.current?.add?.();
      if (activeRefTab === "uom") uomRef.current?.add?.();
      if (activeRefTab === "supplementary") suppRef.current?.add?.();
    },
    save: () => {
      if (activeRefTab === "category") categoryRef.current?.save?.();
      if (activeRefTab === "classification") classRef.current?.save?.();
      if (activeRefTab === "subclass") subclassRef.current?.save?.();
      if (activeRefTab === "uom") uomRef.current?.save?.();
      if (activeRefTab === "supplementary") suppRef.current?.save?.();
    },
    reset: () => {
      if (activeRefTab === "category") categoryRef.current?.reset?.();
      if (activeRefTab === "classification") classRef.current?.reset?.();
      if (activeRefTab === "subclass") subclassRef.current?.reset?.();
      if (activeRefTab === "uom") uomRef.current?.reset?.();
      if (activeRefTab === "supplementary") suppRef.current?.reset?.();
    },
    downloadTemplate: () => categoryRef.current?.downloadTemplate?.(),
    triggerImport:    () => categoryRef.current?.triggerImport?.(),
  }), [activeRefTab]);

  const renderRight = () => {
    switch (activeRefTab) {
      case "category":       return <CategoryCodes ref={categoryRef} onStateChange={childStateChange} {...permissionProps} />;
      case "classification": return <ClassificationCodes ref={classRef} onStateChange={childStateChange} {...permissionProps} />;
      case "subclass":       return <SubclassCodes ref={subclassRef} onStateChange={childStateChange} {...permissionProps} />;
      case "uom":            return <UOMCodes ref={uomRef} onStateChange={childStateChange} {...permissionProps} />;
      case "supplementary":  return <SupplementaryCodes ref={suppRef} onStateChange={childStateChange} {...permissionProps} />;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-3 rounded-lg relative items-start h-full min-h-[500px]">
      <div className={`transition-all duration-300 ease-in-out overflow-hidden shrink-0 ${collapseNav ? "lg:w-14" : "lg:w-80"} w-full lg:w-auto`}>
        <Card className="w-full">
          <div className="flex items-center justify-between mb-2">
            {!collapseNav && <SectionHeader title="Reference Codes" />}
            <button onClick={() => setCollapseNav((p) => !p)} className="w-9 h-8 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-200 transition">
              <FontAwesomeIcon icon={collapseNav ? faChevronRight : faChevronLeft} />
            </button>
          </div>

          <div className={`flex flex-col gap-2 ${collapseNav ? "items-center" : ""}`}>
            {refTabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => switchRefTab(t.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs md:text-sm font-bold transition-colors duration-200
                  ${activeRefTab === t.id ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-100 hover:text-blue-700"}
                  ${collapseNav ? "justify-center px-2 w-10" : ""}
                `}
                title={collapseNav ? t.label : undefined}
              >
                <FontAwesomeIcon icon={t.icon} className="w-4 h-4" />
                {!collapseNav && <span className="whitespace-nowrap">{t.label}</span>}
              </button>
            ))}
          </div>
        </Card>
      </div>

      <div className="flex-1 min-w-0 h-full">{renderRight()}</div>
    </div>
  );
});

MSMast_ReferenceCodeTab.displayName = "MSMast_ReferenceCodeTab";
export default MSMast_ReferenceCodeTab;