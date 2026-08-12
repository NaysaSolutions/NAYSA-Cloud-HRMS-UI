import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowDownUp,
  CircleX,
  ClipboardCheck,
  Eye,
  Grip,
  GripVertical,
  ListChecks,
  Maximize2,
  Minimize2,
  Minus,
  ReceiptText,
  RotateCcw,
  Search,
  WandSparkles,
  X,
} from "lucide-react";
import { useSwalErrorAlert as swalErrorAlert } from "@/NAYSA Cloud/Global/behavior.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";

const numberDecimals = 2;

const parseNumber = (value) => {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatNumber = (value, decimals = numberDecimals) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(parseNumber(value));

const formatDateMMDDYYYY = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  const isoMatch = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const [, yyyy, mm, dd] = isoMatch;
    return `${mm.padStart(2, "0")}/${dd.padStart(2, "0")}/${yyyy}`;
  }

  const slashMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, mm, dd, yyyy] = slashMatch;
    return `${mm.padStart(2, "0")}/${dd.padStart(2, "0")}/${yyyy}`;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;

  const mm = String(parsed.getMonth() + 1).padStart(2, "0");
  const dd = String(parsed.getDate()).padStart(2, "0");
  const yyyy = parsed.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
};

const includesFilter = (value, filterValue) => {
  const needle = String(filterValue || "").trim().toUpperCase();
  if (!needle) return true;
  return String(value ?? "").toUpperCase().includes(needle);
};

const getObjectValue = (source, keys = []) => {
  if (!source || typeof source !== "object") return "";

  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null) return source[key];
  }

  const normalizedKeys = keys.map((key) => String(key).toLowerCase());
  const match = Object.entries(source).find(([key]) =>
    normalizedKeys.includes(String(key).toLowerCase())
  );

  return match?.[1] ?? "";
};

const MIN_COLUMN_WIDTH = 70;
const MAX_AUTO_COLUMN_WIDTH = 240;
const MAX_MANUAL_COLUMN_WIDTH = 520;
const CHAR_WIDTH = 7;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const estimateColumnWidth = (label, values = [], minWidth = MIN_COLUMN_WIDTH) => {
  const longest = [label, ...values]
    .map((value) => String(value ?? "").length)
    .reduce((max, length) => Math.max(max, length), 0);

  return clamp(longest * CHAR_WIDTH + 36, minWidth, MAX_AUTO_COLUMN_WIDTH);
};

const baseAllocationColumns = [
  { key: "drag", label: "Drag", align: "center", minWidth: 56, filterable: false, sticky: true },
  { key: "priorityNo", label: "Priority", align: "center", minWidth: 92, sticky: true },
  { key: "lotNo", label: "Lot No", align: "left", minWidth: 110, sticky: true },
  { key: "qualityStatus", label: "Quality Status", align: "center", minWidth: 135 },
  { key: "bestBeforeDate", label: "Best Before Date", align: "center", minWidth: 145 },
  { key: "warehouseName", label: "Warehouse", align: "left", minWidth: 150 },
  { key: "locationCode", label: "Location", align: "left", minWidth: 105 },
  { key: "onHandQty", label: "On Hand Quantity", align: "right", minWidth: 145 },
  { key: "allocatedQty", label: "Allocated Quantity", align: "right", minWidth: 150 },
  { key: "remainingAvailable", label: "Remaining Available", align: "right", minWidth: 160 },
  { key: "pickQty", label: "Pick Quantity", align: "right", minWidth: 120 },
  { key: "action", label: "Action", align: "center", minWidth: 110, filterable: false },
  { key: "notes", label: "Notes", align: "left", minWidth: 140 },
];

const baseTransactionColumns = [
  { key: "view", label: "View", align: "center", minWidth: 64, filterable: false },
  { key: "branch", label: "Branch", align: "left", minWidth: 120 },
  { key: "sourceType", label: "Transaction Type", align: "left", minWidth: 150 },
  { key: "sourceDocNo", label: "Transaction No", align: "left", minWidth: 150 },
  { key: "sourceLineNo", label: "Line No", align: "center", minWidth: 95 },
  { key: "customerName", label: "Customer / Business Partner", align: "left", minWidth: 220 },
  { key: "warehouseName", label: "Warehouse", align: "left", minWidth: 150 },
  { key: "allocatedQty", label: "Allocated Quantity", align: "right", minWidth: 155 },
  { key: "affectsCurrentLine", label: "Affects Current Line", align: "center", minWidth: 165 },
  { key: "date", label: "Date", align: "center", minWidth: 115 },
  { key: "status", label: "Status", align: "center", minWidth: 150 },
];

const statusBadgeClass = (status) => {
  const normalized = String(status || "").toUpperCase();

  if (["GOOD", "APPROVED", "RELEASED", "OPEN"].includes(normalized)) {
    return "border-blue-300 bg-blue-50 text-blue-700";
  }

  if (["HOLD", "BLOCKED", "QUARANTINE"].includes(normalized)) {
    return "border-orange-300 bg-orange-50 text-orange-700";
  }

  return "border-slate-300 bg-slate-50 text-slate-600";
};

const SummaryLine = ({ label, value, valueClassName = "" }) => (
  <div className="flex min-w-0 gap-2 text-xs leading-5">
    <span className="shrink-0 font-semibold text-slate-500">{label} :</span>
    <span className={`min-w-0 truncate font-semibold text-slate-900 ${valueClassName}`}>
      {value || "-"}
    </span>
  </div>
);

const MetricBox = ({ label, value, tone = "default", decimals = numberDecimals }) => {
  const toneClass =
    tone === "green"
      ? "text-blue-700 bg-blue-50"
      : tone === "orange"
      ? "text-orange-700 bg-orange-50"
      : tone === "red"
      ? "text-rose-700 bg-rose-50"
      : tone === "blue"
      ? "text-blue-700 bg-blue-50"
      : "text-slate-900 bg-white";

  return (
    <div className={`rounded-lg border border-slate-200 px-3 py-2 text-right ${toneClass}`}>
      <p className="min-h-[20px] text-right text-[10px] font-medium leading-tight text-slate-600">
        {label}
      </p>
      <p className="mt-1 text-right text-sm font-medium">{formatNumber(value, decimals)}</p>
    </div>
  );
};

const AllocationStatusPill = ({ children }) => {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
      {children}
    </span>
  );
};

export default function SearchGlobalItemPickingModal({
  isOpen = true,
  onClose,
  onConfirm,
  transaction,
  stockRows,
  existingAllocations,
  allowManualAllocation = true,
  defaultAutoAllocateMode = "FIFO",
}) {
  const { companyInfo } = useAuth();
  const quantityDecimals = Number(companyInfo?.itemDescQtyFG ?? 2);

  const resolvedTransaction = {
    sourceDocType: "",
    sourceDocTypeName: "",
    sourceDocNo: "",
    sourceLineNo: "",
    groupId: "",
    customerCode: "",
    customerName: "",
    itemCode: "",
    itemName: "",
    requestedQty: 0,
    ...transaction,
  };

  const [rows, setRows] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [activeTableTab, setActiveTableTab] = useState("allocationDetails");
  const [allocationFilters, setAllocationFilters] = useState({});
  const [transactionFilters, setTransactionFilters] = useState({});
  const [allocationColumnOrder, setAllocationColumnOrder] = useState(baseAllocationColumns.map((column) => column.key));
  const [transactionColumnOrder, setTransactionColumnOrder] = useState(baseTransactionColumns.map((column) => column.key));
  const [allocationColumnWidths, setAllocationColumnWidths] = useState({});
  const [transactionColumnWidths, setTransactionColumnWidths] = useState({});
  const [pickQtyDrafts, setPickQtyDrafts] = useState({});
  const [hideFullyAllocatedRows, setHideFullyAllocatedRows] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [modalBounds, setModalBounds] = useState({
    left: null,
    top: null,
    width: 1280,
    height: null,
  });
  const draggingColumnRef = useRef({ table: "", key: "" });
  const resizingColumnRef = useRef({ table: "", key: "", startX: 0, startWidth: 0 });
  const movingModalRef = useRef(null);
  const resizingModalRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const initialRows = Array.isArray(stockRows) ? stockRows : [];

    const normalizedRows = initialRows.map((row, index) => ({
      ...row,
      groupId: row.groupId || resolvedTransaction.groupId,
      priorityNo: row.priorityNo || index + 1,
      pickQty: parseNumber(row.pickQty),
      onHandQty: parseNumber(row.onHandQty),
      allocatedQty: parseNumber(row.allocatedQty),
      remainingAvailable: parseNumber(row.remainingAvailable),
      isBlocked:
        row.isBlocked ||
        parseNumber(row.remainingAvailable) <= 0 ||
        ["HOLD", "BLOCKED", "QUARANTINE"].includes(String(row.qualityStatus || "").toUpperCase()),
    }));

    setRows(normalizedRows);
    setAllocations(Array.isArray(existingAllocations) ? existingAllocations : []);
    setPickQtyDrafts({});
  }, [isOpen, stockRows, existingAllocations, resolvedTransaction.groupId]);

  useEffect(() => {
    if (isOpen) return;
    setIsMinimized(false);
    setIsMaximized(false);
    setModalBounds({
      left: null,
      top: null,
      width: 1280,
      height: null,
    });
  }, [isOpen]);

  const handleAllocationFilterChange = (key, value) => {
    setAllocationFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleTransactionFilterChange = (key, value) => {
    setTransactionFilters((prev) => ({ ...prev, [key]: value }));
  };

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const isFullyAllocated =
        parseNumber(row.remainingAvailable) <= 0 && parseNumber(row.pickQty) <= 0;

      if (hideFullyAllocatedRows && isFullyAllocated) return false;

      return (
        includesFilter(row.priorityNo, allocationFilters.priorityNo) &&
        includesFilter(row.lotNo, allocationFilters.lotNo) &&
        includesFilter(row.qualityStatus, allocationFilters.qualityStatus) &&
        includesFilter(formatDateMMDDYYYY(row.bestBeforeDate), allocationFilters.bestBeforeDate) &&
        includesFilter(row.warehouseName || row.warehouseCode, allocationFilters.warehouseName) &&
        includesFilter(row.locationCode, allocationFilters.locationCode) &&
        includesFilter(formatNumber(row.onHandQty, quantityDecimals), allocationFilters.onHandQty) &&
        includesFilter(formatNumber(row.allocatedQty, quantityDecimals), allocationFilters.allocatedQty) &&
        includesFilter(formatNumber(row.remainingAvailable, quantityDecimals), allocationFilters.remainingAvailable) &&
        includesFilter(formatNumber(row.pickQty, quantityDecimals), allocationFilters.pickQty) &&
        includesFilter(parseNumber(row.pickQty) > 0 ? "Release" : "Allocate", allocationFilters.action) &&
        includesFilter(row.blockedReason || row.notes, allocationFilters.notes)
      );
    });
  }, [rows, allocationFilters, quantityDecimals]);

  const filteredAllocations = useMemo(() => {
    return allocations.filter((entry) => (
      includesFilter(getTransactionCellValue(entry, "branch"), transactionFilters.branch) &&
      includesFilter(getTransactionCellValue(entry, "sourceType"), transactionFilters.sourceType) &&
      includesFilter(getTransactionCellValue(entry, "sourceDocNo"), transactionFilters.sourceDocNo) &&
      includesFilter(getTransactionCellValue(entry, "sourceLineNo"), transactionFilters.sourceLineNo) &&
      includesFilter(getTransactionCellValue(entry, "customerName"), transactionFilters.customerName) &&
      includesFilter(getTransactionCellValue(entry, "warehouseName"), transactionFilters.warehouseName) &&
      includesFilter(getTransactionCellValue(entry, "allocatedQty"), transactionFilters.allocatedQty) &&
      includesFilter(getTransactionCellValue(entry, "affectsCurrentLine"), transactionFilters.affectsCurrentLine) &&
      includesFilter(getTransactionCellValue(entry, "date"), transactionFilters.date) &&
      includesFilter(getTransactionCellValue(entry, "status"), transactionFilters.status)
    ));
  }, [allocations, transactionFilters, quantityDecimals]);

  const getTransactionRoute = (entry) => {
    const sourceType = String(getTransactionCellValue(entry, "sourceType") || "").toUpperCase();
    const docNo = String(getTransactionCellValue(entry, "sourceDocNo") || "").toUpperCase();

    if (docNo.startsWith("DR-") || sourceType === "DR" || sourceType.includes("DELIVERY")) {
      return { page: "DR", docParam: "drNo" };
    }

    if (docNo.startsWith("SO-") || sourceType === "SO" || sourceType.includes("SALES ORDER")) {
      return { page: "SO", docParam: "soNo" };
    }

    if (docNo.startsWith("MSST-") || sourceType === "MSST" || sourceType.includes("TRANSFER")) {
      return { page: "MSST", docParam: "msstNo" };
    }

    if (docNo.startsWith("SI-") || sourceType === "SI" || sourceType.includes("SALES INVOICE")) {
      return { page: "SI", docParam: "siNo" };
    }

    return null;
  };

  const handleViewAllocatedTransaction = (entry) => {
    const viewDocumentUrl = String(
      getObjectValue(entry, ["viewDocument", "view_document", "ViewDocument"]) || ""
    ).trim();

    if (viewDocumentUrl) {
      const url =
        /^https?:\/\//i.test(viewDocumentUrl) || viewDocumentUrl.startsWith("/")
          ? viewDocumentUrl
          : `/${viewDocumentUrl}`;
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }

    const route = getTransactionRoute(entry);
    const sourceDocNo = getTransactionCellValue(entry, "sourceDocNo");

    if (!route || !sourceDocNo) {
      swalErrorAlert("View Transaction", "Unable to determine the transaction page for this record.");
      return;
    }

    const params = new URLSearchParams({
      [route.docParam]: sourceDocNo,
      branchCode:
        getObjectValue(entry, ["branchCode", "sourceBranchCode", "branch_code"]) ||
        resolvedTransaction.branchCode ||
        "",
      viewDocument: "true",
    });

    window.open(`/page/${route.page}?${params.toString()}`, "_blank", "noopener,noreferrer");
  };

  const allocationTableTotals = useMemo(() => {
    return filteredRows.reduce(
      (sum, row) => ({
        onHandQty: sum.onHandQty + parseNumber(row.onHandQty),
        allocatedQty: sum.allocatedQty + parseNumber(row.allocatedQty),
        remainingAvailable: sum.remainingAvailable + parseNumber(row.remainingAvailable),
        pickQty: sum.pickQty + parseNumber(row.pickQty),
      }),
      { onHandQty: 0, allocatedQty: 0, remainingAvailable: 0, pickQty: 0 }
    );
  }, [filteredRows]);

  const transactionTableTotals = useMemo(() => {
    return filteredAllocations.reduce(
      (sum, entry) => sum + parseNumber(getObjectValue(entry, ["allocatedQty", "qtyAllocated", "qty_allocated"])),
      0
    );
  }, [filteredAllocations]);

  const getAllocationCellValue = (row, key) => {
    switch (key) {
      case "drag":
      case "action":
        return "";
      case "warehouseName":
        return row.warehouseName || row.warehouseCode || "";
      case "onHandQty":
      case "allocatedQty":
      case "remainingAvailable":
      case "pickQty":
        return formatNumber(row[key], quantityDecimals);
      case "bestBeforeDate":
        return formatDateMMDDYYYY(row.bestBeforeDate);
      case "notes":
        return row.blockedReason || row.notes || "";
      default:
        return row[key] ?? "";
    }
  };

  function getTransactionCellValue(entry, key) {
    switch (key) {
      case "view":
        return "";
      case "branch":
        return getObjectValue(entry, ["branchName", "branchCode", "sourceBranchCode", "branch_code"]);
      case "sourceType":
        return getObjectValue(entry, ["sourceType", "docCode", "doc_code"]);
      case "sourceDocNo":
        return getObjectValue(entry, ["sourceDocNo", "docNo", "doc_no"]);
      case "sourceLineNo":
        return getObjectValue(entry, ["sourceLineNo", "lineNo", "line_no"]);
      case "customerName":
        return getObjectValue(entry, ["customerName", "custName", "cust_name", "customer", "businessPartnerName"]);
      case "warehouseName":
        return getObjectValue(entry, ["warehouseName", "whouseCode", "whouse_code", "warehouseCode"]);
      case "affectsCurrentLine":
        return getObjectValue(entry, ["affectsCurrentLine", "affects_current_line"]);
      case "allocatedQty":
        return formatNumber(getObjectValue(entry, ["allocatedQty", "qtyAllocated", "qty_allocated"]), quantityDecimals);
      case "date":
        return formatDateMMDDYYYY(getObjectValue(entry, ["date", "docDate", "doc_date"]));
      case "status":
        return entry.isSameTransaction
          ? "Same Transaction"
          : getObjectValue(entry, ["status", "pickStatus", "pick_status"]);
      default:
        return entry[key] ?? "";
    }
  }

  useEffect(() => {
    if (!rows.length) return;

    setAllocationColumnWidths((prev) => {
      const next = { ...prev };
      baseAllocationColumns.forEach((column) => {
        if (next[column.key]) return;
        next[column.key] = estimateColumnWidth(
          column.label,
          rows.map((row) => getAllocationCellValue(row, column.key)),
          column.minWidth
        );
      });
      return next;
    });
  }, [rows, quantityDecimals]);

  useEffect(() => {
    if (!allocations.length) return;

    setTransactionColumnWidths((prev) => {
      const next = { ...prev };
      baseTransactionColumns.forEach((column) => {
        if (next[column.key]) return;
        next[column.key] = estimateColumnWidth(
          column.label,
          allocations.map((entry) => getTransactionCellValue(entry, column.key)),
          column.minWidth
        );
      });
      return next;
    });
  }, [allocations, quantityDecimals]);

  useEffect(() => {
    const handleMouseMove = (event) => {
      if (movingModalRef.current) {
        const { offsetX, offsetY, width, height } = movingModalRef.current;
        const nextLeft = clamp(event.clientX - offsetX, 8, Math.max(8, window.innerWidth - width - 8));
        const nextTop = clamp(event.clientY - offsetY, 8, Math.max(8, window.innerHeight - height - 8));
        setModalBounds((prev) => ({ ...prev, left: nextLeft, top: nextTop }));
        return;
      }

      if (resizingModalRef.current) {
        const { startX, startY, startWidth, startHeight, left, top } = resizingModalRef.current;
        const maxWidth = Math.max(420, window.innerWidth - left - 8);
        const maxHeight = Math.max(360, window.innerHeight - top - 8);
        const nextWidth = clamp(startWidth + event.clientX - startX, 720, maxWidth);
        const nextHeight = clamp(startHeight + event.clientY - startY, 480, maxHeight);
        setModalBounds((prev) => ({ ...prev, width: nextWidth, height: nextHeight }));
        return;
      }

      const { table, key, startX, startWidth } = resizingColumnRef.current;
      if (!table || !key) return;

      const columns = table === "allocation" ? baseAllocationColumns : baseTransactionColumns;
      const column = columns.find((item) => item.key === key);
      const nextWidth = clamp(
        startWidth + event.clientX - startX,
        column?.minWidth || MIN_COLUMN_WIDTH,
        MAX_MANUAL_COLUMN_WIDTH
      );
      const setWidths = table === "allocation" ? setAllocationColumnWidths : setTransactionColumnWidths;
      setWidths((prev) => ({ ...prev, [key]: nextWidth }));
    };

    const handleMouseUp = () => {
      movingModalRef.current = null;
      resizingModalRef.current = null;
      resizingColumnRef.current = { table: "", key: "", startX: 0, startWidth: 0 };
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const orderedAllocationColumns = useMemo(() => {
    return allocationColumnOrder
      .map((key) => baseAllocationColumns.find((column) => column.key === key))
      .filter(Boolean);
  }, [allocationColumnOrder]);

  const orderedTransactionColumns = useMemo(() => {
    return transactionColumnOrder
      .map((key) => baseTransactionColumns.find((column) => column.key === key))
      .filter(Boolean);
  }, [transactionColumnOrder]);

  const allocationTableWidth = useMemo(() => (
    orderedAllocationColumns.reduce((sum, column) => sum + (allocationColumnWidths[column.key] || column.minWidth), 0)
  ), [orderedAllocationColumns, allocationColumnWidths]);

  const transactionTableWidth = useMemo(() => (
    orderedTransactionColumns.reduce((sum, column) => sum + (transactionColumnWidths[column.key] || column.minWidth), 0)
  ), [orderedTransactionColumns, transactionColumnWidths]);

  const handleHeaderDragStart = (table, key) => {
    draggingColumnRef.current = { table, key };
  };

  const handleHeaderDrop = (table, targetKey) => {
    const { table: sourceTable, key: sourceKey } = draggingColumnRef.current;
    draggingColumnRef.current = { table: "", key: "" };
    if (sourceTable !== table || !sourceKey || sourceKey === targetKey) return;

    const setOrder = table === "allocation" ? setAllocationColumnOrder : setTransactionColumnOrder;
    setOrder((prev) => {
      const next = [...prev];
      const fromIndex = next.indexOf(sourceKey);
      const toIndex = next.indexOf(targetKey);
      if (fromIndex < 0 || toIndex < 0) return prev;
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const startColumnResize = (event, table, key, width) => {
    event.preventDefault();
    event.stopPropagation();
    resizingColumnRef.current = {
      table,
      key,
      startX: event.clientX,
      startWidth: width,
    };
  };

  const startModalMove = (event) => {
    if (isMaximized) return;
    const modal = event.currentTarget.closest("[data-item-picking-modal]");
    const rect = modal?.getBoundingClientRect();
    if (!rect) return;

    movingModalRef.current = {
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      width: rect.width,
      height: rect.height,
    };

    setModalBounds((prev) => ({
      ...prev,
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    }));
  };

  const startModalResize = (event) => {
    if (isMaximized) return;
    event.preventDefault();
    event.stopPropagation();

    const modal = event.currentTarget.closest("[data-item-picking-modal]");
    const rect = modal?.getBoundingClientRect();
    if (!rect) return;

    resizingModalRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      startWidth: rect.width,
      startHeight: rect.height,
      left: rect.left,
      top: rect.top,
    };

    setModalBounds((prev) => ({
      ...prev,
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    }));
  };

  const totals = useMemo(() => {
    const totalOnHand = rows.reduce((sum, row) => sum + parseNumber(row.onHandQty), 0);
    const totalAllocated = rows.reduce((sum, row) => sum + parseNumber(row.allocatedQty), 0);
    const remainingAvailable = rows.reduce((sum, row) => sum + parseNumber(row.remainingAvailable), 0);
    const pickedForThisLine = rows.reduce((sum, row) => sum + parseNumber(row.pickQty), 0);

    const sameTransactionOtherLines = allocations
      .filter((entry) => entry.isSameTransaction && String(entry.affectsCurrentLine || "").toUpperCase() !== "CURRENT LINE")
      .reduce((sum, entry) => sum + parseNumber(entry.allocatedQty), 0);

    const otherTransactions = allocations
      .filter((entry) => !entry.isSameTransaction)
      .reduce((sum, entry) => sum + parseNumber(entry.allocatedQty), 0);

    const availableForThisLine = parseNumber(resolvedTransaction.requestedQty);
    const balanceToPick = parseNumber(resolvedTransaction.requestedQty) - pickedForThisLine;

    return {
      totalOnHand,
      totalAllocated,
      remainingAvailable,
      pickedForThisLine,
      sameTransactionOtherLines,
      otherTransactions,
      availableForThisLine,
      balanceToPick,
    };
  }, [rows, allocations, resolvedTransaction.requestedQty]);

  const isBalanced = Math.abs(totals.balanceToPick) < 0.0001;

  const refreshPriorityNumbers = (sourceRows) =>
    sourceRows.map((row, index) => ({
      ...row,
      priorityNo: index + 1,
    }));

  const handleMoveRow = (rowId, direction) => {
    setRows((prevRows) => {
      const nextRows = [...prevRows];
      const index = nextRows.findIndex((row) => row.id === rowId);
      const targetIndex = direction === "up" ? index - 1 : index + 1;

      if (index < 0 || targetIndex < 0 || targetIndex >= nextRows.length) {
        return prevRows;
      }

      [nextRows[index], nextRows[targetIndex]] = [nextRows[targetIndex], nextRows[index]];
      return refreshPriorityNumbers(nextRows);
    });
  };

  const getMaxPickQtyForRow = (row) =>
    Math.max(parseNumber(row.remainingAvailable), parseNumber(row.pickQty));

  const handlePickQtyChange = (rowId, value) => {
    const cleanValue = String(value).replace(/[^0-9.]/g, "");
    const regex = new RegExp(`^\\d*\\.?\\d{0,${quantityDecimals}}$`);

    if (!regex.test(cleanValue) && cleanValue !== "") return;

    const currentRow = rows.find((row) => row.id === rowId);
    const otherPickedQty = rows.reduce(
      (sum, row) => row.id === rowId ? sum : sum + parseNumber(row.pickQty),
      0
    );
    const requestedQty = parseNumber(resolvedTransaction.requestedQty);
    const maxRequestedQtyForRow = Math.max(requestedQty - otherPickedQty, 0);
    const maxPickQty = currentRow
      ? Math.min(getMaxPickQtyForRow(currentRow), maxRequestedQtyForRow)
      : maxRequestedQtyForRow;
    const nextPickQty = cleanValue === "" ? 0 : Math.min(parseNumber(cleanValue), maxPickQty);
    const nextDraftValue = cleanValue === "" ? "" : String(nextPickQty);

    setPickQtyDrafts((prev) => ({ ...prev, [rowId]: nextDraftValue }));

    setRows((prevRows) =>
      prevRows.map((row) => {
        if (row.id !== rowId) return row;

        return {
          ...row,
          pickQty: nextPickQty,
        };
      })
    );
  };
  const handlePickQtyBlur = (rowId) => {
    setPickQtyDrafts((prev) => {
      const next = { ...prev };
      delete next[rowId];
      return next;
    });

    setRows((prevRows) =>
      prevRows.map((row) =>
        row.id === rowId
          ? {
              ...row,
              pickQty: parseNumber(row.pickQty),
            }
          : row
      )
    );
  };

  const handlePickQtyFocus = (rowId) => {
    setPickQtyDrafts((prev) => ({
      ...prev,
      [rowId]: parseNumber(rows.find((row) => row.id === rowId)?.pickQty) === 0
        ? ""
        : Number(parseNumber(rows.find((row) => row.id === rowId)?.pickQty)).toFixed(quantityDecimals),
    }));
  };

  const focusNextPickQtyInput = (rowId) => {
    const visibleIndex = filteredRows.findIndex((row) => row.id === rowId);
    const nextRow = filteredRows.slice(visibleIndex + 1).find((row) => {
      return allowManualAllocation && !row.isBlocked && getMaxPickQtyForRow(row) > 0;
    });

    if (!nextRow) return;
    requestAnimationFrame(() => {
      document.querySelector(`[data-pick-qty-input="${nextRow.id}"]`)?.focus();
    });
  };

  const handlePickQtyKeyDown = (event, rowId) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    handlePickQtyBlur(rowId);
    focusNextPickQtyInput(rowId);
  };

  const handleToggleRowAllocation = (rowId) => {
    setRows((prevRows) => {
      const currentTotal = prevRows.reduce((sum, row) => sum + parseNumber(row.pickQty), 0);

      return prevRows.map((row) => {
        if (row.id !== rowId) return row;

        if (parseNumber(row.pickQty) > 0) {
          return { ...row, pickQty: 0 };
        }

        if (row.isBlocked || getMaxPickQtyForRow(row) <= 0) {
          return row;
        }

        const balanceForRow = Math.max(
          parseNumber(resolvedTransaction.requestedQty) - currentTotal,
          0
        );
        const nextPickQty = Math.min(getMaxPickQtyForRow(row), balanceForRow);

        return { ...row, pickQty: nextPickQty };
      });
    });

    setPickQtyDrafts((prev) => {
      const next = { ...prev };
      delete next[rowId];
      return next;
    });
  };
  const handleAutoAllocate = () => {
    let remainingQty = Math.max(totals.availableForThisLine, 0);

    const prioritizedRows = [...rows].sort((a, b) => {
      const dateA = new Date(a.bestBeforeDate).getTime();
      const dateB = new Date(b.bestBeforeDate).getTime();
      if (dateA !== dateB) return dateA - dateB;
      return Number(a.priorityNo || 0) - Number(b.priorityNo || 0);
    });

    const autoRows = prioritizedRows.map((row) => {
      if (row.isBlocked || remainingQty <= 0) {
        return { ...row, pickQty: 0 };
      }

      const qty = Math.min(parseNumber(row.remainingAvailable), remainingQty);
      remainingQty -= qty;

      return { ...row, pickQty: qty };
    });

    setRows(refreshPriorityNumbers(autoRows));
  };
  const buildAllocationPayload = (sourceRows, { clearAllocation = false } = {}) => {
    const payloadRows = Array.isArray(sourceRows) ? sourceRows : [];
    const pickedRows = payloadRows.filter((row) => parseNumber(row.pickQty) > 0);
    const totalPicked = payloadRows.reduce((sum, row) => sum + parseNumber(row.pickQty), 0);
    const requestedQty = parseNumber(resolvedTransaction.requestedQty);

    return {
      sourceDocType: resolvedTransaction.sourceDocType,
      sourceDocTypeName: resolvedTransaction.sourceDocTypeName,
      sourceDocNo: resolvedTransaction.sourceDocNo,
      sourceLineNo: resolvedTransaction.sourceLineNo,
      groupId: resolvedTransaction.groupId,
      customerCode: resolvedTransaction.customerCode,
      customerName: resolvedTransaction.customerName,
      itemCode: resolvedTransaction.itemCode,
      itemName: resolvedTransaction.itemName,
      requestedQty,
      totalPicked,
      balanceToPick: requestedQty - totalPicked,
      clearAllocation,
      allocations: pickedRows.map((row) => ({
        groupId: resolvedTransaction.groupId,
        sourceDocType: resolvedTransaction.sourceDocType,
        sourceLineNo: resolvedTransaction.sourceLineNo,
        itemCode: resolvedTransaction.itemCode,
        stockCardRefId: row.stockCardRefId,
        lotNo: row.lotNo,
        qualityStatus: row.qualityStatus,
        bestBeforeDate: row.bestBeforeDate,
        fgFifoLocId: row.fgFifoLocId || null,
        fgWacLocId: row.fgWacLocId || null,
        warehouseCode: row.warehouseCode,
        whouseCode: row.warehouseCode,
        warehouseName: row.warehouseName,
        locationCode: row.locationCode,
        locCode: row.locationCode,
        priorityNo: row.priorityNo,
        sourceDocCode: row.sourceDocCode || null,
        sourceDocNo: row.sourceDocNo || null,
        sourceDocDate: row.sourceDocDate || null,
        sourceDocId: row.sourceDocId || null,
        sourceGroupId: row.sourceGroupId || null,
        fifoDocCode: row.fifoDocCode || null,
        fifoDocNo: row.fifoDocNo || null,
        orderId: row.orderId || null,
        unitCost: parseNumber(row.unitCost || 0),
        wacKey: row.wacKey || null,
        wac: parseNumber(row.wac || 0),
        pickQty: parseNumber(row.pickQty),
      })),
      orderedStockRows: payloadRows.map((row) => ({
        stockCardRefId: row.stockCardRefId,
        fgFifoLocId: row.fgFifoLocId || null,
        fgWacLocId: row.fgWacLocId || null,
        lotNo: row.lotNo,
        priorityNo: row.priorityNo,
        pickQty: parseNumber(row.pickQty),
      })),
    };
  };

  const handleClearPick = () => {
    const clearedRows = rows.map((row) => ({ ...row, pickQty: 0 }));
    setPickQtyDrafts({});
    setRows(clearedRows);
    onConfirm?.(buildAllocationPayload(clearedRows, { clearAllocation: true }));
  };

  const handleConfirm = () => {
    if (totals.pickedForThisLine > parseNumber(resolvedTransaction.requestedQty)) {
      swalErrorAlert(
        "Invalid Pick Quantity",
        "Picked quantity cannot be more than requested quantity."
      );
      return;
    }

    onConfirm?.(buildAllocationPayload(rows));
  };

  const renderColumnFilter = (filters, onChange, key, placeholder = "Filter...") => (
    <div className="relative">
      <input
        type="text"
        value={filters[key] || ""}
        onChange={(e) => onChange(key, e.target.value)}
        className="global-lookup-filter-text-ui"
        placeholder={placeholder}
      />
      <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
    </div>
  );

  const getTextAlignClass = (align) =>
    align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";

  const getStickyColumnClass = (column, tone = "body") => {
    if (!column.sticky) return "";
    const zIndex = tone === "header" ? "z-40" : tone === "filter" ? "z-30" : "z-20";
    const bgClass = tone === "body" ? "bg-inherit" : "bg-slate-200";
    return `sticky left-0 ${zIndex} ${bgClass} shadow-[4px_0_6px_-6px_rgba(15,23,42,0.45)]`;
  };

  const getStickyLeftOffset = (table, column) => {
    if (!column.sticky) return undefined;

    const columns = table === "allocation" ? orderedAllocationColumns : orderedTransactionColumns;
    const widths = table === "allocation" ? allocationColumnWidths : transactionColumnWidths;
    const columnIndex = columns.findIndex((item) => item.key === column.key);

    if (columnIndex <= 0) return 0;

    return columns.slice(0, columnIndex).reduce(
      (total, item) => total + (widths[item.key] || item.minWidth),
      0
    );
  };

  const getColumnSizingStyle = (table, column, width) => ({
    width,
    minWidth: column.minWidth,
    ...(column.sticky ? { left: getStickyLeftOffset(table, column) } : {}),
  });

  const renderResizableHeader = (table, column, width) => (
    <th
      key={column.key}
      draggable
      onDragStart={() => handleHeaderDragStart(table, column.key)}
      onDragOver={(event) => event.preventDefault()}
      onDrop={() => handleHeaderDrop(table, column.key)}
      className={`global-lookup-th-ui relative border-r border-slate-300 bg-slate-200 ${getTextAlignClass(column.align)} ${getStickyColumnClass(column, "header")}`}
      style={getColumnSizingStyle(table, column, width)}
      title="Drag to reorder column"
    >
      <span className="global-lookup-th-text-ui inline-flex min-w-0 items-center gap-1 truncate">
        {column.label}
        {column.key === "priorityNo" && <ArrowDownUp size={12} className="text-slate-500" />}
      </span>
      <span
        role="presentation"
        onMouseDown={(event) => startColumnResize(event, table, column.key, width)}
        className="absolute right-0 top-0 h-full w-2 cursor-col-resize hover:bg-blue-400/40"
      />
    </th>
  );

  const renderFilterCell = (table, column, width) => {
    const filters = table === "allocation" ? allocationFilters : transactionFilters;
    const onChange = table === "allocation" ? handleAllocationFilterChange : handleTransactionFilterChange;

    return (
      <td
        key={column.key}
        className={`bg-slate-200 px-2 py-1 ${getStickyColumnClass(column, "filter")}`}
        style={getColumnSizingStyle(table, column, width)}
      >
        {column.filterable === false ? null : renderColumnFilter(filters, onChange, column.key)}
      </td>
    );
  };

  const renderAllocationCell = (row, column) => {
    const commonClass = `whitespace-nowrap overflow-hidden text-ellipsis px-2 py-0.5 ${getTextAlignClass(column.align)} ${getStickyColumnClass(column, "body")}`;
    const width = allocationColumnWidths[column.key] || column.minWidth;
    const cellStyle = getColumnSizingStyle("allocation", column, width);

    switch (column.key) {
      case "drag":
        return (
          <td key={column.key} className={commonClass} style={cellStyle}>
            <div className="inline-flex items-center gap-1">
              <button
                type="button"
              className="cursor-grab rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600 active:cursor-grabbing"
                title="Drag to reorder"
              >
                <GripVertical size={18} />
              </button>
            </div>
          </td>
        );
      case "priorityNo":
        return (
          <td key={column.key} className={commonClass} style={cellStyle}>
            <div className="flex items-center justify-center gap-1">
              <button
                type="button"
                onClick={() => handleMoveRow(row.id, "up")}
                className="hidden rounded px-1 text-[10px] text-slate-400 hover:bg-slate-100 hover:text-blue-600 md:inline"
                title="Move up"
              >
                &#9650;
              </button>
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-[11px] text-slate-700">
                {row.priorityNo}
              </span>
              <button
                type="button"
                onClick={() => handleMoveRow(row.id, "down")}
                className="hidden rounded px-1 text-[10px] text-slate-400 hover:bg-slate-100 hover:text-blue-600 md:inline"
                title="Move down"
              >
                &#9660;
              </button>
            </div>
          </td>
        );
      case "qualityStatus":
        return (
          <td key={column.key} className={commonClass} style={cellStyle}>
            <span className={`inline-flex rounded-md border px-2 py-0.5 text-xs ${statusBadgeClass(row.qualityStatus)}`}>
              {row.qualityStatus}
            </span>
          </td>
        );
      case "pickQty": {
        const canPick = allowManualAllocation && !row.isBlocked && getMaxPickQtyForRow(row) > 0;
        const draftValue = Object.prototype.hasOwnProperty.call(pickQtyDrafts, row.id)
          ? pickQtyDrafts[row.id]
          : Number(parseNumber(row.pickQty)).toFixed(quantityDecimals);
        return (
          <td key={column.key} className={commonClass} style={cellStyle}>
            <input
              type="text"
              inputMode="decimal"
              data-pick-qty-input={row.id}
              value={draftValue}
              disabled={!canPick}
              onFocus={() => handlePickQtyFocus(row.id)}
              onChange={(event) => handlePickQtyChange(row.id, event.target.value)}
              onBlur={() => handlePickQtyBlur(row.id)}
              onKeyDown={(event) => handlePickQtyKeyDown(event, row.id)}
              className={`h-7 w-20 bg-transparent px-1 text-right text-xs outline-none transition [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
                canPick
                  ? "rounded border border-transparent text-slate-900 focus:border-blue-300 focus:bg-blue-50 focus:text-blue-700"
                  : "cursor-not-allowed text-slate-400"
              }`}
            />
          </td>
        );
      }
      case "action": {
        const isAllocated = parseNumber(row.pickQty) > 0;
        const canToggle =
          allowManualAllocation &&
          !row.isBlocked &&
          (isAllocated || (getMaxPickQtyForRow(row) > 0 && totals.balanceToPick > 0));

        return (
          <td key={column.key} className={commonClass} style={cellStyle}>
            <button
              type="button"
              disabled={!canToggle}
              onClick={() => handleToggleRowAllocation(row.id)}
              className={`h-7 w-full rounded-full border text-[11px] font-semibold transition-colors ${
                isAllocated
                  ? "border-blue-500 bg-blue-500/15 text-blue-700 hover:bg-blue-500/25"
                  : "border-slate-300 bg-white text-slate-600 hover:border-blue-400 hover:text-blue-700"
              } ${canToggle ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}
            >
              {isAllocated ? "Release" : "Allocate"}
            </button>
          </td>
        );
      }
      case "notes":
        return (
          <td key={column.key} className={commonClass} style={cellStyle}>
            {row.blockedReason ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-slate-600">
                {row.blockedReason.toUpperCase().includes("QUALITY") && <AlertCircle size={13} />}
                {row.blockedReason}
              </span>
            ) : (
              <span className="text-slate-400">-</span>
            )}
          </td>
        );
      default:
        return (
          <td key={column.key} className={commonClass} style={cellStyle}>
            {getAllocationCellValue(row, column.key)}
          </td>
        );
    }
  };

  const renderTransactionCell = (entry, column) => {
    const commonClass = `whitespace-nowrap overflow-hidden text-ellipsis px-2 py-0.5 ${getTextAlignClass(column.align)}`;

    if (column.key === "view") {
      return (
        <td key={column.key} className={commonClass}>
          <button
            type="button"
            onClick={() => handleViewAllocatedTransaction(entry)}
            className="inline-flex h-5 items-center justify-center rounded bg-blue-500 px-2 text-white transition hover:bg-blue-600"
            title="View"
          >
            <Eye size={13} />
          </button>
        </td>
      );
    }

    if (column.key === "status") {
      return (
        <td key={column.key} className={commonClass}>
          <AllocationStatusPill>
            {getTransactionCellValue(entry, column.key)}
          </AllocationStatusPill>
        </td>
      );
    }

    return (
      <td key={column.key} className={commonClass}>
        {getTransactionCellValue(entry, column.key)}
      </td>
    );
  };

  const getAllocationFooterValue = (column, index) => {
    if (index === 0) return "Total";
    if (column.key === "onHandQty") return formatNumber(allocationTableTotals.onHandQty, quantityDecimals);
    if (column.key === "allocatedQty") return formatNumber(allocationTableTotals.allocatedQty, quantityDecimals);
    if (column.key === "remainingAvailable") return formatNumber(allocationTableTotals.remainingAvailable, quantityDecimals);
    if (column.key === "pickQty") return formatNumber(allocationTableTotals.pickQty, quantityDecimals);
    return "";
  };

  const getTransactionFooterValue = (column, index) => {
    if (index === 0) return "Total";
    if (column.key === "allocatedQty") return formatNumber(transactionTableTotals, quantityDecimals);
    return "";
  };

  const handleMinimizedOverlayWheel = (event) => {
    const tableScroller =
      document.querySelector("#apv_dtl .global-tran-table-main-sub-div-ui") ||
      document.querySelector("#apv_dtl .global-tran-table-main-div-ui");

    if (!tableScroller) return;

    const horizontalDelta = event.deltaX || (event.shiftKey ? event.deltaY : 0);
    if (!horizontalDelta) return;

    event.preventDefault();
    tableScroller.scrollLeft += horizontalDelta;
  };

  if (!isOpen) return null;

  if (isMinimized) {
    return (
      <div className="fixed inset-0 z-[9999] bg-transparent" onWheel={handleMinimizedOverlayWheel}>
        <div className="absolute bottom-4 right-4 flex max-w-[calc(100vw-24px)] items-center gap-2 rounded-2xl border border-slate-200 bg-white/95 px-3 py-2 text-xs text-slate-700 shadow-2xl shadow-slate-900/20 backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:shadow-slate-900/25">
          <div className="flex min-w-0 items-center gap-2">
            <ListChecks className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
            <div className="min-w-0">
              <div className="max-w-[260px] truncate font-semibold text-slate-800">
                Search Global Item Picking / Allocation
              </div>
              <div className="text-[10px] text-slate-500">
                {resolvedTransaction.sourceDocNo} - {resolvedTransaction.itemCode}
              </div>
            </div>
          </div>
          <div className="ml-1 flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => setIsMinimized(false)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Restore
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-500 shadow-sm hover:bg-rose-50 hover:text-rose-600"
              aria-label="Close item picking modal"
              title="Close"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const modalStyle = isMaximized
    ? undefined
    : {
        width: modalBounds.width,
        maxWidth: "calc(100vw - 24px)",
        height: modalBounds.height || undefined,
        maxHeight: "calc(100dvh - 24px)",
        ...(modalBounds.left !== null && modalBounds.top !== null
          ? {
              position: "absolute",
              left: modalBounds.left,
              top: modalBounds.top,
            }
          : {}),
      };

  return (
    <div className={`fixed inset-0 z-[9999] bg-slate-950/45 backdrop-blur-sm ${isMaximized ? "flex items-center justify-center p-0" : modalBounds.left === null ? "flex items-center justify-center p-3" : "p-0"}`}>
      <div
        data-item-picking-modal
        className={`relative flex flex-col overflow-hidden border border-slate-200 bg-white shadow-2xl ${
          isMaximized
            ? "h-[100dvh] w-screen rounded-none"
            : "rounded-2xl"
        }`}
        style={modalStyle}
      >
        <div
          className={`flex items-center justify-between border-b border-slate-200 bg-slate-100 py-1 ${isMaximized ? "" : "cursor-move select-none"}`}
          onMouseDown={startModalMove}
        >
          <div className="flex items-center gap-2 pl-2 sm:pl-3">
            <h2 className="global-lookup-headertext-ui">
              Search Global Item Picking / Allocation
            </h2>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsMinimized(true)}
              className="p-2 text-slate-400 transition-colors hover:text-blue-600"
              title="Minimize"
            >
              <Minus size={18} />
            </button>
            <button
              type="button"
              onClick={() => setIsMaximized((prev) => !prev)}
              className="p-2 text-slate-400 transition-colors hover:text-blue-600"
              title={isMaximized ? "Restore" : "Maximize"}
            >
              {isMaximized ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 transition-colors hover:text-red-600"
              title="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto px-4 py-3">
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="grid grid-cols-1 gap-x-6 gap-y-1 border-b border-slate-200 p-3 md:grid-cols-3">
              <div className="space-y-1">
                <SummaryLine label="Transaction Type" value={resolvedTransaction.sourceDocTypeName} valueClassName="text-blue-700" />
                <SummaryLine label="Transaction No" value={resolvedTransaction.sourceDocNo} valueClassName="text-blue-700" />
              </div>
              <div className="space-y-1">
                <SummaryLine label="Current Line No" value={resolvedTransaction.sourceLineNo} />
                <SummaryLine label="Customer" value={resolvedTransaction.customerName} />
              </div>
              <div className="space-y-1">
                <SummaryLine label="Item Code" value={resolvedTransaction.itemCode} />
                <SummaryLine label="Item Description" value={resolvedTransaction.itemName} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <MetricBox label="Requested Quantity" value={resolvedTransaction.requestedQty} decimals={quantityDecimals} />
              <MetricBox label="Already Allocated to Other Transactions" value={totals.otherTransactions} tone="orange" decimals={quantityDecimals} />
              <MetricBox label="Already Allocated in Same Transaction (Other Lines)" value={totals.sameTransactionOtherLines} tone="orange" decimals={quantityDecimals} />
              <MetricBox label="Available for This Line" value={totals.availableForThisLine} tone="green" decimals={quantityDecimals} />
              <MetricBox label="Picked for This Line" value={totals.pickedForThisLine} tone="green" decimals={quantityDecimals} />
              <MetricBox label="Balance to Pick" value={totals.balanceToPick} tone={isBalanced ? "green" : "red"} decimals={quantityDecimals} />
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex flex-col gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 sm:flex-row sm:items-center">
              <div className="inline-flex w-full rounded-full border border-slate-200 bg-white p-1 shadow-sm sm:w-auto">
              <button
                type="button"
                onClick={() => setActiveTableTab("allocationDetails")}
                className={`inline-flex flex-1 items-center justify-center rounded-full px-4 py-1.5 text-xs font-semibold transition sm:flex-none ${
                  activeTableTab === "allocationDetails"
                    ? "bg-blue-600 text-white shadow"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span className="inline-flex items-center gap-1.5">
                  <ListChecks size={15} />
                  Allocation Details
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTableTab("allocatedTransaction")}
                className={`inline-flex flex-1 items-center justify-center rounded-full px-4 py-1.5 text-xs font-semibold transition sm:flex-none ${
                  activeTableTab === "allocatedTransaction"
                    ? "bg-blue-600 text-white shadow"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span className="inline-flex items-center gap-1.5">
                  <ReceiptText size={15} />
                  Allocated Transaction
                </span>
              </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (activeTableTab === "allocationDetails") {
                    setAllocationFilters({});
                  } else {
                    setTransactionFilters({});
                  }
                }}
                className="inline-flex items-center justify-center gap-1 self-stretch rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 sm:ml-auto sm:self-center"
              >
                <RotateCcw size={13} />
                Clear Filters
              </button>
              {activeTableTab === "allocationDetails" && (
                <label className="inline-flex select-none items-center gap-2 self-stretch rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 sm:self-center">
                  <span className="relative inline-flex h-5 w-9 items-center">
                    <input
                      type="checkbox"
                      checked={hideFullyAllocatedRows}
                      onChange={(event) => setHideFullyAllocatedRows(event.target.checked)}
                      className="peer sr-only"
                    />
                    <span className="absolute inset-0 rounded-full bg-slate-300 transition-colors peer-checked:bg-blue-600" />
                    <span className="absolute left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
                  </span>
                  {hideFullyAllocatedRows ? "Show Fully Allocated" : "Hide Fully Allocated"}
                </label>
              )}
            </div>

            {activeTableTab === "allocationDetails" ? (
              <>
            <div className="overflow-x-auto">
              <table
                className="table-fixed border-collapse text-xs"
                style={{ width: allocationTableWidth, minWidth: allocationTableWidth }}
              >
                <thead className="bg-slate-200">
                  <tr>
                    {orderedAllocationColumns.map((column) =>
                      renderResizableHeader("allocation", column, allocationColumnWidths[column.key] || column.minWidth)
                    )}
                  </tr>
                  <tr className="bg-slate-200">
                    {orderedAllocationColumns.map((column) =>
                      renderFilterCell("allocation", column, allocationColumnWidths[column.key] || column.minWidth)
                    )}
                  </tr>
                </thead>

                <tbody className="text-slate-700">
                  {filteredRows.map((row) => {
                    const rowAllocated = parseNumber(row.pickQty) > 0;
                    return (
                      <tr
                        key={row.id}
                        className={`border-b border-slate-200 ${
                          rowAllocated ? "bg-blue-50 text-blue-800" : "bg-white"
                        }`}
                      >
                        {orderedAllocationColumns.map((column) => renderAllocationCell(row, column))}
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-100 text-xs font-bold text-slate-800">
                  <tr>
                    {orderedAllocationColumns.map((column, index) => (
                      <td
                        key={column.key}
                        className={`whitespace-nowrap overflow-hidden text-ellipsis px-2 py-2 ${getTextAlignClass(index === 0 ? "right" : column.align)} ${getStickyColumnClass(column, "body")}`}
                        style={getColumnSizingStyle("allocation", column, allocationColumnWidths[column.key] || column.minWidth)}
                      >
                        {getAllocationFooterValue(column, index)}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>
              </>
            ) : (
              <>
            <div className="overflow-x-auto">
              <table
                className="table-fixed border-collapse text-xs"
                style={{ width: transactionTableWidth, minWidth: transactionTableWidth }}
              >
                <thead className="bg-slate-200">
                  <tr>
                    {orderedTransactionColumns.map((column) =>
                      renderResizableHeader("transaction", column, transactionColumnWidths[column.key] || column.minWidth)
                    )}
                  </tr>
                  <tr className="bg-slate-200">
                    {orderedTransactionColumns.map((column) =>
                      renderFilterCell("transaction", column, transactionColumnWidths[column.key] || column.minWidth)
                    )}
                  </tr>
                </thead>
                <tbody className="text-slate-700">
                  {filteredAllocations.map((entry) => (
                    <tr key={entry.id} className="border-b border-slate-100">
                      {orderedTransactionColumns.map((column) => renderTransactionCell(entry, column))}
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-100 text-xs font-bold text-slate-800">
                  <tr>
                    {orderedTransactionColumns.map((column, index) => (
                      <td
                        key={column.key}
                        className={`whitespace-nowrap overflow-hidden text-ellipsis px-2 py-2 ${getTextAlignClass(index === 0 ? "right" : column.align)}`}
                      >
                        {getTransactionFooterValue(column, index)}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>
              </>
            )}
          </div>

        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleAutoAllocate}
              className="inline-flex h-9 w-36 items-center justify-center gap-2 rounded-lg border border-blue-600 bg-blue-600 px-4 text-xs font-medium text-white hover:bg-blue-700"
            >
              <WandSparkles size={16} />
              Auto Allocate
            </button>

            <button
              type="button"
              onClick={handleClearPick}
              className="inline-flex h-9 w-36 items-center justify-center gap-2 rounded-lg border border-blue-600 bg-blue-600 px-4 text-xs font-medium text-white hover:bg-blue-700"
            >
              <CircleX size={16} />
              Clear Allocation
            </button>
          </div>

          <div className="flex flex-wrap gap-2 md:justify-end">
            <button
              type="button"
              onClick={handleConfirm}
              className="inline-flex h-9 w-36 items-center justify-center gap-2 rounded-lg border border-blue-600 bg-blue-600 px-4 text-xs font-medium text-white hover:bg-blue-700"
            >
              <ClipboardCheck size={17} />
              Confirm Allocation
            </button>
          </div>
        </div>
        {!isMaximized && (
          <div
            role="presentation"
            onMouseDown={startModalResize}
            className="absolute bottom-1 right-1 flex h-6 w-6 cursor-se-resize items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-blue-600"
            title="Resize"
          >
            <Grip size={14} />
          </div>
        )}
      </div>
    </div>
  );
}
