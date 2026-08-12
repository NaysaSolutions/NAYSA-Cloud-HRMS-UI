// import React from "react";
// import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
// import { faReceipt } from "@fortawesome/free-solid-svg-icons";

// function SLQueryReport({
//   view,
//   filters,
//   tabConfig,
//   onJumpToGLFromSL,
//   SearchGlobalReportTable,
//   NoRecordsState,
// }) {
//   if (!view.hasLoaded) {
//     return (
//       <div className="p-8 text-sm text-gray-500 flex items-center gap-2">
//         <FontAwesomeIcon icon={faReceipt} className="text-blue-300" />
//         <span>
//           Click <b>Filter</b> then <b>Apply Filters</b> to load <b>{tabConfig.label}</b>.
//         </span>
//       </div>
//     );
//   }

//   if (view.isEmpty) {
//     return (
//       <NoRecordsState
//         title="No records found"
//         subtitle={view.emptyMessage || "Try adjusting your filters."}
//         hint={`Report: ${tabConfig.label}`}
//       />
//     );
//   }

//   const shouldAutoGroup = !(filters.accCode || "").trim();
//   const initialState = shouldAutoGroup ? { groupBy: ["acctName"] } : undefined;
//   const tableKey = `slQuery-${view.loadedAt || "idle"}-${shouldAutoGroup ? "G1" : "G0"}`;

//   const columnsForTable = (Array.isArray(view.cols) ? view.cols : []).map((c) => {
//     const key = c.accessorKey || c.accessor || c.field || c.id || "";
//     const headerTxt = String(c.header || c.Header || "").toLowerCase().trim();

//     const isGroupId =
//       key === "groupId" ||
//       headerTxt === "groupid" ||
//       headerTxt.includes("group id") ||
//       headerTxt === "group_id";

//     if (!isGroupId) return c;

//     return {
//       ...c,
//       cell: (info) => {
//         const original = info?.row?.original || {};
//         const value = info?.getValue?.() ?? original?.groupId ?? "";

//         return (
//           <button
//             type="button"
//             className="text-blue-700 hover:underline font-semibold"
//             onClick={(e) => {
//               e.stopPropagation();
//               onJumpToGLFromSL(original);
//             }}
//             title="Open GL Query using this Group ID"
//           >
//             {value}
//           </button>
//         );
//       },
//     };
//   });

//   return (
//     <SearchGlobalReportTable
//       key={tableKey}
//       initialState={initialState}
//       columns={columnsForTable}
//       data={view.rows}
//       itemsPerPage={50}
//       rightActionLabel={view.rightActionLabel || "View"}
//       onRowAction={(row) => onJumpToGLFromSL(row)}
//     />
//   );
// }

// SLQueryReport.meta = {
//   key: "slQuery",
//   label: "SL Query",
//   icon: faReceipt,
//   filters: ["Branch", "Account Code", "Cut Off"],
//   endpoint: "getSLInquiry",
// };

// SLQueryReport.buildPayload = (f) => ({
//   branchCode: f.branchCode || "",
//   accCode: f.accCode || "",
//   cutoffCode: f.cutoffCode || "",
// });

// SLQueryReport.buildJsonData = (payload) => ({
//   mode: "data",
//   branchCode: payload.branchCode || "",
//   acctCode: payload.accCode || "",
//   cutoffCode: payload.cutoffCode || "",
// });

// export default SLQueryReport;



import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faReceipt, faEye } from "@fortawesome/free-solid-svg-icons";

function SLQueryReport({
  view,
  filters,
  tabConfig,
  isMobile,
  mobileView,
  onJumpToGLFromSL,
  SearchGlobalReportTable,
  NoRecordsState,
}) {
  const formatCellValue = (value, config) => {
    if (value === null || value === undefined || value === "") return "—";

    switch (config?.renderType) {
      case "date": {
        try {
          const raw = String(value).split("T")[0];
          const date = new Date(raw);
          if (Number.isNaN(date.getTime())) return String(value);

          return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          });
        } catch {
          return String(value);
        }
      }

      case "currency":
      case "number": {
        const num = Number(String(value).replace(/,/g, ""));
        if (Number.isNaN(num)) return String(value);

        const digits =
          typeof config?.roundingOff === "number" ? config.roundingOff : 2;

        return num.toLocaleString("en-US", {
          minimumFractionDigits: digits,
          maximumFractionDigits: digits,
        });
      }

      case "status": {
        const map = {
          C: { text: "CANCELLED", className: "text-red-600 font-semibold" },
          F: { text: "FINALIZED", className: "text-blue-800 font-semibold" },
          X: { text: "CANCELLED", className: "text-red-600 font-semibold" },
          "": { text: "OPEN", className: "text-black font-semibold" },
        };

        const sty = map[String(value)] || {
          text: String(value),
          className: "text-gray-800 font-semibold",
        };

        return <span className={sty.className}>{sty.text}</span>;
      }

      default:
        return String(value);
    }
  };

  const isNumericColumn = (col) =>
    col?.renderType === "number" || col?.renderType === "currency";

  if (!view?.hasLoaded) {
    return (
      <div className="p-8 text-sm text-gray-500 flex items-center gap-2">
        <FontAwesomeIcon icon={faReceipt} className="text-blue-300" />
        <span>
          Click <b>Filter</b> then <b>Apply Filters</b> to load <b>{tabConfig.label}</b>.
        </span>
      </div>
    );
  }

  if (view?.isEmpty) {
    return (
      <NoRecordsState
        title="No records found"
        subtitle={view?.emptyMessage || "Try adjusting your filters."}
        hint={`Report: ${tabConfig.label}`}
      />
    );
  }

  const shouldAutoGroup = !(filters?.accCode || "").trim();
  const initialState = shouldAutoGroup ? { groupBy: ["acctName"] } : undefined;
  const tableKey = `slQuery-${view?.loadedAt || "idle"}-${shouldAutoGroup ? "G1" : "G0"}`;

  const columnsForTable = (Array.isArray(view?.cols) ? view.cols : []).map((c) => {
    const key = c?.accessorKey || c?.accessor || c?.field || c?.id || c?.key || "";
    const headerTxt = String(c?.header || c?.Header || c?.label || "")
      .toLowerCase()
      .trim();

    const isGroupId =
      key === "groupId" ||
      headerTxt === "groupid" ||
      headerTxt.includes("group id") ||
      headerTxt === "group_id";

    if (!isGroupId) return c;

    return {
      ...c,
      cell: (info) => {
        const original = info?.row?.original || {};
        const value = info?.getValue?.() ?? original?.groupId ?? "";

        return (
          <button
            type="button"
            className="text-blue-700 hover:underline font-semibold"
            onClick={(e) => {
              e.stopPropagation();
              onJumpToGLFromSL(original);
            }}
            title="Open GL Query using this Group ID"
          >
            {value}
          </button>
        );
      },
    };
  });

  if (isMobile && mobileView === "card") {
    const visibleCols = (Array.isArray(view?.cols) ? view.cols : [])
      .filter((col) => !col?.hidden)
      .map((col) => ({
        ...col,
        key: col?.key || col?.accessorKey || col?.accessor || col?.field || col?.id || "",
        label:
          col?.label ||
          col?.header ||
          col?.Header ||
          String(col?.key || col?.accessorKey || col?.accessor || col?.field || col?.id || ""),
      }))
      .filter((col) => col.key);

    const primaryCol =
      visibleCols.find((col) =>
        ["slCode", "slName", "acctName", "acctCode", "groupId"].includes(col.key)
      ) || visibleCols[0];

    const detailCols = visibleCols.filter((col) => col.key !== primaryCol?.key);

    return (
      <div className="space-y-2 p-2">
        {view?.rows?.map((row, index) => (
          <div
            key={row?.groupId || row?.slCode || row?.acctCode || index}
            className="rounded-xl border bg-white shadow-sm overflow-hidden"
          >
            <div className="px-3 py-3 border-b bg-gradient-to-r from-blue-50 to-white flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[10px] font-semibold text-gray-500">
                  {primaryCol?.label || "Record"}
                </div>
                <div className="text-sm font-bold text-gray-800 truncate">
                  {primaryCol
                    ? formatCellValue(row?.[primaryCol.key], primaryCol)
                    : `Record ${index + 1}`}
                </div>
              </div>

              <button
                type="button"
                className="h-8 w-8 rounded-md bg-blue-500 text-white hover:bg-blue-600 shrink-0"
                title="View"
                onClick={() => onJumpToGLFromSL(row)}
              >
                <FontAwesomeIcon icon={faEye} className="text-[11px]" />
              </button>
            </div>

            <div className="px-3 py-2">
              <div className="space-y-1">
                {detailCols.map((col) => (
                  <div
                    key={col.key}
                    className="grid grid-cols-[110px_1fr] gap-x-2 py-[2px] text-[11px] leading-tight"
                  >
                    <div className="font-semibold text-gray-500">
                      {col.label || col.key}
                    </div>
                    <div
                      className={`min-w-0 break-words ${
                        isNumericColumn(col) || col?.classNames?.includes("text-right")
                          ? "text-right tabular-nums"
                          : "text-left"
                      }`}
                    >
                      {formatCellValue(row?.[col.key], col)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <SearchGlobalReportTable
      key={tableKey}
      initialState={initialState}
      columns={columnsForTable}
      data={view?.rows || []}
      itemsPerPage={0}
      rightActionLabel={view?.rightActionLabel || "View"}
      onRowAction={(row) => onJumpToGLFromSL(row)}
    />
  );
}

SLQueryReport.meta = {
  key: "slQuery",
  label: "SL Query",
  icon: faReceipt,
  filters: ["Branch", "Account Code", "Cut Off"],
  endpoint: "getSLInquiry",
};

SLQueryReport.buildPayload = (f) => ({
  branchCode: f?.branchCode || "",
  accCode: f?.accCode || "",
  cutoffCode: f?.cutoffCode || "",
});

SLQueryReport.buildJsonData = (payload) => ({
  mode: "data",
  branchCode: payload?.branchCode || "",
  acctCode: payload?.accCode || "",
  cutoffCode: payload?.cutoffCode || "",
});

export default SLQueryReport;