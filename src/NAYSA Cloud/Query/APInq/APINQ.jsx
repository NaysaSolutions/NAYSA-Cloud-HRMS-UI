import { useMemo, useState, useEffect, useCallback, useLayoutEffect, useRef } from "react";
import APINQActionBar from "./APINQActionBar";
import APInquiryTab from "./APInquiryTab";
import APAdvancesTab from "./APAdvancesTab";
import APAgingSummaryTab from "./APAgingSummaryTab";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {faFileLines,faDatabase} from "@fortawesome/free-solid-svg-icons";


const TABS = [
  { key: "inquiry",  label: "AP Query",       component: APInquiryTab },
  { key: "advances", label: "AP Advances",      component: APAdvancesTab },
  { key: "aging",    label: "AP Aging Summary", component: APAgingSummaryTab },
];

export default function APINQ() {
  const documentTitle = "AP Query";

  const [activeTab, setActiveTab] = useState("inquiry");
  const ActiveComp = useMemo(
    () => TABS.find((t) => t.key === activeTab)?.component ?? null,
    [activeTab]
  );

  // Actions registered by the active tab
  const [actions, setActions] = useState({});

  // === Fixed bar measurements ===
  const barRef = useRef(null);
  const [headerH, setHeaderH] = useState(48); // default guess of your top header height
  const [barH, setBarH] = useState(48);       // default guess of this bar's height

  // ✅ Clear caches BEFORE children mount effects run
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    delete window.__NAYSA_APADV_CACHE__;
    delete window.__NAYSA_APAGE_CACHE__;
    if (window.__NAYSA_APINQ_CACHE__) {
      delete window.__NAYSA_APINQ_CACHE__.AP_INQUIRY;
    }
    window.__NAYSA_APINQ_CACHE__ = {};
  }, []);

  // Measure top header and our bar (works even if layout changes)
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;

    const header =
      document.querySelector("#appHeader") ||                 // prefer an explicit id if you have it
      document.querySelector(".global-app-topbar") ||         // common NAYSA topbar class
      document.querySelector("header[role='banner']") ||      // generic header
      document.querySelector("header");                       // fallback

    const remeasure = () => {
      if (header) {
        const rect = header.getBoundingClientRect();
        setHeaderH(Math.max(0, Math.round(rect.height)));
      }
      if (barRef.current) {
        const rect = barRef.current.getBoundingClientRect();
        setBarH(Math.max(0, Math.round(rect.height)));
      }
    };

    // Initial measure + on resize
    remeasure();
    window.addEventListener("resize", remeasure);

    // If fonts/icons load later and change heights slightly
    const raf = requestAnimationFrame(remeasure);
    const raf2 = requestAnimationFrame(remeasure);

    return () => {
      window.removeEventListener("resize", remeasure);
      cancelAnimationFrame(raf);
      cancelAnimationFrame(raf2);
    };
  }, []);

  // ✅ Memoize so the child doesn't see a new function each render
  const registerActions = useCallback((tabActions) => {
    setActions(tabActions || {});
  }, []);

  // Ensure safe defaults whenever the active tab changes
  useEffect(() => {
    setActions((prev) => ({
      onFind:           prev.onFind           ?? (() => {}),
      onReset:          prev.onReset          ?? (() => {}),
      onPrint:          prev.onPrint          ?? (() => window.print()),
      onViewDoc:        prev.onViewDoc        ?? (() => window.open("/public/NAYSA AP Inquiry.pdf", "_blank")),
      onOpenBal:        prev.onOpenBal        ?? (() => {}),
      onExport:         prev.onExport         ?? (() => {}),
      onExportSummary:  prev.onExportSummary  ?? (() => {}),
      onExportDetailed: prev.onExportDetailed ?? (() => {}),
    }));
  }, [activeTab]);

  // Route ActionBar button IDs → registered handlers
  const handleAction = (id) => {
    switch (id) {
      case "find":
      case "reprocess":
        return actions.onFind?.();
      case "reset":
        return actions.onReset?.();
      case "print":
        return actions.onPrint?.();
      case "viewDoc":
        return actions.onViewDoc?.();
      case "export":
        return actions.onExport?.();
      case "exportSummary":
        return actions.onExportSummary?.();
      default:
        return;
    }
  };

 return (
    <div className="global-ref-main-div-ui">
      
      {/* HEADER SECTION - Aligned with COA Template */}
      <div className="global-ref-header-ui">
        <div className="w-full flex flex-col gap-3 md:grid md:grid-cols-3 md:items-center md:gap-0">

          {/* 1) Title */}
          <div className="w-full md:w-auto md:justify-start flex">
            <h1 className="global-ref-headertext-ui w-full md:w-auto truncate text-center md:text-left">
              {TABS.find(t => t.key === activeTab)?.label}
            </h1>
          </div>

          {/* 2) Tabs - Using your Blue-border template style */}
          <div className="w-full md:justify-center flex">
            <div className="w-full md:w-auto">
              <div className="flex flex-nowrap overflow-x-auto no-scrollbar border-b border-gray-200 dark:border-gray-700">
                {TABS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`shrink-0 whitespace-nowrap px-3 py-2 text-[12px] font-bold transition-all border-b-2
                      ${activeTab === tab.key
                        ? "border-blue-600 text-blue-600 bg-blue-50/50"
                        : "border-transparent text-gray-500 hover:text-blue-500"
                      }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 3) Buttons + Info - Aligned with COA template */}
          <div className="w-full md:w-auto flex md:justify-end">
            <div className="w-full md:w-auto flex items-center justify-center md:justify-end gap-2 flex-wrap">
              
              {/* Using your custom APINQActionBar but styled as a ButtonBar */}
              <div className="flex flex-wrap justify-center md:justify-end gap-2">
                <APINQActionBar
                  activeTab={activeTab}
                  onAction={handleAction}
                />
              </div>


            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Pushing content down to avoid header overlap */}
      <div className="mt-44 sm:mt-24 px-0">
        {ActiveComp && <ActiveComp registerActions={registerActions} />}
      </div>
    </div>
  );
}
