// import { forwardRef, useEffect, useImperativeHandle, useMemo, useState, useRef } from "react";
// import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
// import {
//   faUserTie,
//   faMapMarkedAlt,
//   faMapPin,
//   faUsers,
//   faTags,
//   faReceipt,
//   faFileInvoiceDollar,
//   faChevronLeft,
//   faChevronRight,
// } from "@fortawesome/free-solid-svg-icons";

// import PayTermRef from "@/NAYSA Cloud/Master Data/CustMastTabs/ReferenceCodes/PayTermRef";
// import BillTermRef from "@/NAYSA Cloud/Master Data/CustMastTabs/ReferenceCodes/BillTermRef";
// import SalesRep from "@/NAYSA Cloud/Master Data/CustMastTabs/ReferenceCodes/SalesRep";
// import ZoneRef from "@/NAYSA Cloud/Master Data/CustMastTabs/ReferenceCodes/ZoneRef";
// import AreaRef from "@/NAYSA Cloud/Master Data/CustMastTabs/ReferenceCodes/AreaRef";
// import CustTypeRef from "@/NAYSA Cloud/Master Data/CustMastTabs/ReferenceCodes/CustTypeRef";

// /* ===================== UI helpers ===================== */
// const SectionHeader = ({ title, subtitle }) => (
//   <div className="mb-3">
//     <div className="text-sm font-bold text-gray-800">{title}</div>
//     {subtitle ? (
//       <div className="text-xs text-gray-500 mt-0.5 leading-4">{subtitle}</div>
//     ) : null}
//   </div>
// );

// const Card = ({ children, className = "" }) => (
//   <div className={`global-tran-textbox-group-div-ui self-start !h-fit ${className}`}>
//     {children}
//   </div>
// );

// const ReferenceCodesTab = forwardRef(({ variant = "customer", onStateChange }, ref) => {
//   const payTermRef = useRef(null);
//   const billTermRef = useRef(null);
//   const zoneRef = useRef(null); 
//   const areaRef = useRef(null);
//   const custTypeRef = useRef(null);
//   const salesRepRef = useRef(null);

//   const [collapseNav, setCollapseNav] = useState(false);

//   const refTabs = useMemo(() => {
//     const full = [
//       { id: "salesrep", label: "Agent Codes", icon: faUserTie },
//       { id: "zone", label: "Zone Codes", icon: faMapMarkedAlt },
//       { id: "area", label: "Area Codes", icon: faMapPin },
//       { id: "custtype", label: "Customer Types", icon: faUsers },
//       { id: "billingterm", label: "Billing Terms", icon: faReceipt },
//       // { id: "pricegroup", label: "Price Group", icon: faTags },
//     ];

//     const vendorOnly = [
//       { id: "payterm", label: "Payment Terms", icon: faFileInvoiceDollar },
//     ];

//     return variant === "vendor" ? vendorOnly : full;
//   }, [variant]);

//   const [activeRefTab, setActiveRefTab] = useState(refTabs?.[0]?.id || "payterm");

//   useEffect(() => {
//     if (!refTabs.some((t) => t.id === activeRefTab)) {
//       setActiveRefTab(refTabs?.[0]?.id || "payterm");
//     }
//   }, [refTabs, activeRefTab]);

//   useImperativeHandle(ref, () => ({
//     add: () => {
//       if (activeRefTab === "payterm") payTermRef.current?.add?.();
//       if (activeRefTab === "billingterm") billTermRef.current?.add?.();
//       if (activeRefTab === "zone") zoneRef.current?.add?.(); 
//       if (activeRefTab === "area") areaRef.current?.add?.();
//       if (activeRefTab === "custtype") custTypeRef.current?.add?.();
//       if (activeRefTab === "salesrep") salesRepRef.current?.add?.();
//     },
//     save: () => {
//       if (activeRefTab === "payterm") payTermRef.current?.save?.();
//       if (activeRefTab === "billingterm") billTermRef.current?.save?.();
//       if (activeRefTab === "zone") zoneRef.current?.save?.();
//       if (activeRefTab === "area") areaRef.current?.save?.();
//       if (activeRefTab === "custtype") custTypeRef.current?.save?.();
//       if (activeRefTab === "salesrep") salesRepRef.current?.save?.();
//     },
//     reset: () => {
//       if (activeRefTab === "payterm") payTermRef.current?.reset?.();
//       if (activeRefTab === "billingterm") billTermRef.current?.reset?.();
//       if (activeRefTab === "zone") zoneRef.current?.reset?.(); 
//       if (activeRefTab === "area") areaRef.current?.reset?.();
//       if (activeRefTab === "custtype") custTypeRef.current?.reset?.();
//       if (activeRefTab === "salesrep") salesRepRef.current?.reset?.();
//     },
//   }));

//   const activeLabel = refTabs.find((t) => t.id === activeRefTab)?.label || "Reference";

//   const renderRight = () => {
//     if (activeRefTab === "payterm") {
//       return <PayTermRef ref={payTermRef} onStateChange={onStateChange} />;
//     }

//     if (activeRefTab === "billingterm") {
//       return <BillTermRef ref={billTermRef} onStateChange={onStateChange} />;
//     }

//     if (activeRefTab === "zone") {
//       return <ZoneRef ref={zoneRef} onStateChange={onStateChange} />;
//     }

//     if (activeRefTab === "area") {
//       return <AreaRef ref={areaRef} onStateChange={onStateChange} />;
//     }

//     if (activeRefTab === "custtype") {
//       return <CustTypeRef ref={custTypeRef} onStateChange={onStateChange} />;
//     }

//     if (activeRefTab === "salesrep") {
//       return <SalesRep ref={salesRepRef} onStateChange={onStateChange} />;
//     }

//     return (
//       <Card>
//         <SectionHeader
//           title={activeLabel}
//           subtitle="Not yet wired. Send the API endpoints + required fields and I’ll match it to the same maintenance format."
//         />
//       </Card>
//     );
//   };

//   return (
//     <div className="flex flex-col lg:flex-row gap-3 rounded-lg relative items-start">
//       {/* LEFT NAV */}
//       <div
//         className={`transition-all duration-300 ease-in-out overflow-hidden shrink-0
//           ${collapseNav ? "lg:w-14" : "lg:w-80"}
//           w-full lg:w-auto
//         `}
//       >
//         <Card>
//           <div className="flex items-center justify-between mb-2">
//             {!collapseNav && <SectionHeader title="Reference Codes" />}
//             <button
//               type="button"
//               onClick={() => setCollapseNav((p) => !p)}
//               className="w-9 h-8 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-200 transition"
//               title={collapseNav ? "Expand" : "Collapse"}
//             >
//               <FontAwesomeIcon icon={collapseNav ? faChevronRight : faChevronLeft} />
//             </button>
//           </div>

//           <div className={`flex flex-col gap-2 ${collapseNav ? "items-center" : ""}`}>
//             {refTabs.map((t) => (
//               <button
//                 key={t.id}
//                 type="button"
//                 onClick={() => setActiveRefTab(t.id)}
//                 className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs md:text-sm font-bold transition-colors duration-200
//                   ${activeRefTab === t.id
//                     ? "bg-blue-100 text-blue-700"
//                     : "text-gray-600 hover:bg-gray-100 hover:text-blue-700"
//                   }
//                   ${collapseNav ? "justify-center px-2 w-10" : ""}
//                 `}
//                 title={collapseNav ? t.label : undefined}
//               >
//                 <FontAwesomeIcon icon={t.icon} className="w-4 h-4" />
//                 {!collapseNav && <span className="whitespace-nowrap">{t.label}</span>}
//               </button>
//             ))}
//           </div>
//         </Card>
//       </div>

//       {/* RIGHT CONTENT */}
//       <div className="flex-1 min-w-0 grid grid-cols-1 gap-3">{renderRight()}</div>
//     </div>
//   );
// });

// ReferenceCodesTab.displayName = "ReferenceCodesTab";
// export default ReferenceCodesTab;
import { forwardRef, useEffect, useImperativeHandle, useMemo, useState, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUserTie,
  faMapMarkedAlt,
  faMapPin,
  faUsers,
  faTags,
  faReceipt,
  faFileInvoiceDollar,
  faChevronLeft,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";

import PayTermRef from "@/NAYSA Cloud/Master Data/CustMastTabs/ReferenceCodes/PayTermRef";
import BillTermRef from "@/NAYSA Cloud/Master Data/CustMastTabs/ReferenceCodes/BillTermRef";
import SalesRep from "@/NAYSA Cloud/Master Data/CustMastTabs/ReferenceCodes/SalesRep";
import ZoneRef from "@/NAYSA Cloud/Master Data/CustMastTabs/ReferenceCodes/ZoneRef";
import AreaRef from "@/NAYSA Cloud/Master Data/CustMastTabs/ReferenceCodes/AreaRef";
import CustTypeRef from "@/NAYSA Cloud/Master Data/CustMastTabs/ReferenceCodes/CustTypeRef";
import { useSwalErrorAlert } from "@/NAYSA Cloud/Global/behavior.jsx";

/* ===================== UI helpers ===================== */
const SectionHeader = ({ title, subtitle }) => (
  <div className="mb-3">
    <div className="text-sm font-bold text-gray-800">{title}</div>
    {subtitle ? (
      <div className="text-xs text-gray-500 mt-0.5 leading-4">{subtitle}</div>
    ) : null}
  </div>
);

const Card = ({ children, className = "" }) => (
  <div className={`global-tran-textbox-group-div-ui self-start !h-fit ${className}`}>
    {children}
  </div>
);

const ReferenceCodesTab = forwardRef(({
  variant = "customer",
  isReadOnly = false,
  canAdd = true,
  canEdit = true,
  canSave = true,
  canDelete = true,
  onStateChange,
}, ref) => {
  const payTermRef = useRef(null);
  const billTermRef = useRef(null);
  const zoneRef = useRef(null); 
  const areaRef = useRef(null);
  const custTypeRef = useRef(null);
  const salesRepRef = useRef(null);

  const [collapseNav, setCollapseNav] = useState(false);

  const refTabs = useMemo(() => {
    const full = [
      { id: "salesrep", label: "Agent Codes", icon: faUserTie },
      { id: "zone", label: "Zone Codes", icon: faMapMarkedAlt },
      { id: "area", label: "Area Codes", icon: faMapPin },
      { id: "custtype", label: "Customer Types", icon: faUsers },
      { id: "billingterm", label: "Billing Terms", icon: faReceipt },
      // { id: "pricegroup", label: "Price Group", icon: faTags },
    ];

    const vendorOnly = [
      { id: "payterm", label: "Payment Terms", icon: faFileInvoiceDollar },
    ];

    return variant === "vendor" ? vendorOnly : full;
  }, [variant]);

  const [activeRefTab, setActiveRefTab] = useState(refTabs?.[0]?.id || "payterm");

  useEffect(() => {
    if (!refTabs.some((t) => t.id === activeRefTab)) {
      setActiveRefTab(refTabs?.[0]?.id || "payterm");
    }
  }, [refTabs, activeRefTab]);

  useImperativeHandle(ref, () => ({
    add: async () => {
      if (isReadOnly || !canAdd) {
        await useSwalErrorAlert("Read Only", "You are not allowed to add reference codes.");
        return;
      }

      if (activeRefTab === "payterm") payTermRef.current?.add?.();
      if (activeRefTab === "billingterm") billTermRef.current?.add?.();
      if (activeRefTab === "zone") zoneRef.current?.add?.(); 
      if (activeRefTab === "area") areaRef.current?.add?.();
      if (activeRefTab === "custtype") custTypeRef.current?.add?.();
      if (activeRefTab === "salesrep") salesRepRef.current?.add?.();
    },
    save: async () => {
      if (isReadOnly || !canSave) {
        await useSwalErrorAlert("Read Only", "You are not allowed to save reference codes.");
        return;
      }

      if (activeRefTab === "payterm") payTermRef.current?.save?.();
      if (activeRefTab === "billingterm") billTermRef.current?.save?.();
      if (activeRefTab === "zone") zoneRef.current?.save?.();
      if (activeRefTab === "area") areaRef.current?.save?.();
      if (activeRefTab === "custtype") custTypeRef.current?.save?.();
      if (activeRefTab === "salesrep") salesRepRef.current?.save?.();
    },
    reset: () => {
      if (activeRefTab === "payterm") payTermRef.current?.reset?.();
      if (activeRefTab === "billingterm") billTermRef.current?.reset?.();
      if (activeRefTab === "zone") zoneRef.current?.reset?.(); 
      if (activeRefTab === "area") areaRef.current?.reset?.();
      if (activeRefTab === "custtype") custTypeRef.current?.reset?.();
      if (activeRefTab === "salesrep") salesRepRef.current?.reset?.();
    },
  }));

  const activeLabel = refTabs.find((t) => t.id === activeRefTab)?.label || "Reference";

  const permissionProps = {
    isReadOnly,
    canAdd: !isReadOnly && canAdd,
    canEdit: !isReadOnly && canEdit,
    canSave: !isReadOnly && canSave,
    canDelete: !isReadOnly && canDelete,
  };

  const renderRight = () => {
    if (activeRefTab === "payterm") {
      return <PayTermRef ref={payTermRef} onStateChange={onStateChange} {...permissionProps} />;
    }

    if (activeRefTab === "billingterm") {
      return <BillTermRef ref={billTermRef} onStateChange={onStateChange} {...permissionProps} />;
    }

    if (activeRefTab === "zone") {
      return <ZoneRef ref={zoneRef} onStateChange={onStateChange} {...permissionProps} />;
    }

    if (activeRefTab === "area") {
      return <AreaRef ref={areaRef} onStateChange={onStateChange} {...permissionProps} />;
    }

    if (activeRefTab === "custtype") {
      return <CustTypeRef ref={custTypeRef} onStateChange={onStateChange} {...permissionProps} />;
    }

    if (activeRefTab === "salesrep") {
      return <SalesRep ref={salesRepRef} onStateChange={onStateChange} {...permissionProps} />;
    }

    return (
      <Card>
        <SectionHeader
          title={activeLabel}
          subtitle="Not yet wired. Send the API endpoints + required fields and I’ll match it to the same maintenance format."
        />
      </Card>
    );
  };

  return (
    <div className="flex flex-col lg:flex-row gap-3 rounded-lg relative items-start">
      {/* LEFT NAV */}
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden shrink-0
          ${collapseNav ? "lg:w-14" : "lg:w-80"}
          w-full lg:w-auto
        `}
      >
        <Card>
          <div className="flex items-center justify-between mb-2">
            {!collapseNav && <SectionHeader title="Reference Codes" />}
            <button
              type="button"
              onClick={() => setCollapseNav((p) => !p)}
              className="w-9 h-8 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-200 transition"
              title={collapseNav ? "Expand" : "Collapse"}
            >
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
                  ${activeRefTab === t.id
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-blue-700"
                  }
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

      {/* RIGHT CONTENT */}
      <div className="flex-1 min-w-0 grid grid-cols-1 gap-3">{renderRight()}</div>
    </div>
  );
});

ReferenceCodesTab.displayName = "ReferenceCodesTab";
export default ReferenceCodesTab;