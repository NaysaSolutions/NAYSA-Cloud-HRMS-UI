import { useState } from "react";
import RefDepartment from "./RefDepartment.jsx";
import RefGroup from "./RefGroup.jsx";
import RefType from "./RefType.jsx";
import RefRC from "./RefRC.jsx";

const tabs = [
  { id: "department", label: "Department", Component: RefDepartment },
  { id: "group", label: "Group", Component: RefGroup },
  { id: "type", label: "Type", Component: RefType },
  { id: "rc", label: "RC", Component: RefRC },
];

export default function RefOrganization({ initialTab = "department" }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [visitedTabs, setVisitedTabs] = useState(() => new Set([initialTab]));

  const selectTab = (id) => {
    setVisitedTabs((visited) => new Set([...visited, id]));
    setActiveTab(id);
  };

  const headerTabs = (
    <nav aria-label="Organization references" className="flex w-full md:w-auto flex-nowrap overflow-x-auto no-scrollbar border-b border-blue-300 dark:border-gray-700">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          aria-current={activeTab === tab.id ? "page" : undefined}
          onClick={() => selectTab(tab.id)}
          className={`shrink-0 whitespace-nowrap px-3 py-1 sm:py-2 sm:px-4 text-[10px] sm:text-[13px] font-bold transition-all border-b-2 rounded-md ${
            activeTab === tab.id
              ? "border-blue-700 text-blue-700 bg-blue-50/50 dark:text-blue-200 dark:border-blue-300 dark:bg-blue-950/50"
              : "border-transparent text-gray-500 hover:text-blue-500 dark:text-gray-300"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );

  return tabs.map(({ id, label, Component }) => visitedTabs.has(id) && (
    <div key={id} hidden={activeTab !== id}>
      <Component active={activeTab === id} headerTabs={headerTabs} pageTitle={label} />
    </div>
  ));
}
