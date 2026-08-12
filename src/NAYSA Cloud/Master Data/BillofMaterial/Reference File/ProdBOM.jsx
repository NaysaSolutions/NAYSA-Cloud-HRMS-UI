import { useEffect, useMemo, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMagnifyingGlass,
  faPlus,
  faTrashAlt,
  faInfoCircle,
  faChevronDown,
  faFilePdf,
  faVideo,
  faSave as faSaveIcon,
  faUndo,
  faCopy,
  faBoxOpen,
  faWarehouse,
  faTableCellsLarge,
  faEye,
} from "@fortawesome/free-solid-svg-icons";

import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { usePagePermission } from "@/NAYSA Cloud/Global/usePagePermission.js";
import PermissionBadge from "@/NAYSA Cloud/Global/PermissionBadge.jsx";
import RegistrationInfo from "@/NAYSA Cloud/Global/RegistrationInfo.jsx";
import ItemMastLookupModal from "@/NAYSA Cloud/Lookup/SearchItemMast.jsx";
import SearchWorkCenterRef from "@/NAYSA Cloud/Lookup/SearchWorkCenterRef.jsx";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable";
import SearchGlobalReportTableDrilldown from "@/NAYSA Cloud/Lookup/SearchGlobalReportTableDrilldown";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import ButtonBar from "@/NAYSA Cloud/Global/ButtonBar";

import {
  useSwalErrorAlert,
  useSwalSuccessAlert,
  useSwalErrorAlertAPI,
} from "@/NAYSA Cloud/Global/behavior.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import {
  useFieldLenghtCheck,
  useGetFieldLength,
} from "@/NAYSA Cloud/Global/procedure";
import { useTopDocDropDown } from "@/NAYSA Cloud/Global/top1RefTable";
import DateFormatInput from "@/NAYSA Cloud/Global/DateFormatInput.jsx";

import {
  reftablesPDFGuide,
  reftablesVideoGuide,
} from "@/NAYSA Cloud/Global/reftable";

/* ─────────────────────────────────────────────────────────────
   EMPTY VALUES
───────────────────────────────────────────────────────────────*/
const todayInput = () => {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}/${dd}/${d.getFullYear()}`;
};

const emptyForm = {
  bomCode: "",
  bomDate: todayInput(),
  invType: "",
  itemCode: "",
  itemDescription: "",
  routingCode: "",
  workCenter: "",
  workCenterName: "",
  quantity: "1.000000",
  uom: "",
  active: "Y",
  originalActive: "Y",
  remarks: "",

  registeredBy: "",
  registeredDate: "",
  updatedBy: "",
  updatedDate: "",

  __isNew: false,
};

const emptyLine = (lineNo = 1) => ({
  lineNo,
  invType: "",
  itemCode: "",
  itemDescription: "",
  brand: "",
  uom: "",
  qtyNeeded: "0.000000",
  scrapRate: "0.000000",
  scrapQty: "0.000000",
});

/* ─────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────*/
const BOM_HEADER_REQUIRED_INV_TYPES = [
  { value: "FG", label: "FG" },
  { value: "RM", label: "RM" },
];

const BOM_DTL_REQUIRED_INV_TYPES = [
  { value: "FG", label: "FG" },
  { value: "MS", label: "MS" },
  { value: "RM", label: "RM" },
];

const ensureInvTypeOptions = (
  options = [],
  fallbackOptions = BOM_DTL_REQUIRED_INV_TYPES,
) => {
  const map = new Map();
  options
    .filter((option) => String(option?.value || "").trim() !== "")
    .forEach((option) => {
      const value = String(option.value || "")
        .trim()
        .toUpperCase();
      map.set(value, {
        ...option,
        value,
        label: value === "MS" ? "MS " : option.label || value,
      });
    });

  fallbackOptions.forEach((option) => {
    if (!map.has(option.value)) map.set(option.value, option);
  });

  return Array.from(map.values());
};

const buildInvTypeOptions = (
  rows = [],
  fallbackOptions = BOM_DTL_REQUIRED_INV_TYPES,
) => {
  const allowedValues = new Set(
    fallbackOptions.map((option) => String(option.value).toUpperCase()),
  );
  const hsOptions = rows
    .map((d) => {
      const value = String(d.DROPDOWN_CODE ?? d.dropdownCode ?? d.value ?? "")
        .trim()
        .toUpperCase();
      return {
        value,
        label: d.DROPDOWN_NAME ?? d.dropdownName ?? d.label ?? value,
      };
    })
    .filter((d) => d.value && allowedValues.has(d.value));

  return ensureInvTypeOptions(
    hsOptions.length ? hsOptions : fallbackOptions,
    fallbackOptions,
  );
};

const toNumber = (value) => {
  const n = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
};
const fmt6 = (value) => Number(toNumber(value)).toFixed(6);

const clearZeroValueOnFocus = (event, onClear) => {
  const rawValue = String(event?.target?.value ?? "")
    .replace(/,/g, "")
    .trim();
  if (!rawValue || Number(rawValue) !== 0) return;

  event.target.value = "";
  onClear?.("");
};

const toInputDate = (value) => {
  if (!value) return todayInput();
  const s = String(value);

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;

  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return todayInput();

  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}/${dd}/${d.getFullYear()}`;
};

const normalizeItemRow = (row = {}) => ({
  invType: row.invType || row.inventoryType || row.type || "",
  itemCode: row.itemCode || row.ITEM_CODE || row.item_code || "",
  itemDescription:
    row.itemName || row.itemDesc || row.itemDescription || row.ITEM_NAME || "",
  brand: row.brand || row.brandName || row.BRAND || "",
  uom: row.uomCode || row.uom || row.UOM_CODE || "",
});

const getItemLookupConfig = (invType) => {
  const normalizedInvType = String(invType || "")
    .trim()
    .toUpperCase();
  const lookupInvType = ["FG", "MS", "RM"].includes(normalizedInvType)
    ? normalizedInvType
    : "FG";
  return {
    invType: lookupInvType,
    endpoint: `getInvLookup${lookupInvType}`,
    docType: `PR${lookupInvType}`,
  };
};

const parseSprocJsonResult = (rows) => {
  if (!rows) return [];
  const r = rows?.[0]?.result;
  if (typeof r === "string") {
    try {
      return JSON.parse(r || "[]");
    } catch {
      return [];
    }
  }
  if (Array.isArray(rows) && rows.length && typeof rows[0] === "object")
    return rows;
  return [];
};

const isInactiveStatus = (active) =>
  String(active || "Y")
    .trim()
    .toUpperCase() === "N";

const normalizeReportTableColumns = (columns = []) =>
  (Array.isArray(columns) ? columns : []).map((col) => ({
    ...col,
    label: col.label || col.header || col.name || col.key || "",
    renderType:
      col.renderType ||
      (col.type === "amount"
        ? "number"
        : col.type === "date"
          ? "date"
          : col.type),
    roundingOff:
      col.roundingOff ??
      (typeof col.decimals === "number" ? col.decimals : undefined),
    className: col.className || col.cellClassName || "",
  }));
/* ─────────────────────────────────────────────────────────────
   LEFT PANEL / HISTORY (BOM RECORD UI ENHANCED)
───────────────────────────────────────────────────────────────*/
const BOMListPanel = ({ rows, onSelect, onRefresh, isLoading }) => {
  // Drill-down State
  const [expandedCodes, setExpandedCodes] = useState([]);
  const [detailCache, setDetailCache] = useState({});
  const [loadingDetailCode, setLoadingDetailCode] = useState("");

  // Filter State
  const [statusFilter, setStatusFilter] = useState("ALL");

  const getBOMDescription = (row = {}) =>
    row.bomDescription ||
    row.bomDesc ||
    row.bom_description ||
    row.itemDescription ||
    row.itemName ||
    row.itemDesc ||
    "";

  const getBOMQty = (row = {}) =>
    row.quantity ?? row.qty ?? row.bomQty ?? row.batchQty ?? "0.000000";

  const getBOMUOM = (row = {}) =>
    row.uom || row.uomCode || row.UOM_CODE || row.uom_code || "";

  const getWorkCenterDisplay = (row = {}) => {
    const code = row.workCenter || row.wcCode || "";
    const name = row.workCenterName || row.wcName || row.wc_name || "";
    if (code && name) return `${code} - ${name}`;
    return code || name || "-";
  };

  const tableRows = useMemo(() => {
    const processedRows = (Array.isArray(rows) ? rows : []).map(
      (row, index) => {
        const bomCode = row.bomCode || row.BOM_CODE || row.bom_code || "";
        const activeValue =
          row.active ?? row.ACTIVE ?? row.status ?? row.STATUS ?? "Y";
        const inactive =
          isInactiveStatus(activeValue) ||
          String(activeValue || "")
            .trim()
            .toUpperCase() === "INACTIVE";
        const bomQty = toNumber(getBOMQty(row));

        return {
          ...row,
          key: bomCode || `bom-record-${index}`,
          bomCode,
          bomDate: row.bomDate || row.BOM_DATE || row.bom_date || "",
          invType: row.invType || row.inv_type || row.INV_TYPE || "",
          itemCode: row.itemCode || row.item_code || row.ITEM_CODE || "",
          bomDescriptionDisplay: getBOMDescription(row),
          bomQty,
          bomQtyDisplay: fmt6(bomQty),
          bomUomDisplay: getBOMUOM(row),
          workCenterDisplay: getWorkCenterDisplay(row),
          statusDisplay: inactive ? "INACTIVE" : "ACTIVE",
        };
      },
    );

    // Apply the Active/Inactive Filter
    if (statusFilter === "ALL") return processedRows;
    return processedRows.filter((row) => row.statusDisplay === statusFilter);
  }, [rows, statusFilter]);

  // Normalizes the components fetched from the DB
  const normalizeComponentRows = (components = []) =>
    components.map((d, idx) => ({
      lineNo: d.lineNo || d.LINE_NO || idx + 1,
      invType: d.invType || d.inv_type || d.INV_TYPE || "",
      itemCode: d.itemCode || d.item_code || d.ITEM_CODE || "",
      itemDescription:
        d.itemDescription || d.itemDesc || d.itemName || d.ITEM_NAME || "",
      uom: d.uom || d.uomCode || d.UOM_CODE || "",
      qtyNeeded: fmt6(d.qtyNeeded ?? d.qty_needed ?? d.QTY_NEEDED ?? 0),
      scrapRate: fmt6(d.scrapRate ?? d.scrap_rate ?? d.SCRAP_RATE ?? 0),
    }));

  // Fetch logic for the Drill-Down
  const loadDrillDownComponents = async (code) => {
    if (!code) return;

    // Toggle expansion state
    setExpandedCodes((prev) => {
      if (prev.includes(code)) return prev.filter((c) => c !== code);
      return [...prev, code];
    });

    // If data is already cached, don't hit the API again
    if (detailCache[code]) return;

    setLoadingDetailCode(code);
    try {
      const res = await apiClient.post("/getProdBOM", { BOM_CODE: code });
      const parsed = parseSprocJsonResult(res?.data?.data);
      const record = Array.isArray(parsed) ? parsed?.[0] : null;
      const components = Array.isArray(record?.dt1) ? record.dt1 : [];

      setDetailCache((prev) => ({
        ...prev,
        [code]: normalizeComponentRows(components),
      }));
    } catch {
      setDetailCache((prev) => ({ ...prev, [code]: [] }));
    } finally {
      setLoadingDetailCode("");
    }
  };

  const handleToggleExpandAll = () => {
    if (expandedCodes.length > 0) {
      // If any rows are expanded, collapse them all
      setExpandedCodes([]);
    } else {
      // If nothing is expanded, show all
      const allCodes = tableRows.map((row) => row.bomCode);
      setExpandedCodes(allCodes);

      // Fetch component data in the background for any rows that aren't cached yet
      allCodes.forEach(async (code) => {
        if (!detailCache[code]) {
          try {
            const res = await apiClient.post("/getProdBOM", { BOM_CODE: code });
            const parsed = parseSprocJsonResult(res?.data?.data);
            const record = Array.isArray(parsed) ? parsed?.[0] : null;
            const components = Array.isArray(record?.dt1) ? record.dt1 : [];

            setDetailCache((prev) => ({
              ...prev,
              [code]: normalizeComponentRows(components),
            }));
          } catch {
            setDetailCache((prev) => ({ ...prev, [code]: [] }));
          }
        }
      });
    }
  };


  // Inject custom render for the Action column to include the Chevron
  const bomRecordColumns = useMemo(
    () =>
      normalizeReportTableColumns([
        {
          key: "drillDownActions",
          header: "Actions",
          width: 90,
          minWidth: 90,
          renderType: "actions",
          render: (row) => {
            const isExpanded = expandedCodes.includes(row.bomCode);
            return (
              <div className="flex items-center justify-center gap-1.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    loadDrillDownComponents(row.bomCode);
                  }}
                  className={`inline-flex h-6 w-6 items-center justify-center rounded transition-colors ${
                    isExpanded
                      ? "bg-blue-600 text-white shadow-inner"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800"
                  }`}
                  title={isExpanded ? "Collapse Details" : "Drill Down"}
                >
                  <FontAwesomeIcon
                    icon={faChevronDown}
                    className={`text-[10px] transition-transform duration-200 ${
                      isExpanded ? "-rotate-180" : "rotate-0"
                    }`}
                  />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(row);
                  }}
                  className="inline-flex h-6 w-8 items-center justify-center rounded bg-blue-500 text-white shadow-sm transition-colors hover:bg-blue-600"
                  title="View Record"
                >
                  <FontAwesomeIcon icon={faEye} className="text-[10px]" />
                </button>
              </div>
            );
          },
        },
        {
          key: "bomDate",
          header: "BOM Effectivity Date",
          width: 150,
          minWidth: 140,
          type: "date",
        },
        {
          key: "bomCode",
          header: "BOM Code",
          width: 140,
          minWidth: 120,
          cellClassName: "font-mono text-xs",
        },
        { key: "invType", header: "Inv Type", width: 100, minWidth: 90 },
        {
          key: "itemCode",
          header: "Item Code",
          width: 140,
          minWidth: 120,
          cellClassName: "font-mono text-xs",
        },
        {
          key: "bomDescriptionDisplay",
          header: "Item Name",
          width: 280,
          minWidth: 180,
          maxWidth: 420,
        },
        {
          key: "workCenterDisplay",
          header: "Work Center",
          width: 200,
          minWidth: 160,
          maxWidth: 340,
        },
        {
          key: "bomQty",
          header: "Batch Qty",
          width: 130,
          minWidth: 120,
          cellClassName: "text-right font-semibold",
          type: "amount",
          decimals: 6,
        },
        {
          key: "bomUomDisplay",
          header: "UOM",
          width: 90,
          minWidth: 80,
          cellClassName: "text-center",
        },
        { key: "statusDisplay", header: "Status", width: 110, minWidth: 100 },
      ]),
    [expandedCodes, onSelect],
  );

  // The Sub-Component UI passed into SearchGlobalReportTable
  const renderDetailPanel = (row) => {
    if (!expandedCodes.includes(row.bomCode)) return null;

    const components = detailCache[row.bomCode] || [];
    const isDetailLoading = loadingDetailCode === row.bomCode;

    return (
      <div className="w-full bg-slate-50 dark:bg-slate-900/50 py-3 px-6 shadow-[inset_0_2px_6px_rgba(0,0,0,0.03)] border-b border-slate-200 dark:border-slate-700 border-l-4 border-l-blue-500">
        <div className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md overflow-hidden">
          <div className="flex items-center justify-between bg-blue-50/40 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700 px-3 py-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Components for {row.bomCode}
            </span>
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
              {isDetailLoading
                ? "Fetching data..."
                : `${components.length} items`}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[800px] w-full text-[10px] text-left">
              <thead className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 uppercase font-bold">
                <tr>
                  <th className="w-12 px-3 py-1.5 text-center border-l border-slate-200 dark:border-slate-700">
                    LN
                  </th>
                  <th className="w-20 px-3 py-1.5 text-center border-l border-slate-200 dark:border-slate-700">
                    Type
                  </th>
                  <th className="w-32 px-3 py-1.5 border-l border-slate-200 dark:border-slate-700">
                    Item Code
                  </th>
                  <th className="px-3 py-1.5 border-l border-slate-200 dark:border-slate-700">
                    Component Description
                  </th>
                  <th className="w-20 px-3 py-1.5 text-center border-l border-slate-200 dark:border-slate-700">
                    UOM
                  </th>
                  <th className="w-28 px-3 py-1.5 text-right border-l border-slate-200 dark:border-slate-700">
                    Qty Needed
                  </th>
                  <th className="w-24 px-3 py-1.5 text-right border-l border-slate-200 dark:border-slate-700">
                    Scrap Rate (%)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {isDetailLoading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-6 text-center text-slate-400 dark:text-slate-500"
                    >
                      Loading structure...
                    </td>
                  </tr>
                ) : components.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-6 text-center text-slate-400 dark:text-slate-500"
                    >
                      No components defined.
                    </td>
                  </tr>
                ) : (
                  components.map((component, index) => (
                    <tr
                      key={`${row.bomCode}-comp-${index}`}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                    >
                      <td className="px-3 py-1.5 text-center font-medium text-slate-500 dark:text-slate-400">
                        {index + 1}
                      </td>
                      <td className="px-3 py-1.5 text-center border-l border-slate-100 dark:border-slate-700/50 font-bold dark:text-slate-300">
                        {component.invType || "-"}
                      </td>
                      <td className="px-3 py-1.5 border-l border-slate-100 dark:border-slate-700/50 font-bold text-slate-700 dark:text-slate-300">
                        {component.itemCode || "-"}
                      </td>
                      <td className="px-3 py-1.5 border-l border-slate-100 dark:border-slate-700/50 text-slate-700 dark:text-slate-400">
                        {component.itemDescription || "-"}
                      </td>
                      <td className="px-3 py-1.5 text-center border-l border-slate-100 dark:border-slate-700/50 text-slate-600 dark:text-slate-400">
                        {component.uom || "-"}
                      </td>
                      <td className="px-3 py-1.5 text-right border-l border-slate-100 dark:border-slate-700/50 font-mono text-blue-700 dark:text-blue-400 font-semibold">
                        {component.qtyNeeded}
                      </td>
                      <td className="px-3 py-1.5 text-right border-l border-slate-100 dark:border-slate-700/50 font-mono text-slate-500 dark:text-slate-400">
                        {component.scrapRate}%
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full bg-slate-50 dark:bg-slate-900 p-2 min-h-[calc(100vh-160px)] flex flex-col gap-2">
      {/* Dynamic Toolbar Area above the standard table */}
      <div className="flex justify-end items-center px-1 pb-1">
        <div className="flex items-center gap-3">
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Status Filter:
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-7 px-2 text-[11px] font-medium rounded border border-slate-200 bg-white text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-colors"
            >
              <option value="ALL">All Records</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>

          {/* Collapse All Button */}
          <button
            type="button"
            onClick={handleToggleExpandAll}
            disabled={tableRows.length === 0}
            className={`flex items-center gap-1.5 h-7 px-3 text-[11px] font-bold rounded shadow-sm transition-all ${
              tableRows.length > 0
                ? expandedCodes.length > 0
                  ? "bg-blue-600 text-white hover:bg-blue-700" // Active state (Collapse All)
                  : "bg-white text-blue-600 border border-blue-600 hover:bg-blue-50 dark:bg-slate-800 dark:border-blue-500 dark:text-blue-400" // Inactive state (Show All)
                : "bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed" // Disabled state
            }`}
          >
            <FontAwesomeIcon 
              icon={faChevronDown} 
              className={`transition-transform duration-200 ${expandedCodes.length > 0 ? "-rotate-180" : "rotate-0"}`} 
            />
            {expandedCodes.length > 0 
              ? `Collapse All (${expandedCodes.length})` 
              : "Show All"}
          </button>
        </div>
      </div>

      <SearchGlobalReportTableDrilldown
        columns={bomRecordColumns}
        data={tableRows}
        isLoading={isLoading}
        isFetching={isLoading}
        onRefresh={onRefresh}
        itemsPerPage={1000}
        docType="BOM Records"
        rightActionLabel="Actions"
        onRowAction={onSelect}
        onRowDoubleClick={onSelect}
        onMobileRowOpen={onSelect}
        // Drill-down hooks
        renderDetailPanel={renderDetailPanel}
        expandedRowKeys={expandedCodes}
        rowKey="bomCode"
        onRowExpand={(row) => loadDrillDownComponents(row.bomCode)}
        className="min-h-[calc(100vh-210px)]"
      />
    </div>
  );
};
/* ─────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────────*/
const ProdBOM = () => {
  const [topTab, setTopTab] = useState("details");
  const [activeTab, setActiveTab] = useState("basic");
  const [detailActiveTab, setDetailActiveTab] = useState("components");
  const [isOpenGuide, setOpenGuide] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isMasterLoading, setIsMasterLoading] = useState(false);
  const [isRecordLoading, setIsRecordLoading] = useState(false);
  const [isCheckingBOMCode, setIsCheckingBOMCode] = useState(false);

  const [form, setForm] = useState({ ...emptyForm });
  const [selectedCode, setSelectedCode] = useState("");
  const [masterList, setMasterList] = useState([]);
  const [lines, setLines] = useState([]);
  const [isCurrentBOMUsed, setIsCurrentBOMUsed] = useState(false);

  const [bomHdFieldArray, setBomHdFieldArray] = useState([]);
  const [bomDt1FieldArray, setBomDt1FieldArray] = useState([]);
  const [lookupState, setLookupState] = useState({
    open: false,
    target: "header",
    lineIndex: -1,
    invType: "FG",
  });
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [wcLookupOpen, setWcLookupOpen] = useState(false);
  const itemLookupConfig = useMemo(
    () => getItemLookupConfig(lookupState.invType),
    [lookupState.invType],
  );

  const { user } = useAuth();
  const userCode = user?.USER_CODE || user?.userCode || user?.code || "";
  const guideRef = useRef(null);
  const addTypeDropdownRef = useRef(null);
  const bomCodeInputRef = useRef(null);

  const docType = "ProdBOM";
  const pdfLink = reftablesPDFGuide?.[docType] || "#";
  const videoLink = reftablesVideoGuide?.[docType] || "#";

  const { pagePermission, isReadOnly, isFullAccess, canAdd, canSave } =
    usePagePermission({
      componentKey: docType,
      menuName: "Bill of Materials  Master Data",
      debug: false,
    });

  const updateForm = (patch) => setForm((p) => ({ ...p, ...patch }));
  const hasRecord = String(form?.bomCode || "").trim() && !form.__isNew;

  // New Lock Check Variables
  const isLockedBOM =
    hasRecord && String(form.originalActive || "Y").toUpperCase() === "N";
  const canEditForm = isFullAccess && !isLockedBOM;

  const isPageBusy = isLoading || isMasterLoading || isRecordLoading;

  // Click outside guide listener
  useEffect(() => {
    const handleClick = (e) => {
      if (guideRef.current && !guideRef.current.contains(e.target))
        setOpenGuide(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Click outside component Add Item dropdown
  useEffect(() => {
    if (!showTypeDropdown) return;

    const handleClickOutside = (event) => {
      if (addTypeDropdownRef.current?.contains(event.target)) return;
      setShowTypeDropdown(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showTypeDropdown]);

  const { data: dropdowns } = useQuery({
    queryKey: ["BOMDROPDOWN"],
    queryFn: async () => {
      const [headerInvTypes, detailInvTypes] = await Promise.all([
        useTopDocDropDown("BOMHD", "BOM_INV_TYPE"),
        useTopDocDropDown("BOMDTL", "BOM_DTL_TYPE"),
      ]);
      return { headerInvTypes, detailInvTypes };
    },
  });

  const headerInvTypeOptions = useMemo(
    () =>
      buildInvTypeOptions(
        dropdowns?.headerInvTypes || [],
        BOM_HEADER_REQUIRED_INV_TYPES,
      ),
    [dropdowns],
  );
  const detailInvTypeOptions = useMemo(
    () =>
      buildInvTypeOptions(
        dropdowns?.detailInvTypes || [],
        BOM_DTL_REQUIRED_INV_TYPES,
      ),
    [dropdowns],
  );

  useEffect(() => {
    loadMasterList();
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [hdFields, dt1Fields] = await Promise.all([
        useFieldLenghtCheck("BOM_HD"),
        useFieldLenghtCheck("BOM_DT1"),
      ]);
      if (mounted) {
        setBomHdFieldArray(hdFields || []);
        setBomDt1FieldArray(dt1Fields || []);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const getMax = (col, table = "BOM_HD") =>
    useGetFieldLength(
      table === "BOM_DT1" ? bomDt1FieldArray : bomHdFieldArray,
      col,
    );

  const getCheckResult = (res) => {
    const row = res?.data?.data?.[0] || res?.data?.[0] || {};
    const value =
      row.result ?? row.RESULT ?? row.isUsed ?? row.isused ?? row.exists;
    return String(value ?? "0").trim() === "1" || value === true;
  };

  const checkDuplicateBOM = async (bomCode) => {
    const code = String(bomCode || "").trim();
    if (!code) return false;
    const res = await apiClient.post("/checkDuplicateProdBOM", {
      json_data: { bomCode: code },
    });
    return getCheckResult(res);
  };

  const checkInUsedBOM = async (bomCode) => {
    const code = String(bomCode || "").trim();
    if (!code) return false;
    const res = await apiClient.post("/checkInUsedProdBOM", {
      json_data: { bomCode: code },
    });
    return getCheckResult(res);
  };

  const loadMasterList = async () => {
    setIsMasterLoading(true);
    try {
      const res = await apiClient.get("/prodBOM");
      const list = parseSprocJsonResult(res?.data?.data).map((row) => ({
        ...row,
        bomDate: toInputDate(row.bomDate),
      }));
      setMasterList(list);
    } catch {
      setMasterList([]);
    } finally {
      setIsMasterLoading(false);
    }
  };

  const fetchBOMByCode = async (bomCode) => {
    const code = String(bomCode || "").trim();
    if (!code) return;

    setIsRecordLoading(true);
    try {
      const res = await apiClient.post("/getProdBOM", { BOM_CODE: code });
      const parsed = parseSprocJsonResult(res?.data?.data);
      const row = Array.isArray(parsed) ? parsed?.[0] : null;

      if (!row) {
        await useSwalErrorAlert("Info", "BOM record not found.");
        return;
      }

      const detailRows = Array.isArray(row.dt1)
        ? row.dt1.map((d, idx) => ({
            ...emptyLine(idx + 1),
            ...d,
            lineNo: d.lineNo || idx + 1,
            qtyNeeded: fmt6(d.qtyNeeded),
            scrapRate: fmt6(d.scrapRate),
            scrapQty: fmt6(d.scrapQty),
          }))
        : [];

      const normalizedWorkCenter = row.workCenter || row.wcCode || "";
      const normalizedWorkCenterName =
        row.workCenterName || row.wcName || row.wc_name || "";

      setForm({
        ...emptyForm,
        ...row,
        originalActive: row.active || "Y",
        workCenter: normalizedWorkCenter,
        wcCode: normalizedWorkCenter,
        workCenterName: normalizedWorkCenterName,
        wcName: normalizedWorkCenterName,
        bomDate: toInputDate(row.bomDate),
        quantity: fmt6(row.quantity || 1),
        __isNew: false,
      });
      setLines(detailRows.length ? detailRows : [emptyLine(1)]);
      setSelectedCode(code);
      try {
        setIsCurrentBOMUsed(await checkInUsedBOM(code));
      } catch {
        setIsCurrentBOMUsed(false);
      }
    } catch {
      await useSwalErrorAlertAPI("Fetch Error", "Failed to fetch BOM record.");
    } finally {
      setIsRecordLoading(false);
    }
  };

  const handleSelectBOM = async (row) => {
    setTopTab("details");
    setSelectedCode(row.bomCode);
    await fetchBOMByCode(row.bomCode);
  };

  const handleReset = () => {
    setSelectedCode("");
    setIsCurrentBOMUsed(false);
    setForm({ ...emptyForm, bomDate: todayInput() });
    setLines([]);
  };

  const handleAdd = async () => {
    if (!canAdd) {
      await useSwalErrorAlert("Read Only", "Not allowed to add BOM records.");
      return;
    }
    setTopTab("details");
    setSelectedCode("");
    setIsCurrentBOMUsed(false);
    setForm({ ...emptyForm, bomDate: todayInput(), __isNew: true });
    setLines([]);
  };

  const handleCopy = async () => {
    if (!canAdd) {
      await useSwalErrorAlert("Read Only", "Not allowed to copy BOM records.");
      return;
    }
    if (!hasRecord) {
      await useSwalErrorAlert("Required", "Select a BOM record first.");
      return;
    }
    setTopTab("details");
    const copiedLines = lines.map((row, idx) => ({
      ...emptyLine(idx + 1),
      ...row,
      lineNo: idx + 1,
      qtyNeeded: fmt6(row.qtyNeeded),
      scrapRate: fmt6(row.scrapRate),
      scrapQty: fmt6(row.scrapQty),
    }));
    setSelectedCode("");
    setIsCurrentBOMUsed(false);
    setForm({
      ...emptyForm,
      ...form,
      bomId: "",
      bomCode: "",
      bomDate: todayInput(),
      active: "Y",
      originalActive: "Y",
      __isNew: true,
    });
    setLines(copiedLines);
  };

  const upsertBOM = async () => {
    if (!canSave) {
      await useSwalErrorAlert("Read Only", "Not allowed to save BOM records.");
      return;
    }

    if (!String(form.bomCode || "").trim()) {
      await useSwalErrorAlert("Required", "BOM Code is required.");
      return;
    }
    if (!String(form.invType || "").trim()) {
      await useSwalErrorAlert("Required", "Please select an Inventory Type.");
      return;
    }
    if (!String(form.itemCode || "").trim()) {
      await useSwalErrorAlert("Required", "Please select an Item Code.");
      return;
    }
    if (toNumber(form.quantity) <= 0) {
      await useSwalErrorAlert(
        "Required",
        "Quantity must be greater than zero.",
      );
      return;
    }

    const batchQty = toNumber(form.quantity);
    if (batchQty <= 0) {
      await useSwalErrorAlert(
        "Required",
        "Batch Quantity must be greater than zero and cannot be negative.",
      );
      return;
    }

    const cleanBomCode = String(form.bomCode || "").trim();
    const originalBomCode = String(selectedCode || "").trim();
    const isNewRecord = !originalBomCode || form.__isNew;
    const isCodeChanged =
      !!originalBomCode &&
      cleanBomCode.toUpperCase() !== originalBomCode.toUpperCase();

    try {
      if (
        !isNewRecord &&
        (isCurrentBOMUsed || (await checkInUsedBOM(originalBomCode)))
      ) {
        await useSwalErrorAlert(
          "Record In Use",
          "Cannot save changes. This BOM Code is already used in Work Order.",
        );
        return;
      }

      if (
        (isNewRecord || isCodeChanged) &&
        (await checkDuplicateBOM(cleanBomCode))
      ) {
        await useSwalErrorAlert(
          "Duplicate BOM Code",
          "BOM Code already exists. Please use another BOM Code.",
        );
        return;
      }
    } catch {
      await useSwalErrorAlertAPI(
        "Validation Error",
        "Unable to validate duplicate or in-used status. Please check the API route and stored procedure.",
      );
      return;
    }

    const detailRows = lines
      .filter((row) => String(row.invType || row.itemCode || "").trim() !== "")
      .map((row, idx) => ({
        lineNo: idx + 1,
        invType: row.invType,
        itemCode: row.itemCode,
        itemDescription: row.itemDescription,
        uom: row.uom,
        qtyNeeded: fmt6(row.qtyNeeded),
        scrapRate: fmt6(row.scrapRate),
        scrapQty: fmt6(row.scrapQty),
      }));

    if (detailRows.length === 0) {
      await useSwalErrorAlert("Required", "Add at least one component line.");
      return;
    }
    const invalidLine = detailRows.find(
      (row) => !row.invType || !row.itemCode || toNumber(row.qtyNeeded) <= 0,
    );
    if (invalidLine) {
      await useSwalErrorAlert(
        "Required",
        "Complete Type, Item Code, and Qty Needed in all component lines.",
      );
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        json_data: {
          ...form,
          bomCode: cleanBomCode,
          quantity: fmt6(batchQty),
          action: selectedCode ? "edit" : "add",
          userCode,
          dt1: detailRows,
        },
      };
      const res = await apiClient.post("/upsertProdBOM", payload);
      const sqlRow = res?.data?.data?.[0];
      if (sqlRow?.errorcount > 0 || sqlRow?.errorCount > 0) {
        await useSwalErrorAlert(
          "Validation Failed",
          sqlRow?.errormsg || sqlRow?.errorMsg,
        );
        return;
      }
      const finalCode =
        sqlRow?.generatedCode || sqlRow?.generatedcode || form.bomCode;
      await useSwalSuccessAlert("Success!", "BOM saved successfully.");
      setSelectedCode(finalCode);
      await loadMasterList();
      await fetchBOMByCode(finalCode);
    } catch {
      await useSwalErrorAlert("Save Failed", "Failed to save BOM.");
    } finally {
      setIsLoading(false);
    }
  };

  // Form Event Handlers
  const handleFieldChange = (name, value) => {
    if (name === "invType") {
      updateForm({
        invType: value,
        itemCode: "",
        itemDescription: "",
        uom: "",
      });
      return;
    }
    updateForm({ [name]: value });
  };

  const handleBOMCodeBlur = async () => {
    if (!isFullAccess) return;

    const cleanBomCode = String(form.bomCode || "").trim();
    const originalBomCode = String(selectedCode || "").trim();

    if (!cleanBomCode) return;

    // Do not treat the same selected BOM code as a duplicate while editing.
    if (
      originalBomCode &&
      cleanBomCode.toUpperCase() === originalBomCode.toUpperCase()
    ) {
      if (cleanBomCode !== form.bomCode) updateForm({ bomCode: cleanBomCode });
      return;
    }

    setIsCheckingBOMCode(true);
    try {
      const isDuplicate = await checkDuplicateBOM(cleanBomCode);

      if (isDuplicate) {
        updateForm({ bomCode: "" });
        await useSwalErrorAlert(
          "Duplicate BOM Code",
          "BOM Code already exists. Please enter another BOM Code.",
        );
        setTimeout(() => bomCodeInputRef.current?.focus?.(), 0);
        return;
      }

      if (cleanBomCode !== form.bomCode) updateForm({ bomCode: cleanBomCode });
    } catch {
      await useSwalErrorAlertAPI(
        "Validation Error",
        "Unable to validate BOM Code. Please check the API route and stored procedure.",
      );
    } finally {
      setIsCheckingBOMCode(false);
    }
  };

  const updateLine = (idx, key, val) => {
    const next = [...lines];
    let row = { ...next[idx], [key]: val };

    if (key === "invType") {
      row = {
        ...row,
        itemCode: "",
        itemDescription: "",
        brand: "",
        uom: "",
      };
    }

    if (["qtyNeeded", "scrapRate", "scrapQty"].includes(key)) {
      let qty = key === "qtyNeeded" ? toNumber(val) : toNumber(row.qtyNeeded);
      let rate = key === "scrapRate" ? toNumber(val) : toNumber(row.scrapRate);
      let scrap = key === "scrapQty" ? toNumber(val) : toNumber(row.scrapQty);

      if (key === "scrapRate") {
        scrap = qty * (rate / 100);
      } else if (key === "scrapQty") {
        rate = qty > 0 ? (scrap / qty) * 100 : 0;
      } else if (key === "qtyNeeded") {
        scrap = qty * (rate / 100);
      }

      // Validation: If it exceeds needed Qty or 100% Rate, force strictly to "0"
      if ((scrap > 0 && scrap >= qty) || rate >= 100) {
        row.scrapRate = "0";
        row.scrapQty = "0";
      } else {
        // Otherwise, format missing fields to 6 decimals
        if (key !== "scrapRate") row.scrapRate = fmt6(rate);
        if (key !== "scrapQty") row.scrapQty = fmt6(scrap);
      }
    }

    next[idx] = row;
    setLines(next);
  };

  const reNumberLines = (rows) =>
    rows.map((row, idx) => ({ ...row, lineNo: idx + 1 }));

  const addLineAfter = (idx = lines.length - 1) => {
    const safeIndex = Number.isFinite(idx)
      ? Math.max(-1, Math.min(idx, lines.length - 1))
      : lines.length - 1;

    const insertAt = safeIndex + 1;
    const next = [...lines];

    next.splice(insertAt, 0, emptyLine(insertAt + 1));
    setLines(reNumberLines(next));
  };
  const removeLine = (idx) => {
    const next = lines.filter((_, i) => i !== idx);
    setLines(next.length ? reNumberLines(next) : []);
  };

  // Lookup Logic
  const openHeaderLookup = () =>
    setLookupState({
      open: true,
      target: "header",
      lineIndex: -1,
      invType: getItemLookupConfig(form.invType).invType,
    });
  const openLineLookup = (idx, invType) =>
    setLookupState({
      open: true,
      target: "line",
      lineIndex: idx,
      invType: getItemLookupConfig(invType).invType,
    });
  const openComponentAddLookup = (invType) => {
    if (!canEditForm || isPageBusy) return;
    setShowTypeDropdown(false);
    setLookupState({
      open: true,
      target: "footer",
      lineIndex: -1,
      invType: getItemLookupConfig(invType).invType,
    });
  };

  const handleComponentAddClick = () => {
    if (!canEditForm || isPageBusy) return;
    setShowTypeDropdown((prev) => !prev);
  };
  const closeLookup = () => setLookupState((p) => ({ ...p, open: false }));

  const appendComponentItems = (invType, selectedRows = []) => {
    const selectedItems = selectedRows
      .map((item) => normalizeItemRow(item))
      .filter((item) => String(item.itemCode || "").trim() !== "");

    if (!selectedItems.length) return;

    const existingRows = lines.filter(
      (row) =>
        String(
          row.invType || row.itemCode || row.itemDescription || "",
        ).trim() !== "",
    );

    const rowsToAdd = selectedItems.map((item, idx) => ({
      ...emptyLine(existingRows.length + idx + 1),
      invType,
      itemCode: item.itemCode,
      itemDescription: item.itemDescription,
      brand: item.brand || "",
      uom: item.uom,
    }));

    setLines(reNumberLines([...existingRows, ...rowsToAdd]));
  };

  const handleCloseItemLookup = (payload) => {
    const selectedRows = Array.isArray(payload?.records)
      ? payload.records
      : payload?.records
        ? [payload.records]
        : [];

    if (!selectedRows.length) {
      closeLookup();
      return;
    }

    const r = normalizeItemRow(selectedRows[0]);
    if (lookupState.target === "header") {
      updateForm({
        invType: form.invType || r.invType || lookupState.invType,
        itemCode: r.itemCode,
        itemDescription: r.itemDescription,
        uom: r.uom,
      });
    } else if (lookupState.target === "footer") {
      appendComponentItems(lookupState.invType, selectedRows);
    } else {
      const next = [...lines];
      next[lookupState.lineIndex] = {
        ...next[lookupState.lineIndex],
        invType: lookupState.invType,
        itemCode: r.itemCode,
        itemDescription: r.itemDescription,
        brand: r.brand || "",
        uom: r.uom,
      };
      setLines(next);
    }
    closeLookup();
  };

  /* ─────────────────────────────────────────────────────────────
       WAREMAST-STYLE COMPONENT TABLE
    ───────────────────────────────────────────────────────────────*/
  const bomDetailRows = useMemo(
    () =>
      lines.map((row, originalIndex) => ({
        ...row,
        originalIndex,
        key: `bom-detail-${originalIndex}`,
      })),
    [lines],
  );

  const bomDetailColumns = useMemo(() => {
    const numberInput = (row, field) => {
      // Map the camelCase field name to your DB column name
      const dbColName =
        field === "qtyNeeded"
          ? "QTY_NEEDED"
          : field === "scrapRate"
            ? "SCRAP_RATE"
            : "SCRAP_QTY";

      return (
        <input
          id={`bom-input-${field}-${row.originalIndex}`}
          type="text"
          className="w-full global-tran-td-inputclass-ui text-right !h-7 text-[11px]"
          value={row[field] || ""}
          disabled={!canEditForm}
          // Added a fallback of 18 in case the DB dictionary fails to load the length
          maxLength={getMax(dbColName, "BOM_DT1") || 18}
          onFocus={(e) => {
            // Added "scrapQty" to this array so the 0.000000 clears when you click on it!
            if (!["qtyNeeded", "scrapRate", "scrapQty"].includes(field)) return;
            clearZeroValueOnFocus(e, (value) =>
              updateLine(row.originalIndex, field, value),
            );
          }}
          onChange={(e) => {
            let val = e.target.value;
            let sanitized = String(val).replace(/[^0-9.]/g, "");
            const parts = sanitized.split(".");
            if (parts.length > 2)
              sanitized = parts[0] + "." + parts.slice(1).join("");
            updateLine(row.originalIndex, field, sanitized);
          }}
          onBlur={() => {
            const num = toNumber(row[field]);
            // If it was forced to strictly "0", keep it "0", otherwise format to 6 decimals
            const finalValue =
              num === 0 && String(row[field]) === "0" ? "0" : fmt6(num);
            updateLine(row.originalIndex, field, finalValue);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const num = toNumber(row[field]);
              const finalValue =
                num === 0 && String(row[field]) === "0" ? "0" : fmt6(num);
              updateLine(row.originalIndex, field, finalValue);

              const nextRowIndex = row.originalIndex + 1;
              const nextElementId = `bom-input-${field}-${nextRowIndex}`;
              const nextElement = document.getElementById(nextElementId);

              if (nextElement) {
                nextElement.focus();
                nextElement.select();
              }
            }
          }}
        />
      );
    };

    const columns = [
      {
        key: "ln",
        label: "LN",
        width: 44,
        minWidth: 44,
        maxWidth: 44,
        sortable: true,
        displayValue: (row) => row.originalIndex + 1,
        render: (row) => (
          <div className="text-center">{row.originalIndex + 1}</div>
        ),
      },
      {
        key: "invType",
        label: "Inv Type",
        width: 102,
        minWidth: 96,
        maxWidth: 112,
        sortable: true,
        displayValue: (row) => row.invType || "",
        render: (row) => (
          <select
            value={row.invType || ""}
            disabled={!canEditForm || Boolean(row.itemCode)}
            onChange={(e) =>
              updateLine(row.originalIndex, "invType", e.target.value)
            }
            className="w-full h-7 bg-transparent border-none outline-none text-[11px]"
          >
            <option value="" disabled>
              Select Type
            </option>
            {detailInvTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ),
      },
      {
        key: "itemCode",
        label: "Item Code",
        width: 128,
        minWidth: 116,
        maxWidth: 140,
        sortable: true,
        displayValue: (row) => row.itemCode || "",
        render: (row) => (
          <div className="relative flex items-center">
            <input
              value={row.itemCode || ""}
              readOnly
              disabled={!canEditForm}
              className="w-full global-tran-td-inputclass-ui !h-7 pr-6 text-[11px]"
            />
            <FontAwesomeIcon
              icon={faMagnifyingGlass}
              className={`absolute right-2 text-xs ${canEditForm && row.invType ? "text-blue-600 cursor-pointer hover:text-blue-900" : "text-slate-300 cursor-not-allowed"}`}
              onClick={() =>
                canEditForm &&
                row.invType &&
                openLineLookup(row.originalIndex, row.invType)
              }
            />
          </div>
        ),
      },
      {
        key: "itemDescription",
        label: "Item Name",
        width: 220,
        minWidth: 180,
        maxWidth: 240,
        sortable: true,
        displayValue: (row) => row.itemDescription || "",
        render: (row) => {
          const val = row.itemDescription || "";
          const lineCount = Math.max(
            1,
            val
              .split(/\r\n|\r|\n/)
              .reduce((acc, line) => acc + Math.ceil(line.length / 36 || 1), 0),
          );
          return (
            <textarea
              value={val}
              disabled
              rows={lineCount}
              className="w-full min-h-[24px] resize-none bg-transparent py-0.5 text-[11px] leading-4 whitespace-pre-wrap break-words focus:outline-none focus:ring-0 cursor-not-allowed"
            />
          );
        },
      },
      {
        key: "brand",
        label: "Brand",
        width: 100,
        minWidth: 90,
        maxWidth: 120,
        sortable: true,
        displayValue: (row) => row.brand || "",
        render: (row) => {
          const val = row.brand || "";
          const lineCount = Math.max(
            1,
            val
              .split(/\r\n|\r|\n/)
              .reduce((acc, line) => acc + Math.ceil(line.length / 15 || 1), 0),
          );
          return (
            <textarea
              value={val}
              disabled
              rows={lineCount}
              className="w-full min-h-[24px] resize-none bg-transparent py-0.5 text-[11px] leading-4 whitespace-pre-wrap break-words focus:outline-none focus:ring-0 cursor-not-allowed"
            />
          );
        },
      },
      {
        key: "uom",
        label: "UOM",
        width: 72,
        minWidth: 66,
        maxWidth: 80,
        sortable: true,
        displayValue: (row) => row.uom || "",
        render: (row) => (
          <input
            value={row.uom || ""}
            disabled
            className="w-full global-tran-td-inputclass-ui !h-7 text-center text-[11px]"
          />
        ),
      },
      {
        key: "qtyNeeded",
        label: "Qty Needed",
        width: 112,
        minWidth: 104,
        maxWidth: 122,
        sortable: true,
        renderType: "number",
        roundingOff: 6,
        render: (row) => numberInput(row, "qtyNeeded"),
      },
      {
        key: "scrapRate",
        label: "Scrap Rate (%)",
        width: 112,
        minWidth: 104,
        maxWidth: 122,
        sortable: true,
        renderType: "number",
        roundingOff: 6,
        render: (row) => numberInput(row, "scrapRate"),
      },
      {
        key: "scrapQty",
        label: "Scrap Qty",
        width: 112,
        minWidth: 104,
        maxWidth: 122,
        sortable: true,
        renderType: "number",
        roundingOff: 6,
        render: (row) => numberInput(row, "scrapQty"),
      },
    ];

    columns.unshift({
      key: "__actions",
      label: "Act",
      width: 66,
      minWidth: 66,
      maxWidth: 66,
      sortable: false,
      filterable: false,
      hidden: !canEditForm,
      pinned: true,
      requiredVisible: true,
      renderType: "actions",
      render: (row) => (
        <div className="flex w-full items-center justify-center gap-1">
          <button
            type="button"
            disabled={isPageBusy}
            onClick={(e) => {
              e.stopPropagation();
              addLineAfter(row.originalIndex);
            }}
            className={`inline-flex h-6 w-6 items-center justify-center rounded border transition-colors text-[10px] ${isPageBusy ? "bg-blue-50 border-blue-100 text-blue-300 cursor-not-allowed dark:bg-slate-800 dark:border-slate-700" : "bg-blue-50 border-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 dark:bg-blue-950/40 dark:border-blue-900 dark:text-blue-300 dark:hover:bg-blue-700"}`}
            title="Add line"
          >
            <FontAwesomeIcon icon={faPlus} />
          </button>
          <button
            type="button"
            disabled={isPageBusy}
            onClick={(e) => {
              e.stopPropagation();
              removeLine(row.originalIndex);
            }}
            className={`inline-flex h-6 w-6 items-center justify-center rounded border transition-colors text-[10px] ${isPageBusy ? "bg-red-50 border-red-100 text-red-300 cursor-not-allowed dark:bg-slate-800 dark:border-slate-700" : "bg-red-50 border-red-100 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 dark:bg-red-950/40 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-700"}`}
            title="Delete line"
          >
            <FontAwesomeIcon icon={faTrashAlt} />
          </button>
        </div>
      ),
    });

    return columns;
  }, [
    addLineAfter,
    detailInvTypeOptions,
    canEditForm,
    isPageBusy,
    removeLine,
    updateLine,
    getMax,
  ]);

  const buttons = useMemo(
    () => [
      {
        key: "add",
        label: <span className="sm:inline ml-1">Add</span>,
        icon: faPlus,
        onClick: handleAdd,
        className:
          "flex items-center justify-center h-7 w-16 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-all",
      },
      {
        key: "save",
        label: <span className="sm:inline ml-1">Save</span>,
        icon: faSaveIcon,
        onClick: upsertBOM,
        disabled: topTab !== "details" || !canSave || isPageBusy || isLockedBOM,
        className: `flex items-center justify-center h-7 w-16 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md transition-all ${topTab !== "details" || !canSave || isPageBusy || isLockedBOM ? "bg-blue-500 opacity-50 cursor-not-allowed text-white" : "bg-blue-600 text-white hover:bg-blue-700"}`,
      },
      {
        key: "copy",
        label: <span className="sm:inline ml-1">Copy</span>,
        icon: faCopy,
        onClick: handleCopy,
        disabled: !canAdd || !hasRecord || isPageBusy,
        className: `flex items-center justify-center h-7 w-16 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md transition-all ${!canAdd || !hasRecord || isPageBusy ? "bg-blue-500 opacity-50 cursor-not-allowed text-white" : "bg-blue-600 text-white hover:bg-blue-700"}`,
      },
      {
        key: "reset",
        label: <span className="sm:inline ml-1">Reset</span>,
        icon: faUndo,
        onClick: handleReset,
        className:
          "flex items-center justify-center h-7 w-16 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-all",
      },
    ],
    [
      canAdd,
      canSave,
      isPageBusy,
      hasRecord,
      topTab,
      handleAdd,
      upsertBOM,
      handleCopy,
      handleReset,
    ],
  );

  return (
    <div className="global-tran-main-div-ui">
      {isPageBusy && <LoadingSpinner />}

      {/* TABBED HEADER - MATCHING WAREMAST */}
      <div className="global-ref-header-ui">
        <div className="w-full flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          {/* Title & Status */}
          <div className="w-full xl:w-auto flex items-center gap-4">
            <h1 className="global-ref-headertext-ui w-full xl:w-auto truncate text-center xl:text-left">
              Bill of Materials
            </h1>
            <PermissionBadge
              permission={pagePermission}
              isReadOnly={isReadOnly}
              isFullAccess={isFullAccess}
            />
          </div>

          {/* Navigation Tabs */}
          <div className="w-full xl:flex-1 flex justify-center">
            <div className="w-full md:w-auto">
              <div className="flex flex-nowrap overflow-x-auto no-scrollbar border-b border-blue-300 dark:border-gray-700">
                {[
                  { id: "details", label: "BOM Setup" },
                  { id: "history", label: "BOM Record" },
                  { id: "summary", label: "BOM Summary & Print" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setTopTab(tab.id);
                      if (tab.id === "details") handleReset();
                    }}
                    className={`shrink-0 whitespace-nowrap px-3 py-1 sm:py-2 sm:px-4 text-[10px] sm:text-[13px] font-bold transition-all border-b-2 rounded-md ${
                      topTab === tab.id
                        ? "border-blue-700 text-blue-700 bg-blue-50/50 dark:border-blue-500 dark:text-blue-400 dark:bg-blue-900/30"
                        : "border-transparent text-gray-500 hover:text-blue-500 dark:text-slate-400 dark:hover:text-blue-400"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons & Guide */}
          <div className="w-full xl:w-auto flex xl:justify-end mt-2 xl:mt-0">
            <div className="w-full md:w-auto flex items-center justify-center xl:justify-end gap-2 flex-wrap">
              <div className="flex flex-wrap justify-center xl:justify-end gap-2">
                <ButtonBar buttons={buttons} />
              </div>

              <div ref={guideRef} className="relative">
                <button
                  onClick={() => setOpenGuide((v) => !v)}
                  className="bg-blue-600 text-white h-7 w-16 sm:w-auto sm:h-8 sm:px-4 rounded-md flex items-center justify-center gap-1 hover:bg-blue-700 transition-all"
                >
                  <FontAwesomeIcon
                    icon={faInfoCircle}
                    className="text-[12px]"
                  />
                  <span className="sm:inline ml-1 text-[11px] font-medium">
                    Info
                  </span>
                  <FontAwesomeIcon
                    icon={faChevronDown}
                    className="hidden sm:inline text-[10px] opacity-80"
                  />
                </button>
                {isOpenGuide && (
                  <div className="absolute right-0 mt-2 w-52 rounded-md shadow-xl bg-white ring-1 ring-black/10 z-[60] dark:bg-gray-800 overflow-hidden">
                    <button
                      onClick={() => {
                        window.open(pdfLink, "_blank");
                        setOpenGuide(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-xs hover:bg-blue-50 dark:hover:bg-blue-900 border-b border-gray-100 dark:border-gray-700"
                    >
                      <FontAwesomeIcon
                        icon={faFilePdf}
                        className="mr-2 text-red-500"
                      />{" "}
                      PDF Guide
                    </button>
                    <button
                      onClick={() => {
                        window.open(videoLink, "_blank");
                        setOpenGuide(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-xs hover:bg-blue-50 dark:hover:bg-blue-900"
                    >
                      <FontAwesomeIcon
                        icon={faVideo}
                        className="mr-2 text-blue-500"
                      />{" "}
                      Video Guide
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className="mt-20 sm:mt-16"
        style={{ minHeight: "calc(100vh - 120px)" }}
      >
        {/* Details Tab */}
        <div className={topTab === "details" ? "" : "hidden"}>
          {/* Form Layout with Tabs */}
          <div className="global-tran-header-div-ui !mt-0">
            <div className="global-tran-header-tab-div-ui">
              <button
                className={`global-tran-tab-padding-ui ${activeTab === "basic" ? "global-tran-tab-text_active-ui" : "global-tran-tab-text_inactive-ui"}`}
                onClick={() => setActiveTab("basic")}
              >
                Basic Information
              </button>
            </div>

            {/* BOM Header Form Section - Main Grid Container */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 rounded-lg relative">
              <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3 items-start">
                {/* Row 1 */}
                <div className="relative w-full">
                  <div
                    className={`flex items-stretch global-ref-textbox-ui ${canEditForm ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"}`}
                  >
                    <input
                      ref={bomCodeInputRef}
                      id="bomCode"
                      type="text"
                      className="peer flex-grow bg-transparent border-none px-3 focus:outline-none uppercase"
                      value={form.bomCode}
                      disabled={!canEditForm || isCheckingBOMCode}
                      maxLength={getMax("BOM_CODE")}
                      onChange={(e) =>
                        handleFieldChange(
                          "bomCode",
                          e.target.value.toUpperCase(),
                        )
                      }
                      onBlur={handleBOMCodeBlur}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const nextField = document.getElementById("invType");
                          if (nextField) {
                            nextField.focus();
                          } else {
                            e.target.blur();
                          }
                        }
                      }}
                    />
                  </div>
                  <label
                    htmlFor="bomCode"
                    className={`global-ref-floating-label ${canEditForm ? "global-ref-label-enabled" : "global-ref-label-disabled"}`}
                  >
                    BOM Code <span className="text-red-500">*</span>
                  </label>
                </div>

                <FieldRenderer
                  id="invType"
                  label="Inventory Type"
                  type="select"
                  placeholder="Select Type"
                  required
                  value={form.invType}
                  disabled={!canEditForm}
                  onChange={(val) => handleFieldChange("invType", val)}
                  options={headerInvTypeOptions}
                />

                <FieldRenderer
                  id="uom"
                  label="UOM"
                  type="text"
                  value={form.uom}
                  disabled
                  readOnly
                />

                {/* Row 2 */}
                <div className="relative w-full">
                  <div
                    className={`flex items-stretch global-ref-textbox-ui ${canEditForm ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"}`}
                  >
                    <DateFormatInput
                      id="bomDate"
                      className="peer flex-grow bg-transparent border-none px-3 focus:outline-none cursor-pointer"
                      value={form.bomDate}
                      required
                      onChange={(val) => handleFieldChange("bomDate", val)}
                      disabled={!canEditForm}
                      updateState={updateForm}
                    />
                  </div>
                  <label
                    htmlFor="bomDate"
                    className={`global-ref-floating-label ${canEditForm ? "global-ref-label-enabled" : "global-ref-label-disabled"}`}
                  >
                    BOM Effectivity Date
                  </label>
                </div>

                <FieldRenderer
                  id="itemCode"
                  label="Item Code"
                  type="lookup"
                  required
                  value={form.itemCode}
                  disabled={!canEditForm || !form.invType}
                  onLookup={openHeaderLookup}
                />

                <FieldRenderer
                  id="quantity"
                  label="Batch Quantity"
                  type="amount"
                  value={form.quantity}
                  disabled={!canEditForm}
                  onFocus={(e) =>
                    clearZeroValueOnFocus(e, (value) =>
                      updateForm({ quantity: value }),
                    )
                  }
                  onChange={(val) => {
                    let sanitized = String(val).replace(/[^0-9.]/g, "");
                    const parts = sanitized.split(".");
                    if (parts.length > 2)
                      sanitized = parts[0] + "." + parts.slice(1).join("");
                    updateForm({ quantity: sanitized });
                  }}
                  onBlur={() => {
                    const num = toNumber(form.quantity);
                    updateForm({ quantity: fmt6(num) });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const num = toNumber(form.quantity);
                      updateForm({ quantity: fmt6(num) });
                      document.getElementById("workCenter")?.focus();
                    }
                  }}
                />

                {/* Row 3 */}
                <FieldRenderer
                  id="active"
                  label="BOM Status"
                  type="select"
                  value={form.active}
                  disabled={!canEditForm}
                  onChange={(val) => handleFieldChange("active", val)}
                  options={[
                    { value: "Y", label: "Active" },
                    { value: "N", label: "Inactive" },
                  ]}
                />

                <FieldRenderer
                  id="itemDescription"
                  label="Item Description"
                  type="text"
                  value={form.itemDescription}
                  disabled
                  readOnly
                />

                <FieldRenderer
                  id="workCenter"
                  label="Work Center"
                  type="lookup"
                  value={
                    form.workCenter
                      ? form.workCenterName || form.wcName
                        ? `${form.workCenter} - ${form.workCenterName || form.wcName}`
                        : form.workCenter
                      : ""
                  }
                  disabled={!canEditForm}
                  onLookup={() => setWcLookupOpen(true)}
                  maxLength={getMax("WC_CODE")}
                />

                {/* Remarks Section */}
                <div className="col-span-full">
                  <div className="relative">
                    <textarea
                      id="remarks"
                      rows={3}
                      placeholder=""
                      className="peer global-tran-textbox-remarks-ui pt-6 pb-2 px-3"
                      value={form.remarks}
                      disabled={!canEditForm}
                      onChange={(e) =>
                        handleFieldChange("remarks", e.target.value)
                      }
                      maxLength={getMax("REMARKS")}
                    />
                    <label
                      htmlFor="remarks"
                      className="global-tran-floating-label-remarks"
                    >
                      Remarks
                    </label>
                  </div>
                </div>
              </div>

              {/* Column 4 - Registration Info Area */}
              <div className="global-tran-textbox-group-div-ui">
                <RegistrationInfo
                  layout="stacked"
                  data={{
                    ...form,
                    lastUpdatedBy: form.lastUpdatedBy || form.updatedBy,
                    lastUpdatedDate: form.lastUpdatedDate || form.updatedDate,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Lines Section */}
          <div id="bom_dtl" className="global-tran-tab-div-ui">
            <div className="global-tran-tab-nav-ui">
              <div className="flex flex-row sm:flex-row">
                <button
                  className={`global-tran-tab-padding-ui ${detailActiveTab === "components" ? "global-tran-tab-text_active-ui" : "global-tran-tab-text_inactive-ui"}`}
                  onClick={() => setDetailActiveTab("components")}
                >
                  Component Details
                </button>
              </div>
            </div>

            <div className="global-tran-table-main-div-ui relative overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
              <SearchGlobalReferenceTable
                key={`bom-component-details-${canEditForm ? "edit" : "view"}`}
                docType="BOM Component Details"
                columns={bomDetailColumns}
                data={bomDetailRows}
                itemsPerPage={200}
                showFilters
                tableSize="Half"
                autoFit={true}
              />
            </div>

            <div className="global-tran-tab-footer-main-div-ui">
              <div className="global-tran-tab-footer-button-div-ui">
                <div ref={addTypeDropdownRef} className="relative inline-block">
                  {showTypeDropdown && isFullAccess && (
                    <div className="absolute bottom-[110%] left-0 mb-3 z-[9999] w-[240px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.18)] backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800">
                      <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-700">
                        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                          Add Item
                        </div>
                      </div>

                      <div className="p-2">
                        <button
                          type="button"
                          className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition-all duration-150 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-100 dark:hover:bg-slate-700"
                          onClick={() => openComponentAddLookup("FG")}
                        >
                          <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                              <FontAwesomeIcon icon={faBoxOpen} />
                            </span>
                            <div className="flex flex-col items-start">
                              <span>Finished Goods</span>
                              <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">
                                Add FG item
                              </span>
                            </div>
                          </div>
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                            FG
                          </span>
                        </button>

                        <button
                          type="button"
                          className="mt-1 flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition-all duration-150 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-100 dark:hover:bg-slate-700"
                          onClick={() => openComponentAddLookup("MS")}
                        >
                          <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                              <FontAwesomeIcon icon={faTableCellsLarge} />
                            </span>
                            <div className="flex flex-col items-start">
                              <span>Material Supplies</span>
                              <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">
                                Add MS item
                              </span>
                            </div>
                          </div>
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                            MS
                          </span>
                        </button>

                        <button
                          type="button"
                          className="mt-1 flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition-all duration-150 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-100 dark:hover:bg-slate-700"
                          onClick={() => openComponentAddLookup("RM")}
                        >
                          <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                              <FontAwesomeIcon icon={faWarehouse} />
                            </span>
                            <div className="flex flex-col items-start">
                              <span>Raw Material</span>
                              <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">
                                Add RM item
                              </span>
                            </div>
                          </div>
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                            RM
                          </span>
                        </button>
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleComponentAddClick}
                    disabled={!canEditForm || isPageBusy}
                    className={`global-tran-tab-footer-button-add-ui ${!canEditForm || isPageBusy ? "opacity-50 cursor-not-allowed" : ""}`}
                    style={{ visibility: !canEditForm ? "hidden" : "visible" }}
                  >
                    <FontAwesomeIcon icon={faPlus} className="mr-2" />
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* History Tab */}
        <div className={topTab === "history" ? "" : "hidden"}>
          <BOMListPanel
            rows={masterList}
            onSelect={handleSelectBOM}
            onRefresh={loadMasterList}
            isLoading={isMasterLoading}
          />
        </div>

        {/* --- START OF NEW BOM SUMMARY & PRINT TAB --- */}
        <div className={topTab === "summary" ? "" : "hidden"}>
          {/* Top Control Bar for Summary Tab */}
          <div className="m-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-sm font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                Find BOM:
              </span>
              <div className="relative flex-grow sm:w-64">
                <input
                  id="summarySearchInput"
                  type="text"
                  placeholder="Enter BOM Code..."
                  className="w-full rounded-md border border-slate-300 pl-3 pr-8 py-1.5 text-sm focus:border-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-white uppercase transition-colors"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.target.value.trim()) {
                      fetchBOMByCode(e.target.value.trim().toUpperCase());
                    }
                  }}
                />
                <FontAwesomeIcon
                  icon={faMagnifyingGlass}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"
                />
              </div>
              <button
                type="button"
                disabled={isRecordLoading}
                onClick={() => {
                  const inputVal =
                    document.getElementById("summarySearchInput")?.value;
                  if (inputVal?.trim()) {
                    fetchBOMByCode(inputVal.trim().toUpperCase());
                  }
                }}
                className={`px-4 py-1.5 rounded-md text-sm font-bold shadow-sm transition-colors whitespace-nowrap ${
                  isRecordLoading
                    ? "bg-slate-400 text-white cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                Load
              </button>
            </div>

            {/* Export Button only shows if a BOM is loaded */}
            {form.bomCode && (
              <button
                type="button"
                onClick={() => {
                  const printContent = document.getElementById(
                    "printable-bom-summary",
                  );
                  const printWindow = window.open(
                    "",
                    "_blank",
                    "width=900,height=800",
                  );

                  printWindow.document.write(`
                    <!DOCTYPE html>
                    <html>
                      <head>
                        <title>BOM - ${form.bomCode}</title>
                        <style>
                          body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
                          .header-title { text-align: center; margin-bottom: 5px; font-size: 26px; text-transform: uppercase; font-weight: bold; }
                          .header-subtitle { text-align: center; margin-bottom: 30px; font-size: 14px; color: #666; }
                          .info-grid { display: flex; justify-content: space-between; margin-bottom: 30px; font-size: 14px; }
                          .info-col { width: 48%; }
                          .info-row { margin-bottom: 8px; border-bottom: 1px dotted #ccc; padding-bottom: 4px;}
                          .info-label { font-weight: bold; color: #555; display: inline-block; width: 140px; }
                          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
                          th, td { border: 1px solid #ddd; padding: 10px; }
                          th { background-color: #f4f4f4; text-align: left; text-transform: uppercase; font-size: 11px; }
                          .text-right { text-align: right; }
                          .text-center { text-align: center; }
                          .section-title { font-size: 16px; font-weight: bold; text-transform: uppercase; margin-bottom: 10px; border-bottom: 2px solid #333; padding-bottom: 5px;}
                        </style>
                      </head>
                      <body>
                        ${printContent.innerHTML}
                      </body>
                    </html>
                  `);
                  printWindow.document.close();
                  printWindow.focus();
                  setTimeout(() => {
                    printWindow.print();
                    printWindow.close();
                  }, 300);
                }}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-1.5 rounded-md flex items-center justify-center gap-2 text-sm font-bold shadow-sm transition-colors w-full sm:w-auto"
              >
                <FontAwesomeIcon icon={faFilePdf} /> Export to PDF
              </button>
            )}
          </div>

          {/* Empty State */}
          {!form.bomCode ? (
            <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 m-4">
              <FontAwesomeIcon
                icon={faInfoCircle}
                className="text-4xl mb-4 text-slate-300 dark:text-slate-600"
              />
              <p className="text-slate-500 dark:text-slate-400 text-center">
                Please search for a BOM Code above to view its summary.
              </p>
            </div>
          ) : (
            <div className="m-4">
              {/* Read-Only Visible UI */}
              <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                <div id="printable-bom-summary">
                  <div className="header-title">Bill of Materials</div>
                  <div className="header-subtitle">
                    BOM Code: <strong>{form.bomCode}</strong>
                  </div>

                  <div className="info-grid flex flex-col md:flex-row justify-between mb-8 gap-6 text-sm text-slate-700 dark:text-slate-300">
                    <div className="info-col w-full md:w-1/2">
                      <div className="info-row flex mb-2">
                        <span className="info-label font-bold w-36">
                          Item Code:
                        </span>{" "}
                        {form.itemCode || "-"}
                      </div>
                      <div className="info-row flex mb-2">
                        <span className="info-label font-bold w-36">
                          Description:
                        </span>{" "}
                        {form.itemDescription || "-"}
                      </div>
                      <div className="info-row flex mb-2">
                        <span className="info-label font-bold w-36">
                          Inventory Type:
                        </span>{" "}
                        {form.invType || "-"}
                      </div>
                      <div className="info-row flex mb-2">
                        <span className="info-label font-bold w-36">
                          Status:
                        </span>{" "}
                        {form.active === "Y" ? "Active" : "Inactive"}
                      </div>
                    </div>
                    <div className="info-col w-full md:w-1/2">
                      <div className="info-row flex mb-2">
                        <span className="info-label font-bold w-36">
                          Effectivity Date:
                        </span>{" "}
                        {form.bomDate}
                      </div>
                      <div className="info-row flex mb-2">
                        <span className="info-label font-bold w-36">
                          Batch Qty:
                        </span>{" "}
                        <span className="font-mono text-blue-600 dark:text-blue-400 font-semibold">
                          {form.quantity} {form.uom}
                        </span>
                      </div>
                      <div className="info-row flex mb-2">
                        <span className="info-label font-bold w-36">
                          Work Center:
                        </span>{" "}
                        {form.workCenter}{" "}
                        {form.workCenterName ? `- ${form.workCenterName}` : ""}
                      </div>
                      <div className="info-row flex mb-2">
                        <span className="info-label font-bold w-36">
                          Remarks:
                        </span>{" "}
                        {form.remarks || "-"}
                      </div>
                    </div>
                  </div>

                  <div className="section-title text-lg font-bold mb-4 text-slate-800 dark:text-slate-200 uppercase tracking-wide border-b border-slate-300 dark:border-slate-600 pb-2">
                    Components
                  </div>

                  <table className="w-full text-left text-sm border-collapse mb-4 text-slate-700 dark:text-slate-300">
                    <thead className="bg-slate-100 dark:bg-slate-700/50">
                      <tr>
                        <th className="border border-slate-200 dark:border-slate-600 p-2 text-center w-12">
                          LN
                        </th>
                        <th className="border border-slate-200 dark:border-slate-600 p-2 w-20 text-center">
                          Type
                        </th>
                        <th className="border border-slate-200 dark:border-slate-600 p-2 w-32">
                          Item Code
                        </th>
                        <th className="border border-slate-200 dark:border-slate-600 p-2">
                          Component Description
                        </th>
                        <th className="border border-slate-200 dark:border-slate-600 p-2 text-center w-20">
                          UOM
                        </th>
                        <th className="border border-slate-200 dark:border-slate-600 p-2 text-right w-28">
                          Qty Needed
                        </th>
                        <th className="border border-slate-200 dark:border-slate-600 p-2 text-right w-24">
                          Scrap Rate
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines
                        .filter((l) => String(l.itemCode).trim() !== "")
                        .map((line, idx) => (
                          <tr
                            key={idx}
                            className="hover:bg-slate-50 dark:hover:bg-slate-700/30"
                          >
                            <td className="border border-slate-200 dark:border-slate-600 p-2 text-center">
                              {idx + 1}
                            </td>
                            <td className="border border-slate-200 dark:border-slate-600 p-2 text-center font-bold">
                              {line.invType}
                            </td>
                            <td className="border border-slate-200 dark:border-slate-600 p-2 font-mono">
                              {line.itemCode}
                            </td>
                            <td className="border border-slate-200 dark:border-slate-600 p-2">
                              {line.itemDescription}
                            </td>
                            <td className="border border-slate-200 dark:border-slate-600 p-2 text-center">
                              {line.uom}
                            </td>
                            <td className="border border-slate-200 dark:border-slate-600 p-2 text-right font-mono text-blue-700 dark:text-blue-400 font-semibold">
                              {line.qtyNeeded}
                            </td>
                            <td className="border border-slate-200 dark:border-slate-600 p-2 text-right font-mono text-slate-500">
                              {line.scrapRate}%
                            </td>
                          </tr>
                        ))}
                      {lines.filter((l) => String(l.itemCode).trim() !== "")
                        .length === 0 && (
                        <tr>
                          <td
                            colSpan="7"
                            className="border border-slate-200 dark:border-slate-600 p-6 text-center text-slate-400"
                          >
                            No components have been added yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {lookupState.open && (
        <ItemMastLookupModal
          isOpen={lookupState.open}
          endpoint={itemLookupConfig.endpoint}
          docType={itemLookupConfig.docType}
          enableMultiSelect={lookupState.target === "footer"}
          onClose={handleCloseItemLookup}
          onCancel={closeLookup}
        />
      )}

      {wcLookupOpen && (
        <SearchWorkCenterRef
          isOpen={wcLookupOpen}
          onClose={(selectedItem) => {
            if (selectedItem) {
              updateForm({
                workCenter: selectedItem.wcCode,
                wcCode: selectedItem.wcCode,
                workCenterName: selectedItem.wcName,
                wcName: selectedItem.wcName,
              });
            }
            setWcLookupOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default ProdBOM;
