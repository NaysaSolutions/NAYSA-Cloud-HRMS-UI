import React, { forwardRef, useImperativeHandle, useMemo, useState, useRef } from "react";
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
import FGCategoryCodes from "@/NAYSA Cloud/Master Data/FGMasterData/ReferenceCodes/FGCategoryCodes";
import FGClassificationCodes from "@/NAYSA Cloud/Master Data/FGMasterData/ReferenceCodes/FGClassificationCodes";

// TEMPORARY PLACEHOLDER COMPONENT (Replace these with your actual FG Reference components when ready)
const PlaceholderRef = forwardRef(({
    label,
    onStateChange,
    isReadOnly = false,
    canAdd = true,
    canSave = true,
}, ref) => {
    useImperativeHandle(ref, () => ({
        add: () => {
            if (isReadOnly || !canAdd) {
                alert("Read Only: You are not allowed to add reference codes.");
                return;
            }
            alert(`Add ${label} (Not wired yet)`);
        },
        save: () => {
            if (isReadOnly || !canSave) {
                alert("Read Only: You are not allowed to save reference codes.");
                return;
            }
            alert(`Save ${label} (Not wired yet)`);
        },
        reset: () => alert(`Reset ${label} (Not wired yet)`)
    }));
    return <div className="p-10 text-center text-slate-500 font-bold border border-slate-200 bg-white rounded shadow-sm h-full flex items-center justify-center">{label} - Component Not Created Yet</div>;
});

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

const FGMast_ReferenceCodeTab = forwardRef(({
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

  const [collapseNav, setCollapseNav] = useState(false);

  const refTabs = useMemo(() => [
    { id: "category",       label: "Category Codes",       icon: faSitemap       },
    { id: "classification", label: "Classification Codes", icon: faLayerGroup    },
    // { id: "subclass",       label: "Sub Class Codes",      icon: faListAlt       },
    // { id: "uom",            label: "UOM Codes",            icon: faRulerCombined },
    // { id: "supplementary",  label: "Supplementary Codes",  icon: faTags          },
  ], []);

  const [activeRefTab, setActiveRefTab] = useState(refTabs[0].id);

  const permissionProps = {
    isReadOnly,
    canAdd,
    canEdit,
    canSave,
    canDelete,
  };

  useImperativeHandle(ref, () => ({
    add: () => {
      if (activeRefTab === "category")       categoryRef.current?.add?.();
      if (activeRefTab === "classification") classRef.current?.add?.();
      if (activeRefTab === "subclass")       subclassRef.current?.add?.();
      if (activeRefTab === "uom")            uomRef.current?.add?.();
      if (activeRefTab === "supplementary")  suppRef.current?.add?.();
    },
    save: () => {
      if (activeRefTab === "category")       categoryRef.current?.save?.();
      if (activeRefTab === "classification") classRef.current?.save?.();
      if (activeRefTab === "subclass")       subclassRef.current?.save?.();
      if (activeRefTab === "uom")            uomRef.current?.save?.();
      if (activeRefTab === "supplementary")  suppRef.current?.save?.();
    },
    reset: () => {
      if (activeRefTab === "category")       categoryRef.current?.reset?.();
      if (activeRefTab === "classification") classRef.current?.reset?.();
      if (activeRefTab === "subclass")       subclassRef.current?.reset?.();
      if (activeRefTab === "uom")            uomRef.current?.reset?.();
      if (activeRefTab === "supplementary")  suppRef.current?.reset?.();
    },
  }));

  const renderRight = () => {
    switch (activeRefTab) {
      case "category":
        return <FGCategoryCodes ref={categoryRef} onStateChange={onStateChange} {...permissionProps} />;
      case "classification":
        return <FGClassificationCodes ref={classRef} onStateChange={onStateChange} {...permissionProps} />;
      case "subclass":
        return <PlaceholderRef label="FG Sub Class Codes" ref={subclassRef} onStateChange={onStateChange} {...permissionProps} />;
      case "uom":
        return <PlaceholderRef label="FG UOM Codes" ref={uomRef} onStateChange={onStateChange} {...permissionProps} />;
      case "supplementary":
        return <PlaceholderRef label="FG Supplementary Codes" ref={suppRef} onStateChange={onStateChange} {...permissionProps} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-3 rounded-lg relative items-start h-full min-h-[500px]">
      <div className={`transition-all duration-300 ease-in-out overflow-hidden shrink-0 ${collapseNav ? "lg:w-14" : "lg:w-80"} w-full lg:w-auto`}>
        <Card className="w-full">
          <div className="flex items-center justify-between mb-2">
            {!collapseNav && <SectionHeader title="FG Reference Codes" />}
            <button onClick={() => setCollapseNav((p) => !p)} className="w-9 h-8 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-200 transition">
              <FontAwesomeIcon icon={collapseNav ? faChevronRight : faChevronLeft} />
            </button>
          </div>

          <div className={`flex flex-col gap-2 ${collapseNav ? "items-center" : ""}`}>
            {refTabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveRefTab(t.id)}
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

FGMast_ReferenceCodeTab.displayName = "FGMast_ReferenceCodeTab";
export default FGMast_ReferenceCodeTab;