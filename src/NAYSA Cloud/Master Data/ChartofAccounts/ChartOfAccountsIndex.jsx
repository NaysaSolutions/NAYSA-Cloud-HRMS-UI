import { useState } from "react";
import COAMast from "./COAMast";
import FSConsolidation from "./FSConsolidation";
import GLFSMatching from "./GLFSMatching";
// ... Import Header UI components (ButtonBar, etc.)

const ChartOfAccountsIndex = () => {
  const [activeTab, setActiveTab] = useState("coa");

  return (
    <div className="global-ref-main-div-ui">
      {/* HEADER & TABS REMAIN HERE ALWAYS */}
      <div className="global-ref-header-ui">
        {/* Render your Title and Buttons here */}
        <div className="flex gap-4">
          <button onClick={() => setActiveTab("coa")}>Chart of Accounts</button>
          <button onClick={() => setActiveTab("fsconso")}>FS Consolidation</button>
          <button onClick={() => setActiveTab("glmatching")}>GL - FS Matching</button>
        </div>
      </div>

      {/* SWITCHING LOGIC: Only the Body changes */}
      <div className="mt-4">
        {activeTab === "coa" && <COAMast />}
        {activeTab === "fsconso" && <FSConsolidation />}
        {activeTab === "glmatching" && <GLFSMatching />}
      </div>
    </div>
  );
};