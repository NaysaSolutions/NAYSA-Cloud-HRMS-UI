import React, {
  useEffect,
  useMemo,
  useState,
  useRef,
  forwardRef,
  useImperativeHandle,
  useLayoutEffect,
} from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSort,
  faSortUp,
  faSortDown,
  faEye,
  faChevronRight,
  faChevronDown,
  faTimes,
  faLayerGroup,
  faFileExcel,
  faColumns,
  faFilePdf,
  faFileImage,
  faFileExport,
  faFileCsv,
  faSyncAlt,
  faPenToSquare,
  faTable,
  faIdCard,
  faSearch,
  faGripVertical,
} from "@fortawesome/free-solid-svg-icons";

import {
  useSwalErrorAlert,
  formatNumber,
  parseFormattedNumber,
} from "@/NAYSA Cloud/Global/behavior.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { useReturnToDate } from "@/NAYSA Cloud/Global/dates";
import { exportGenericQueryExcel } from "@/NAYSA Cloud/Global/report";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import Swal from "sweetalert2";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import ExportFileNameModal from "@/NAYSA Cloud/Lookup/SearchExport.jsx";

const ACTION_COL_WIDTH = 110; // Increased width slightly to fit 3 buttons (Chevron, View, Edit)
const DEFAULT_MIN_COL_WIDTH = 100;
const DEFAULT_MAX_COL_WIDTH = 260;
const AUTO_FIT_MIN_WIDTH = 90;
const AUTO_MEASURE_SAMPLE_SIZE = 1000;

const TableLoader = ({ message = "Loading Report...", spinner = false }) => (
  <div className="flex items-center justify-center w-full h-full min-h-[220px]">
    <div className="flex flex-col items-center gap-3">
      {spinner && <LoadingSpinner />}
      <span className="text-[12px] text-gray-500">{message}</span>
    </div>
  </div>
);

const SearchGlobalReportTableDrilldown = forwardRef(
  (
    {
      columns = [],
      data = [],
      itemsPerPage = 1000,
      showFilters = true,
      showGlobalSearch = true,
      showGroupBy = true,
      rightActionLabel = null,
      onRowAction,
      onRowActionsClick,
      actionsIcon,
      actionsTitle,
      onRowDoubleClick,
      className = "",
      initialState,
      onStateChange,
      totalExemptions = ["rate", "percent", "ratio", "id", "code", "ROW_NO"],
      isLoading = false,
      isFetching = false,
      onRefresh,
      tableSize = "Full",
      onMobileRowOpen,
      docType = "Report",
      autoFit = false,
      pagination = false,
      autoFillGrid = false,
      
      // --- DRILL-DOWN PROPS ---
      renderDetailPanel = null,
      expandedRowKeys = [],
      rowKey = "key", 
      onRowExpand = null, // <-- NEW: Trigger for parent to fetch data
    },
    ref,
  ) => {
    const scrollRef = useRef(null);
    const exportContainerRef = useRef(null);
    const autoFitTriggeredRef = useRef(false);
    const userResizedColsRef = useRef(new Set());

    const [isMobile, setIsMobile] = useState(false);
    const [isMobileView, setIsMobileView] = useState(false);
    const [mobileViewMode, setMobileViewMode] = useState(
      () => initialState?.mobileViewMode || "table",
    );
    const [expandedMobileCards, setExpandedMobileCards] = useState({});

    const [filters, setFilters] = useState(() => initialState?.filters || {});
    const [globalSearch, setGlobalSearch] = useState(
      () => initialState?.globalSearch || "",
    );
    const [sortConfig, setSortConfig] = useState(
      () => initialState?.sortConfig || { key: null, direction: null },
    );
    const [currentPage, setCurrentPage] = useState(
      () => Number(initialState?.currentPage) || 1,
    );
    const [rowsPerPage, setRowsPerPage] = useState(
      () => Number(initialState?.itemsPerPage ?? itemsPerPage ?? 1000),
    );
    const [autoFillGridState, setAutoFillGridState] = useState(
      autoFit || autoFillGrid,
    );

    const [columnOrder, setColumnOrder] = useState([]);
    const [groupBy, setGroupBy] = useState(() => initialState?.groupBy || []);
    const [expandedGroups, setExpandedGroups] = useState({});
    const [autoExpandGroups, setAutoExpandGroups] = useState(
      () => !!initialState?.autoExpandGroups,
    );
    const [draggedCol, setDraggedCol] = useState(null);

    const [colWidths, setColWidths] = useState({});
    const [userHiddenCols, setUserHiddenCols] = useState(
      () => initialState?.userHiddenCols || [],
    );
    const [showColumnChooser, setShowColumnChooser] = useState(false);
    const [columnChooserSearch, setColumnChooserSearch] = useState("");
    const [columnChooserDraftHidden, setColumnChooserDraftHidden] = useState([]);
    const [showExportMenu, setShowExportMenu] = useState(false);

    const [exportModal, setExportModal] = useState({
      isOpen: false,
      title: "Export File",
      confirmText: "Export",
      defaultFileName: "",
      type: null,
    });

    const { companyInfo, currentUserRow } = useAuth();

    useEffect(() => {
      const checkSmall = () => {
        setIsMobileView(window.innerWidth < 640);
        setIsMobile(window.innerWidth <= 768);
      };

      checkSmall();
      window.addEventListener("resize", checkSmall);
      return () => window.removeEventListener("resize", checkSmall);
    }, []);

    useEffect(() => {
      const keys = (columns || []).map((c) => c.key).filter(Boolean);
      if (!keys.length) return;

      setColumnOrder((prev) => {
        const prevSet = new Set(prev);
        const added = keys.filter((k) => !prevSet.has(k));
        return prev.length === 0
          ? keys
          : [...prev.filter((k) => keys.includes(k)), ...added];
      });
    }, [columns]);

    useEffect(() => {
      const onDown = (e) => {
        if (!e.target.closest?.("[data-sgrt-export]")) setShowExportMenu(false);
        if (!e.target.closest?.("[data-sgrt-cols]")) setShowColumnChooser(false);
      };

      document.addEventListener("mousedown", onDown);
      return () => document.removeEventListener("mousedown", onDown);
    }, []);

    useEffect(() => {
      onStateChange?.({
        filters,
        sortConfig,
        currentPage,
        groupBy,
        autoExpandGroups,
        userHiddenCols,
        itemsPerPage: rowsPerPage,
        globalSearch,
        mobileViewMode,
      });
    }, [
      filters,
      sortConfig,
      currentPage,
      groupBy,
      autoExpandGroups,
      userHiddenCols,
      rowsPerPage,
      globalSearch,
      mobileViewMode,
      onStateChange,
    ]);

    const hasActiveFilters = useMemo(
      () => Object.values(filters).some((v) => String(v || "").trim() !== ""),
      [filters]
    );

    const parseNumber = (v) => {
      if (typeof parseFormattedNumber === "function") {
        const n = parseFormattedNumber(v);
        return typeof n === "number"
          ? n
          : Number(String(v ?? "").replace(/,/g, ""));
      }

      return typeof v === "number"
        ? v
        : Number(String(v ?? "").replace(/,/g, ""));
    };

    const formatValue = (value, col) => {
      if (value === null || value === undefined) return "";

      switch (col?.renderType) {
        case "number":
        case "currency": {
          const digits =
            typeof col?.roundingOff === "number" ? col.roundingOff : 2;

          return typeof formatNumber === "function"
            ? formatNumber(value, digits)
            : Number(parseNumber(value)).toLocaleString("en-US", {
                minimumFractionDigits: digits,
                maximumFractionDigits: digits,
              });
        }

        case "date": {
          try {
            const datePart = String(value).split("T")[0];
            return typeof useReturnToDate === "function"
              ? useReturnToDate(datePart)
              : datePart;
          } catch {
            return String(value);
          }
        }

        default:
          return String(value ?? "");
      }
    };

    const orderedCols = useMemo(() => {
      if (columnOrder.length === 0) return columns;

      return columnOrder
        .map((key) => columns.find((c) => c.key === key))
        .filter(Boolean);
    }, [columns, columnOrder]);

    const baseVisibleColumns = useMemo(
      () => orderedCols.filter((c) => !c.hidden && c.renderType !== "actions"),
      [orderedCols],
    );

    const baseColumnKeys = useMemo(
      () => new Set(baseVisibleColumns.map((col) => col.key)),
      [baseVisibleColumns],
    );

    useEffect(() => {
      setGroupBy((prev) => {
        const next = prev.filter(
          (key, index, arr) => baseColumnKeys.has(key) && arr.indexOf(key) === index,
        );
        return next.length === prev.length ? prev : next;
      });
    }, [baseColumnKeys]);

    const visibleCols = useMemo(
      () =>
        baseVisibleColumns.filter(
          (c) => !userHiddenCols.includes(c.key) && !groupBy.includes(c.key),
        ),
      [baseVisibleColumns, userHiddenCols, groupBy],
    );

    const chooserColumns = useMemo(
      () => baseVisibleColumns.filter((col) => !groupBy.includes(col.key)),
      [baseVisibleColumns, groupBy],
    );

    const protectedColumnKeys = useMemo(
      () => chooserColumns.slice(0, 2).map((col) => col.key),
      [chooserColumns],
    );

    const draftVisibleChooserColumnCount = useMemo(
      () => chooserColumns.filter((col) => !columnChooserDraftHidden.includes(col.key)).length,
      [chooserColumns, columnChooserDraftHidden],
    );

    const filteredChooserColumns = useMemo(() => {
      const q = String(columnChooserSearch || "").trim().toLowerCase();
      if (!q) return chooserColumns;
      return chooserColumns.filter((col) =>
        String(col.label || col.key || "").toLowerCase().includes(q),
      );
    }, [chooserColumns, columnChooserSearch]);

    const allColumnsChecked = chooserColumns.every(
      (col) => !columnChooserDraftHidden.includes(col.key),
    );

    const columnChooserTitle = String(docType || "Report")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

    const hasActionCol = Boolean(onRowAction || rightActionLabel || renderDetailPanel);

    const areColumnsReady = useMemo(() => {
      if (!Array.isArray(columns) || columns.length === 0) return false;
      if (!Array.isArray(orderedCols) || orderedCols.length === 0) return false;
      if (!Array.isArray(baseVisibleColumns) || baseVisibleColumns.length === 0)
        return false;
      return true;
    }, [columns, orderedCols, baseVisibleColumns]);

    const filteredData = useMemo(() => {
      let rows = Array.isArray(data) ? data : [];
      const activeF = Object.entries(filters).filter(
        ([, v]) => String(v || "").trim() !== "",
      );

      if (activeF.length) {
        rows = rows.filter((r) =>
          activeF.every(([k, v]) => {
            const col = columns.find((c) => c.key === k);
            const cellValue = formatValue(r?.[k], col);

            return String(cellValue ?? "")
              .toLowerCase()
              .includes(String(v ?? "").toLowerCase());
          }),
        );
      }

      const q = String(globalSearch || "").trim().toLowerCase();

      if (q) {
        const keys = visibleCols.map((c) => c.key);
        rows = rows.filter((r) =>
          keys.some((k) =>
            String(r?.[k] ?? "")
              .toLowerCase()
              .includes(q),
          ),
        );
      }

      if (sortConfig?.key && sortConfig?.direction) {
        const { key, direction } = sortConfig;
        const col = columns.find((c) => c.key === key);
        const isNum =
          col?.renderType === "number" || col?.renderType === "currency";

        rows = [...rows].sort((a, b) => {
          const A = isNum
            ? parseNumber(a?.[key])
            : String(a?.[key] ?? "").toLowerCase();
          const B = isNum
            ? parseNumber(b?.[key])
            : String(b?.[key] ?? "").toLowerCase();

          const cmp = isNum
            ? A - B
            : String(A).localeCompare(String(B), undefined, { numeric: true });

          return direction === "asc" ? cmp : -cmp;
        });
      }

      return rows;
    }, [data, filters, globalSearch, visibleCols, sortConfig, columns]);

    const calculateAggregates = (rows) => {
      const sums = {};

      visibleCols.forEach((col) => {
        const key = String(col.key ?? "").toLowerCase();
        const label = String(col.label ?? "").toLowerCase();

        if (
          (col.renderType === "number" || col.renderType === "currency") &&
          !totalExemptions.some(
            (ex) => label.includes(ex) || key.includes(ex),
          )
        ) {
          sums[col.key] = rows.reduce(
            (acc, r) => acc + (parseNumber(r?.[col.key]) || 0),
            0,
          );
        }
      });

      return sums;
    };

    const groupData = (rows, level = 0) => {
      if (level >= groupBy.length) return rows.map((r) => ({ ...r }));

      const gKey = groupBy[level];
      const groups = {};

      rows.forEach((r) => {
        const val = String(r[gKey] ?? "(Blank)");
        if (!groups[val]) groups[val] = [];
        groups[val].push(r);
      });

      return Object.keys(groups)
        .sort()
        .map((val) => ({
          isGroup: true,
          key: gKey,
          value: val,
          level,
          count: groups[val].length,
          aggregates: calculateAggregates(groups[val]),
          children: groupData(groups[val], level + 1),
        }));
    };

    const processRenderList = (nodes) => {
      let list = [];

      nodes.forEach((node) => {
        if (node.isGroup) {
          list.push(node);
          const uniqueId = `${node.key}:${node.value}:${node.level}`;

          if (autoExpandGroups || expandedGroups[uniqueId]) {
            list = list.concat(
              node.level === groupBy.length - 1
                ? node.children
                : processRenderList(node.children),
            );

            list.push({
              isSubtotal: true,
              label: node.value,
              aggregates: node.aggregates,
              level: node.level,
            });
          }
        } else {
          list.push(node);
        }
      });

      return list;
    };

    const fullRenderRows = useMemo(() => {
      if (groupBy.length === 0) return filteredData;

      const expandAll = (nodes) => {
        let list = [];

        nodes.forEach((node) => {
          if (node.isGroup) {
            list.push(node);

            if (node.level === groupBy.length - 1) {
              list = list.concat(node.children);
            } else {
              list = list.concat(expandAll(node.children));
            }
          } else {
            list.push(node);
          }
        });

        return list;
      };

      return expandAll(groupData(filteredData));
    }, [filteredData, groupBy]);

    const groupedStructure = useMemo(
      () => (groupBy.length ? groupData(filteredData) : filteredData),
      [filteredData, groupBy],
    );

    const totalItems = groupBy.length
      ? groupedStructure.length
      : filteredData.length;

    const totalPages = Math.max(1, Math.ceil(totalItems / rowsPerPage));
    const safePage = Math.min(Math.max(1, currentPage), totalPages);

    const displayRows = useMemo(() => {
      if (!pagination) {
        return groupBy.length ? processRenderList(groupedStructure) : filteredData;
      }

      const start = (safePage - 1) * rowsPerPage;
      const paged = groupBy.length
        ? groupedStructure.slice(start, start + rowsPerPage)
        : filteredData.slice(start, start + rowsPerPage);

      return groupBy.length ? processRenderList(paged) : paged;
    }, [
      safePage,
      rowsPerPage,
      filteredData,
      groupedStructure,
      autoExpandGroups,
      expandedGroups,
      groupBy,
      pagination,
    ]);

    const grandTotals = useMemo(
      () => calculateAggregates(filteredData),
      [filteredData, visibleCols],
    );

    const hasGrandTotalColumns = useMemo(
      () => visibleCols.some((col) => grandTotals[col.key] !== undefined),
      [visibleCols, grandTotals],
    );

    const allGroupKeys = useMemo(() => {
      const keys = [];

      const walk = (nodes) =>
        nodes.forEach((n) => {
          if (n.isGroup) {
            keys.push(`${n.key}:${n.value}:${n.level}`);
            walk(n.children);
          }
        });

      if (groupBy.length) walk(groupedStructure);
      return keys;
    }, [groupedStructure, groupBy]);

    const allExpanded =
      groupBy.length > 0 &&
      (autoExpandGroups ||
        (allGroupKeys.length > 0 && allGroupKeys.every((k) => expandedGroups[k])));
    const groupingRenderKey = `${groupBy.join("|") || "ungrouped"}:${autoExpandGroups ? "expanded" : "manual"}`;

    const getColumnMinWidth = (col) =>
      Number(col?.minWidth) || DEFAULT_MIN_COL_WIDTH;

    const getColumnMaxWidth = (col) =>
      Number(col?.maxWidth) || DEFAULT_MAX_COL_WIDTH;

    const getColWidth = (col) => {
      const stored = colWidths[col.key];
      if (stored) return stored;
      if (col?.width) return col.width;
      return getColumnMinWidth(col);
    };

    const getAutoFitWidth = () => {
      const count = visibleCols.length + (hasActionCol ? 1 : 0);

      if (count >= 14) return 100;
      if (count >= 12) return 110;
      if (count >= 10) return 130;
      if (count >= 8) return 150;
      return 180;
    };

    const getHeaderWidth = (col) => {
      const measuredWidth = getColWidth(col);
      const minWidth = getColumnMinWidth(col);
      const maxWidth = getColumnMaxWidth(col);

      if (autoFillGridState) {
        return Math.min(
          maxWidth,
          Math.max(measuredWidth, Math.max(getAutoFitWidth(), AUTO_FIT_MIN_WIDTH)),
        );
      }

      return Math.min(maxWidth, Math.max(minWidth, measuredWidth));
    };

    const getCellWidthStyle = (col) => {
      const width = getHeaderWidth(col);
      return {
        width,
        minWidth: width,
        maxWidth: width,
      };
    };

    const getEstimatedTableWidth = () => {
      const columnsWidth = visibleCols.reduce(
        (sum, col) => sum + getHeaderWidth(col),
        0,
      );
      return columnsWidth + (hasActionCol ? ACTION_COL_WIDTH : 0);
    };

    const moveColumn = (fromKey, toKey) => {
      if (!fromKey || !toKey || fromKey === toKey) return;

      setAutoFillGridState(false);

      setColumnOrder((prev) => {
        const current = prev.length
          ? [...prev]
          : (columns || []).map((c) => c.key).filter(Boolean);

        const fromIndex = current.indexOf(fromKey);
        const toIndex = current.indexOf(toKey);

        if (fromIndex === -1 || toIndex === -1) return current;

        const updated = [...current];
        const [moved] = updated.splice(fromIndex, 1);
        updated.splice(toIndex, 0, moved);

        return updated;
      });

      setDraggedCol(null);
    };

    const getTextWidth = (text, font = "400 11px Arial") => {
      if (typeof document === "undefined") return 0;

      const canvas =
        getTextWidth.canvas || (getTextWidth.canvas = document.createElement("canvas"));
      const context = canvas.getContext("2d");
      if (!context) return 0;

      context.font = font;
      return context.measureText(String(text ?? "")).width;
    };

    useLayoutEffect(() => {
      if (!areColumnsReady) return;
      if (!visibleCols.length) return;
      if (isLoading) return;

      const sampleRows = Array.isArray(data)
        ? data.slice(0, AUTO_MEASURE_SAMPLE_SIZE)
        : [];

      const measuredWidths = {};

      visibleCols.forEach((col) => {
        if (!col?.key) return;
        if (userResizedColsRef.current.has(col.key)) return;

        const minWidth = getColumnMinWidth(col);
        const maxWidth = getColumnMaxWidth(col);

        const headerText = col.label || col.key || "";
        const headerWidth = getTextWidth(headerText, "700 11px Arial");

        let contentWidth = 0;

        for (let i = 0; i < sampleRows.length; i += 1) {
          const row = sampleRows[i];
          const rawValue = row?.[col.key];
          const formattedValue = formatValue(rawValue, col);
          const textWidth = getTextWidth(formattedValue, "400 11px Arial");
          if (textWidth > contentWidth) contentWidth = textWidth;
        }

        const cellPaddingAllowance = 28;
        const sortIconAllowance = 18;
        const widthFromHeader = headerWidth + cellPaddingAllowance + sortIconAllowance;
        const widthFromContent = contentWidth + cellPaddingAllowance;
        const computed = Math.ceil(Math.max(widthFromHeader, widthFromContent, minWidth));

        measuredWidths[col.key] = Math.min(maxWidth, computed);
      });

      if (Object.keys(measuredWidths).length) {
        setColWidths((prev) => {
          const next = { ...prev };
          let changed = false;

          Object.entries(measuredWidths).forEach(([key, width]) => {
            if (next[key] !== width) {
              next[key] = width;
              changed = true;
            }
          });

          return changed ? next : prev;
        });
      }
    }, [areColumnsReady, visibleCols, data, isLoading]);

    useLayoutEffect(() => {
      if (!areColumnsReady) return;
      if (isLoading) return;
      if (!scrollRef.current) return;
      if (!visibleCols.length) return;

      const containerWidth = scrollRef.current.clientWidth || 0;
      const tableWidth = getEstimatedTableWidth();

      if (containerWidth > 0 && tableWidth > 0 && tableWidth < containerWidth) {
        if (!autoFitTriggeredRef.current) {
          autoFitTriggeredRef.current = true;
        }
      } else {
        autoFitTriggeredRef.current = false;
      }
    }, [
      areColumnsReady,
      isLoading,
      visibleCols,
      hasActionCol,
      colWidths,
      userHiddenCols,
      groupBy,
      columns,
    ]);

    useEffect(() => {
      autoFitTriggeredRef.current = false;
    }, [columns]);

    const startResizing = (e, key) => {
      setAutoFillGridState(false);

      e.preventDefault();
      const startX = e.clientX;
      const col = columns.find((c) => c.key === key) || { key };
      const minWidth = getColumnMinWidth(col);
      const maxWidth = getColumnMaxWidth(col);
      const startWidth = getColWidth({ key, ...col });

      const onMove = (me) =>
        setColWidths((prev) => ({
          ...prev,
          [key]: Math.min(maxWidth, Math.max(minWidth, startWidth + (me.clientX - startX))),
        }));

      const onUp = () => {
        userResizedColsRef.current.add(key);
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    };

    const sanitizeFileName = (name) =>
      String(name ?? "")
        .trim()
        .replace(/[\\/:*?"<>|]/g, "")
        .replace(/\s+/g, " ")
        .substring(0, 120);

    const getDateTimeStamp = () => {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      const hh = String(now.getHours()).padStart(2, "0");
      const mi = String(now.getMinutes()).padStart(2, "0");
      const ss = String(now.getSeconds()).padStart(2, "0");
      return `${yyyy}${mm}${dd}_${hh}${mi}${ss}`;
    };

    const defaultFileName = sanitizeFileName(`${docType} ${getDateTimeStamp()}`);

    const openExportModal = (type) => {
      const titleMap = {
        excel: "Export Excel",
        csv: "Export CSV",
        pdf: "Export PDF",
        image: "Export Image",
      };

      setShowExportMenu(false);
      setExportModal({
        isOpen: true,
        title: titleMap[type] || "Export File",
        confirmText: "Export",
        defaultFileName,
        type,
      });
    };

    const closeExportModal = () => {
      setExportModal({
        isOpen: false,
        title: "Export File",
        confirmText: "Export",
        defaultFileName: "",
        type: null,
      });
    };

    const exportCsvWithFileName = async (safeFileName) => {
      const header = visibleCols
        .map((c) => `"${c.label.toUpperCase().replace(/\s+/g, "_")}"`)
        .join(",");

      const csvRows = [header];

      fullRenderRows.forEach((row) => {
        const line = visibleCols
          .map((col, idx) => {
            let val = row.isGroup
              ? idx === 0
                ? `${col.label}: ${row.value}`
                : ""
              : formatValue(row[col.key], col);

            return `"${String(val).replace(/"/g, '""')}"`;
          })
          .join(",");

        csvRows.push(line);
      });

      const blob = new Blob([csvRows.join("\r\n")], {
        type: "text/csv;charset=utf-8;",
      });

      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${safeFileName}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
    };

    const exportExcelWithFileName = async (safeFileName) => {
      await exportGenericQueryExcel(
        groupBy.length > 0 ? groupedStructure : filteredData,
        grandTotals,
        visibleCols,
        groupBy,
        columns,
        expandedGroups,
        7,
        safeFileName,
        currentUserRow?.userName,
        companyInfo?.compName,
        companyInfo?.compAddr,
        companyInfo?.telNo,
        docType,
        autoExpandGroups,
      );
    };

    const exportPdfWithFileName = async (safeFileName) => {
      if (!exportContainerRef.current) return;

      const canvas = await html2canvas(exportContainerRef.current, { scale: 2 });
      const pdf = new jsPDF("l", "mm", "a4");

      pdf.addImage(
        canvas.toDataURL("image/png"),
        "PNG",
        10,
        10,
        280,
        (canvas.height * 280) / canvas.width,
      );

      pdf.save(`${safeFileName}.pdf`);
    };

    const exportImageWithFileName = async (safeFileName) => {
      if (!exportContainerRef.current) return;

      const canvas = await html2canvas(exportContainerRef.current);
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `${safeFileName}.png`;
      link.click();
    };

    const handleExportConfirm = async (enteredFileName) => {
      const safeFileName = sanitizeFileName(enteredFileName);
      if (!safeFileName) return;

      try {
        if (exportModal.type === "csv") {
          await exportCsvWithFileName(safeFileName);
        } else if (exportModal.type === "excel") {
          await exportExcelWithFileName(safeFileName);
        } else if (exportModal.type === "pdf") {
          await exportPdfWithFileName(safeFileName);
        } else if (exportModal.type === "image") {
          await exportImageWithFileName(safeFileName);
        }
      } catch (error) {
        console.error(error);
        Swal.fire({
          icon: "error",
          title: "Export failed",
          text: error?.message || "Unable to export file.",
        });
      } finally {
        closeExportModal();
      }
    };

    const getMobileCardKey = (row, idx) => {
      return row?.id ?? row?.tranID ?? row?.documentNo ?? row?.code ?? idx;
    };

    const openColumnChooser = () => {
      setColumnChooserSearch("");
      setColumnChooserDraftHidden(userHiddenCols);
      setShowColumnChooser(true);
    };

    const closeColumnChooser = () => {
      setShowColumnChooser(false);
      setColumnChooserSearch("");
      setColumnChooserDraftHidden([]);
    };

    const toggleAllColumns = (checked) => {
      if (checked) {
        setColumnChooserDraftHidden([]);
        return;
      }

      const protectedKeys = new Set(protectedColumnKeys);
      setColumnChooserDraftHidden(
        chooserColumns
          .filter((col) => !protectedKeys.has(col.key))
          .map((col) => col.key),
      );
    };

    const toggleColumnVisibility = (colKey, checked) => {
      if (!checked && (protectedColumnKeys.includes(colKey) || draftVisibleChooserColumnCount <= 2)) {
        useSwalErrorAlert(
          "Minimum columns required",
          "Please retain at least 2 columns.",
        );
        return;
      }

      setColumnChooserDraftHidden((current) => {
        if (checked) return current.filter((key) => key !== colKey);
        return current.includes(colKey) ? current : [...current, colKey];
      });
    };

    const applyColumnChooser = () => {
      setUserHiddenCols(columnChooserDraftHidden);
      closeColumnChooser();
    };

    const resetColumnChooser = () => {
      setColumnChooserDraftHidden(userHiddenCols);
      setColumnChooserSearch("");
    };

    useImperativeHandle(ref, () => ({
      getState: () => ({
        filters,
        sortConfig,
        currentPage: safePage,
        groupBy,
        autoExpandGroups,
        userHiddenCols,
        globalSearch,
        mobileViewMode,
      }),
      clearAllState: () => {
        setFilters({});
        setGroupBy([]);
        setExpandedGroups({});
        setAutoExpandGroups(false);
        setGlobalSearch("");
        setCurrentPage(1);
        setUserHiddenCols([]);
        setMobileViewMode("table");
        setExpandedMobileCards({});
        userResizedColsRef.current = new Set();
      },
    }));

    const hasRows = filteredData.length > 0;
    const isRedRow = (row) => {
      const status = String(row?.status || "").toUpperCase();
      const moveDirection = String(row?.moveDirection || "").toUpperCase();

      return status === "FAILED" || moveDirection === "OUT";
    };

    return (
      <div
        className={[
          "global-tran-table-main-div-ui flex flex-col flex-1 h-full overflow-hidden dark:bg-slate-900",
          className,
        ].join(" ")}
      >
        <div
          className="p-2 rounded-md flex flex-col md:flex-row md:items-center md:justify-between gap-2"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (!draggedCol) return;
            setAutoFillGridState(false);
            setGroupBy((p) => {
              const current = p.filter(
                (key, index, arr) => baseColumnKeys.has(key) && arr.indexOf(key) === index,
              );
              return current.includes(draggedCol) ? current : [...current, draggedCol];
            });
            if (!autoExpandGroups) setExpandedGroups({});
            setDraggedCol(null);
          }}
        >
          <div className="flex-1 flex flex-wrap gap-2 items-center min-w-0">
            {showGroupBy && groupBy.length === 0 && !isMobile && (
              <div
                className={`text-gray-400 dark:text-slate-500 italic border border-dashed border-gray-300 dark:border-slate-600 rounded ${
                  tableSize === "Half"
                    ? "text-[9px] px-2 py-1.5"
                    : "text-[10px] sm:text-xs px-8 py-2"
                }`}
              >
                <FontAwesomeIcon icon={faLayerGroup} className="mr-1" />
                Drag column here to Group
              </div>
            )}

            {groupBy.map((gKey) => (
              <div
                key={gKey}
                className={`flex items-center bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 rounded border border-blue-200 dark:border-blue-800 ${
                  tableSize === "Half"
                    ? "text-[10px] px-1.5 py-0.5"
                    : "text-xs px-2 py-1"
                }`}
              >
                {columns.find((c) => c.key === gKey)?.label}
                <button
                  onClick={() => {
                    setGroupBy((p) => p.filter((k) => k !== gKey));
                    if (!autoExpandGroups) setExpandedGroups({});
                    setDraggedCol(null);
                  }}
                  className="ml-2 text-blue-600 dark:text-blue-400 hover:text-red-600 dark:hover:text-red-400"
                >
                  <FontAwesomeIcon icon={faTimes} />
                </button>
              </div>
            ))}
          </div>

          <div
            className={`flex ${
              isMobileView
                ? "w-full flex-col items-stretch gap-2"
                : "items-center gap-2 flex-wrap justify-end"
            }`}
          >
            {showGroupBy && groupBy.length > 0 && (
              <div className="flex items-center gap-2">
                <label
                  className={`inline-flex items-center cursor-pointer select-none ${
                    tableSize === "Half" ? "h-7" : "h-9"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={allExpanded}
                    onChange={() => {
                      const expand = !allExpanded;
                      setAutoExpandGroups(expand);
                      setExpandedGroups(
                        expand
                          ? Object.fromEntries(allGroupKeys.map((k) => [k, true]))
                          : {},
                      );
                    }}
                    className="sr-only"
                  />
                  <div
                    className={`relative rounded-full transition-colors duration-200 ${
                      allExpanded
                        ? "bg-blue-600 text-white"
                        : "bg-gray-300 dark:bg-slate-600 text-gray-600 dark:text-slate-300"
                    } ${tableSize === "Half" ? "w-[78px] h-7" : "w-24 h-8"}`}
                  >
                    <span
                      className={`absolute rounded-full bg-white shadow-md transition-all duration-200 ${
                        allExpanded
                          ? tableSize === "Half"
                            ? "left-[48px]"
                            : "left-[66px]"
                          : "left-[2px]"
                      } ${
                        tableSize === "Half"
                          ? "top-[2px] w-6 h-6"
                          : "top-[2px] w-7 h-7"
                      }`}
                    />
                    <span
                      className={`absolute inset-0 flex items-center font-medium pointer-events-none ${
                        tableSize === "Half" ? "text-[10px]" : "text-[11px]"
                      } ${allExpanded ? "justify-start pl-4" : "justify-end pr-4"}`}
                    >
                      {allExpanded ? "Collapse" : "Expand"}
                    </span>
                  </div>
                </label>

                <button
                  onClick={() => {
                    setGroupBy([]);
                    if (!autoExpandGroups) setExpandedGroups({});
                    setDraggedCol(null);
                  }}
                  className={`font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition ${
                    tableSize === "Half"
                      ? "h-7 text-[10px] px-2"
                      : "h-8 text-xs px-3"
                  }`}
                >
                  <FontAwesomeIcon icon={faTimes} className="mr-1" />
                  Remove
                </button>
              </div>
            )}

            {showGlobalSearch && (
              <div
                className={
                  isMobileView
                    ? "w-full"
                    : "flex items-center gap-2 w-full md:w-auto"
                }
              >
                <input
                  type="text"
                  value={globalSearch}
                  onChange={(e) => {
                    setGlobalSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Quick Search..."
                  className={`rounded-md border border-gray-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-blue-300 outline-none ${
                    isMobileView
                      ? "w-full h-9 px-3 text-xs"
                      : tableSize === "Half"
                        ? "h-7 md:w-24 px-2 text-[11px]"
                        : "h-8 md:w-48 px-3 text-xs"
                  }`}
                />
              </div>
            )}

              {hasActiveFilters && (
                <button
                  type="button"
                  className={`rounded-md bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/60 shrink-0 font-medium flex items-center ${
                    tableSize === "Half"
                      ? "h-7 px-2 text-[10px]"
                      : "h-8 px-3 text-xs"
                  }`}
                  onClick={() => {
                    setFilters({});
                    setCurrentPage(1);
                  }}
                  title="Clear column filters"
                >
                  <FontAwesomeIcon icon={faTimes} className="mr-1" />
                  Clear Filters
                </button>
              )}

            {isMobileView ? (
              <div className="w-full grid grid-cols-3 gap-2">
                <div className="relative" data-sgrt-export>
                  <button
                    onClick={() =>
                      filteredData.length > 0 && setShowExportMenu(!showExportMenu)
                    }
                    disabled={filteredData.length === 0}
                    className="w-full h-9 px-2 text-[11px] font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 transition flex items-center justify-center"
                  >
                    <FontAwesomeIcon icon={faFileExport} className="mr-1" />
                    Export
                  </button>

                  {showExportMenu && (
                    <div className="absolute left-0 mt-1 min-w-[140px] rounded-lg shadow-lg bg-white dark:bg-slate-800 ring-1 ring-black/10 dark:ring-white/10 z-[60] overflow-hidden py-1">
                      <button
                        onClick={() => openExportModal("excel")}
                        className="flex items-center w-full px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        <FontAwesomeIcon
                          icon={faFileExcel}
                          className="mr-2 text-green-600 dark:text-green-400"
                        />
                        Excel
                      </button>
                      <button
                        onClick={() => openExportModal("csv")}
                        className="flex items-center w-full px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        <FontAwesomeIcon
                          icon={faFileCsv}
                          className="mr-2 text-emerald-600 dark:text-emerald-400"
                        />
                        CSV
                      </button>
                      <button
                        onClick={() => openExportModal("pdf")}
                        className="flex items-center w-full px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        <FontAwesomeIcon
                          icon={faFilePdf}
                          className="mr-2 text-red-600 dark:text-red-400"
                        />
                        PDF
                      </button>
                      <button
                        onClick={() => openExportModal("image")}
                        className="flex items-center w-full px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        <FontAwesomeIcon
                          icon={faFileImage}
                          className="mr-2 text-blue-600 dark:text-blue-400"
                        />
                        Image
                      </button>
                    </div>
                  )}
                </div>

                <div className="relative" data-sgrt-cols>
                  <button
                    disabled={filteredData.length === 0}
                    onClick={openColumnChooser}
                    className="w-full h-9 px-2 text-[11px] font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition flex items-center justify-center"
                  >
                    <FontAwesomeIcon icon={faColumns} className="mr-1" />
                    Columns
                  </button>
                </div>

                <div className="flex rounded-md overflow-hidden border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 min-w-0">
                  <button
                    type="button"
                    onClick={() => setMobileViewMode("table")}
                    className={`flex-1 min-w-0 px-2 h-9 text-[10px] font-medium transition flex items-center justify-center ${
                      mobileViewMode === "table"
                        ? "bg-blue-600 text-white"
                        : "bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                    }`}
                  >
                    <FontAwesomeIcon icon={faTable} className="mr-1" />
                    <span className="truncate">Table</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMobileViewMode("card")}
                    className={`flex-1 min-w-0 px-2 h-9 text-[10px] font-medium transition border-l border-gray-300 dark:border-slate-600 flex items-center justify-center ${
                      mobileViewMode === "card"
                        ? "bg-blue-600 text-white"
                        : "bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                    }`}
                  >
                    <FontAwesomeIcon icon={faIdCard} className="mr-1" />
                    <span className="truncate">Card</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                {!isMobile && (
                  <label
                    className={`inline-flex items-center cursor-pointer select-none shrink-0 ${
                      tableSize === "Half" ? "h-7" : "h-8"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={autoFillGridState}
                      onChange={() => setAutoFillGridState(!autoFillGridState)}
                      className="sr-only"
                    />
                    <div
                      className={`relative rounded-full transition-colors duration-200 ${
                        autoFillGridState
                          ? "bg-blue-600 text-white"
                          : "bg-gray-300 dark:bg-slate-600 text-gray-700 dark:text-slate-300"
                      } ${tableSize === "Half" ? "w-20 h-7" : "w-20 h-8"}`}
                    >
                      <span
                        className={`absolute top-[2px] rounded-full bg-white shadow-md transition-all duration-200 ${
                          autoFillGridState
                            ? tableSize === "Half"
                              ? "left-[55px]"
                              : "left-[50px]"
                            : "left-[2px]"
                        } ${tableSize === "Half" ? "w-6 h-6" : "w-7 h-7"}`}
                      />
                      <span
                        className={`absolute inset-0 flex items-center text-[11px] font-medium pointer-events-none transition-all duration-200 ${
                          autoFillGridState
                            ? "justify-start pl-2 text-white"
                            : "justify-end pr-2"
                        }`}
                      >
                        Auto Fit
                      </span>
                    </div>
                  </label>
                )}

                {onRefresh && (
                  <button
                    onClick={onRefresh}
                    className={`text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition flex items-center justify-center ${
                      tableSize === "Half" ? "h-7 px-2" : "h-8 px-3"
                    }`}
                  >
                    <FontAwesomeIcon
                      icon={faSyncAlt}
                      spin={isFetching}
                      className="mr-1"
                    />
                    Sync
                  </button>
                )}

                <div className="relative" data-sgrt-export>
                  <button
                    onClick={() =>
                      filteredData.length > 0 && setShowExportMenu(!showExportMenu)
                    }
                    disabled={filteredData.length === 0}
                    className={`text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 transition flex items-center justify-center ${
                      tableSize === "Half" ? "h-7 px-3" : "h-8 px-3"
                    }`}
                  >
                    <FontAwesomeIcon icon={faFileExport} className="mr-1" />
                    Export
                  </button>

                  {showExportMenu && (
                    <div className="absolute right-0 mt-1 min-w-[120px] rounded-lg shadow-lg bg-white dark:bg-slate-800 ring-1 ring-black/10 dark:ring-white/10 z-[60] overflow-hidden py-1">
                      <button
                        onClick={() => openExportModal("excel")}
                        className="flex items-center w-full px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        <FontAwesomeIcon
                          icon={faFileExcel}
                          className="mr-2 text-green-600 dark:text-green-400"
                        />
                        Excel
                      </button>
                      <button
                        onClick={() => openExportModal("csv")}
                        className="flex items-center w-full px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        <FontAwesomeIcon
                          icon={faFileCsv}
                          className="mr-2 text-emerald-600 dark:text-emerald-400"
                        />
                        CSV
                      </button>
                      <button
                        onClick={() => openExportModal("pdf")}
                        className="flex items-center w-full px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        <FontAwesomeIcon
                          icon={faFilePdf}
                          className="mr-2 text-red-600 dark:text-red-400"
                        />
                        PDF
                      </button>
                      <button
                        onClick={() => openExportModal("image")}
                        className="flex items-center w-full px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        <FontAwesomeIcon
                          icon={faFileImage}
                          className="mr-2 text-blue-600 dark:text-blue-400"
                        />
                        Image
                      </button>
                    </div>
                  )}
                </div>

                <div className="relative" data-sgrt-cols>
                  <button
                    disabled={filteredData.length === 0}
                    onClick={openColumnChooser}
                    className={`text-xs font-medium text-white bg-blue-600 rounded-md transition flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed ${
                      tableSize === "Half" ? "h-7 px-2" : "h-8 px-3"
                    }`}
                  >
                    <FontAwesomeIcon icon={faColumns} className="mr-1" />
                    Columns
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {showColumnChooser && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/45 px-3 py-3">
            <div
              data-sgrt-cols
              className="flex max-h-[60vh] w-full max-w-[480px] flex-col overflow-hidden rounded-md bg-white dark:bg-slate-800 shadow-2xl ring-1 ring-black/10 dark:ring-white/10"
            >
              <div className="flex items-start justify-between gap-3 border-b border-gray-200 dark:border-slate-700 px-3 py-2">
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Manage Columns - {columnChooserTitle}
                  </h2>
                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                    Choose the columns to display in the table.
                  </p>
                </div>
                <button
                  type="button"
                  className="h-6 w-6 shrink-0 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                  onClick={closeColumnChooser}
                  title="Close"
                >
                  <FontAwesomeIcon icon={faTimes} className="text-sm" />
                </button>
              </div>

              <div className="border-b border-gray-200 dark:border-slate-700 px-3 py-2">
                <div className="flex flex-col gap-2">
                  <div className="relative min-w-0 flex-1">
                    <FontAwesomeIcon
                      icon={faSearch}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400"
                    />
                    <input
                      type="text"
                      value={columnChooserSearch}
                      onChange={(e) => setColumnChooserSearch(e.target.value)}
                      placeholder="Search columns..."
                      className="h-7 w-full rounded-md border border-gray-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 pl-9 pr-2 text-[11px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-center gap-2 overflow-x-auto">
                    <label className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md px-1 text-[11px] text-slate-800 dark:text-slate-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        className="h-3 w-3 accent-blue-600"
                        checked={allColumnsChecked}
                        onChange={(e) => toggleAllColumns(e.target.checked)}
                      />
                      {allColumnsChecked
                        ? `UnSelect All (${chooserColumns.length})`
                        : `Select All (${chooserColumns.length})`}
                    </label>
                    <div className="h-5 shrink-0 border-l border-gray-300 dark:border-slate-600" />
                    <button
                      type="button"
                      className="h-7 shrink-0 px-1.5 text-[11px] font-medium text-blue-600 hover:text-blue-700 dark:hover:text-blue-400"
                      onClick={resetColumnChooser}
                    >
                      Reset
                    </button>
                    <button
                      type="button"
                      className="h-7 shrink-0 rounded-md border border-gray-300 dark:border-slate-600 px-2 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                      onClick={() => {
                        setColumnChooserDraftHidden([]);
                        setColumnChooserSearch("");
                      }}
                    >
                      Show All
                    </button>
                  </div>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-auto px-3 py-2 custom-scrollbar">
                <div className="grid grid-cols-1 gap-1.5 md:grid-cols-2">
                  {filteredChooserColumns.map((col) => (
                    <label
                      key={col.key}
                      className="flex h-7 items-center gap-1.5 rounded border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 text-[11px] text-slate-800 dark:text-slate-300 shadow-sm cursor-pointer select-none hover:bg-blue-50 dark:hover:bg-slate-700"
                    >
                      <input
                        type="checkbox"
                        className="h-3 w-3 shrink-0 accent-blue-600"
                        checked={!columnChooserDraftHidden.includes(col.key)}
                        onChange={(e) =>
                          toggleColumnVisibility(col.key, e.target.checked)
                        }
                      />
                      <span className="min-w-0 flex-1 truncate">{col.label}</span>
                      <FontAwesomeIcon
                        icon={faGripVertical}
                        className="text-[11px] text-slate-300 dark:text-slate-500"
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2 border-t border-gray-200 dark:border-slate-700 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Showing {filteredChooserColumns.length === 0 ? 0 : 1}-
                  {filteredChooserColumns.length} of {chooserColumns.length} columns
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className="h-7 min-w-[72px] rounded-md border border-gray-300 dark:border-slate-600 px-3 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                    onClick={closeColumnChooser}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="h-7 min-w-[72px] rounded-md bg-blue-600 px-3 text-[11px] font-medium text-white hover:bg-blue-700"
                    onClick={applyColumnChooser}
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="global-tran-table-main-sub-div-ui flex flex-col flex-1 relative bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-sm h-50 max-h-[600px]">
          {!areColumnsReady ? (
            <TableLoader message="Loading columns..." spinner />
          ) : isLoading ? (
            <TableLoader message="Loading Report..." />
          ) : isMobileView && mobileViewMode === "card" ? (
            <div className="flex-1 overflow-auto space-y-2 p-2">
              {displayRows.map((row, idx) => {
                if (row.isGroup) {
                  const uid = `${row.key}:${row.value}:${row.level}`;
                  return (
                    <div
                      key={uid}
                      className="rounded-lg border dark:border-slate-700 bg-gray-100 dark:bg-slate-800 p-3 cursor-pointer"
                      onClick={() => {
                        setAutoExpandGroups(false);
                        setExpandedGroups((p) => ({
                          ...p,
                          [uid]: !p[uid],
                        }));
                      }}
                    >
                      <div className="flex items-center text-xs font-bold text-blue-900 dark:text-blue-300">
                        <FontAwesomeIcon
                          icon={autoExpandGroups || expandedGroups[uid] ? faChevronDown : faChevronRight}
                          className="mr-2"
                        />
                        {columns.find((c) => c.key === row.key)?.label}: {row.value} (
                        {row.count})
                      </div>
                    </div>
                  );
                }

                if (row.isSubtotal) {
                  const cardKey = `subtotal-${row.label}-${idx}`;
                  const isExpanded = !!expandedMobileCards[cardKey];
                  const previewCols = visibleCols.slice(0, 5);
                  const extraCols = visibleCols.slice(5);
                  const colsToShow = isExpanded ? visibleCols : previewCols;

                  return (
                    <div
                      key={`sub-${idx}`}
                      className="rounded-lg border dark:border-blue-900 bg-blue-50 dark:bg-blue-900/20 p-3"
                    >
                      <div className="text-[11px] font-bold text-blue-900 dark:text-blue-300 mb-2">
                        Subtotal: {row.label}
                      </div>

                      <div className="space-y-1">
                        {colsToShow.map((col) => (
                          <div
                            key={col.key}
                            className="flex justify-between gap-3 text-[10px]"
                          >
                            <span className="font-semibold text-gray-500 dark:text-slate-400">
                              {col.label}
                            </span>
                            <span className="text-gray-800 dark:text-slate-200 font-medium text-right">
                              {row.aggregates[col.key] !== undefined
                                ? formatValue(row.aggregates[col.key], col)
                                : ""}
                            </span>
                          </div>
                        ))}
                      </div>

                      {extraCols.length > 0 && (
                        <div className="mt-3 flex justify-end">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedMobileCards((prev) => ({
                                ...prev,
                                [cardKey]: !prev[cardKey],
                              }));
                            }}
                            className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700"
                          >
                            {isExpanded ? "See Less" : `See More (${extraCols.length})`}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                }

                const cardKey = getMobileCardKey(row, idx);
                const isExpanded = !!expandedMobileCards[cardKey];
                const previewCols = visibleCols.slice(0, 5);
                const extraCols = visibleCols.slice(5);
                const colsToShow = isExpanded ? visibleCols : previewCols;
                
                // DRILL DOWN: Determine if this specific card should show the sub-panel
                const isDrillDownExpanded = expandedRowKeys.includes(row[rowKey]);

                return (
                  <div
                    key={idx}
                    className="rounded-lg border dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm p-3"
                    onClick={() => onMobileRowOpen?.(row)}
                  >
                    {hasActionCol && (
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100 dark:border-slate-700">
                        {visibleCols[0] && (
                          <span className="text-[11px] font-bold text-blue-900 dark:text-blue-300 pr-2 break-words">
                            {formatValue(row[visibleCols[0].key], visibleCols[0])}
                          </span>
                        )}

                        <div className="flex items-center gap-2 ml-auto">
                          {/* Chevron for Mobile */}
                          {renderDetailPanel && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onRowExpand) onRowExpand(row);
                              }}
                              className={`px-2 py-1 rounded transition text-[10px] font-medium flex items-center ${
                                isDrillDownExpanded
                                  ? "bg-blue-600 text-white"
                                  : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                              }`}
                            >
                              <FontAwesomeIcon icon={faChevronDown} className={`mr-1 transition-transform ${isDrillDownExpanded ? "-rotate-180" : ""}`} />
                              {isDrillDownExpanded ? "Hide" : "Details"}
                            </button>
                          )}

                          {onRowAction && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRowAction?.(row);
                              }}
                              className="px-2.5 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition text-[11px] font-medium"
                            >
                              <FontAwesomeIcon icon={faEye} className="mr-1" />
                              View
                            </button>
                          )}

                          {onRowActionsClick && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRowActionsClick(row);
                              }}
                              className="px-2.5 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 transition text-[11px] font-medium"
                            >
                              <FontAwesomeIcon
                                icon={actionsIcon || faPenToSquare}
                                className="mr-1"
                              />
                              {actionsTitle || "Edit"}
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      {colsToShow.map((col) => (
                        <div
                          key={col.key}
                          className="flex justify-between gap-3 text-[10px]"
                        >
                          <span className="font-semibold text-gray-500 dark:text-slate-400 shrink-0">
                            {col.label}
                          </span>

                          <span
                            className={`text-gray-800 dark:text-slate-200 font-medium text-right break-words ${
                              col.renderType === "number" ||
                              col.renderType === "currency"
                                ? "tabular-nums"
                                : ""
                            }`}
                          >
                            {formatValue(row[col.key], col)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {extraCols.length > 0 && (
                      <div className="mt-3 flex justify-end">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedMobileCards((prev) => ({
                              ...prev,
                              [cardKey]: !prev[cardKey],
                            }));
                          }}
                          className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700"
                        >
                          {isExpanded ? "See Less" : `See More (${extraCols.length})`}
                        </button>
                      </div>
                    )}
                    
                    {/* DRILL DOWN COMPONENT IN MOBILE CARD VIEW */}
                    {renderDetailPanel && isDrillDownExpanded && (
                      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                        {renderDetailPanel(row)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              ref={scrollRef}
              className={`relative isolate flex-1 h-0 custom-scrollbar ${
                !hasRows
                  ? "overflow-hidden"
                  : autoFillGridState
                    ? "overflow-x-auto overflow-y-auto"
                    : "overflow-auto"
              }`}
            >
              <table
                key={groupingRenderKey}
                className={`global-tran-table-div-ui border-collapse ${
                  autoFillGridState ? "w-full table-fixed" : "min-w-max table-auto"
                }`}
                style={
                  autoFillGridState
                    ? { tableLayout: "fixed" }
                    : { tableLayout: "auto" }
                }
              >
                <thead className="sticky top-0 z-10 bg-blue-100 dark:bg-slate-800 shadow-sm">
                  <tr>
                    {hasActionCol && (
                      <th
                        className="sticky left-0 z-20 bg-blue-100 dark:bg-slate-800 border-r border-b border-blue-200 dark:border-slate-700 font-bold py-2 text-[11px] text-blue-900 dark:text-blue-100"
                        style={{
                          width: ACTION_COL_WIDTH,
                          minWidth: ACTION_COL_WIDTH,
                          maxWidth: ACTION_COL_WIDTH,
                        }}
                      >
                        {rightActionLabel || "Actions"}
                      </th>
                    )}

                    {visibleCols.map((col) => (
                      <th
                        key={col.key}
                        style={getCellWidthStyle(col)}
                        draggable={!autoFillGridState}
                        onDragStart={(e) => {
                          if (autoFillGridState) return;
                          setDraggedCol(col.key);
                          e.dataTransfer.setData("text/plain", col.key);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        onDragOver={(e) => {
                          if (autoFillGridState) return;
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "move";
                        }}
                        onDrop={(e) => {
                          if (autoFillGridState) return;
                          e.preventDefault();
                          moveColumn(draggedCol, col.key);
                        }}
                        onClick={() =>
                          col.sortable !== false &&
                          setSortConfig((p) => ({
                            key: col.key,
                            direction:
                              p.key === col.key && p.direction === "asc"
                                ? "desc"
                                : "asc",
                          }))
                        }
                        className="px-2 py-1.5 text-left text-[11px] font-bold text-blue-900 dark:text-blue-100 border-b border-blue-200 dark:border-slate-700 cursor-pointer relative select-none"
                      >
                        <div className="flex items-center justify-between gap-2 overflow-hidden">
                          <span className="truncate block max-w-full overflow-hidden whitespace-nowrap">
                            {col.label}
                          </span>
                          <FontAwesomeIcon
                            icon={
                              sortConfig.key === col.key
                                ? sortConfig.direction === "asc"
                                  ? faSortUp
                                  : faSortDown
                                : faSort
                            }
                            className="opacity-30 shrink-0"
                          />
                        </div>

                        {!autoFillGridState && (
                          <div
                            className="absolute right-0 top-0 h-full w-1 cursor-col-resize"
                            onMouseDown={(e) => startResizing(e, col.key)}
                          />
                        )}
                      </th>
                    ))}
                  </tr>

                  {showFilters && Array.isArray(data) && data.length > 0 && (
                    <tr className="bg-gray-100 dark:bg-slate-900/50">
                      {hasActionCol && (
                        <th
                          className="sticky left-0 z-20 bg-gray-100 dark:bg-slate-900/50 border-r border-b border-gray-200 dark:border-slate-700"
                          style={{
                            width: ACTION_COL_WIDTH,
                            minWidth: ACTION_COL_WIDTH,
                            maxWidth: ACTION_COL_WIDTH,
                          }}
                        />
                      )}

                      {visibleCols.map((col) => (
                        <th
                          key={`filter-${col.key}`}
                          style={getCellWidthStyle(col)}
                          className="px-1 py-1 border-b border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-900/50"
                        >
                          <input
                            type="text"
                            value={filters[col.key] || ""}
                            onChange={(e) => {
                              setFilters((prev) => ({
                                ...prev,
                                [col.key]: e.target.value,
                              }));
                              setCurrentPage(1);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            placeholder="Filter..."
                            className="w-full h-7 px-2 rounded border border-gray-300 dark:border-slate-600 text-[10px] font-normal text-gray-700 dark:text-slate-300 outline-none focus:ring-1 focus:ring-blue-300 bg-white dark:bg-slate-800"
                          />
                        </th>
                      ))}
                    </tr>
                  )}
                </thead>

                <tbody className="bg-white dark:bg-slate-900">
                  {displayRows.map((row, idx) => {
                    // Group Headers
                    if (row.isGroup) {
                      const uid = `${row.key}:${row.value}:${row.level}`;
                      return (
                        <tr
                          key={uid}
                          className="bg-gray-100 dark:bg-slate-800 border-b dark:border-slate-700 cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                          onClick={() => {
                            setAutoExpandGroups(false);
                            setExpandedGroups((p) => ({
                              ...p,
                              [uid]: !p[uid],
                            }));
                          }}
                        >
                          <td
                            colSpan={visibleCols.length + (hasActionCol ? 1 : 0)}
                            className="px-2 py-1 text-[11px] font-bold text-blue-800 dark:text-blue-300"
                          >
                            <div
                              className="flex items-center"
                              style={{ paddingLeft: row.level * 20 }}
                            >
                              <FontAwesomeIcon
                                icon={autoExpandGroups || expandedGroups[uid] ? faChevronDown : faChevronRight}
                                className="mr-2 text-gray-500 dark:text-gray-400"
                              />
                              <span className="text-gray-600 dark:text-gray-300 font-normal">
                                {columns.find((c) => c.key === row.key)?.label}:
                              </span>
                              <span className="ml-1 dark:text-white">{row.value}</span>
                              <span className="ml-2 bg-blue-200 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-[10px] px-2 rounded-full font-normal">
                                {row.count}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    // Subtotals
                    if (row.isSubtotal) {
                      return (
                        <tr
                          key={`sub-${idx}`}
                          className="bg-blue-50 dark:bg-blue-900/20 font-bold text-[10px] border-b dark:border-slate-700"
                        >
                          {hasActionCol && (
                            <td
                              className="sticky left-0 z-[5] bg-blue-50 dark:bg-slate-800 border-r dark:border-slate-700"
                              style={{
                                width: ACTION_COL_WIDTH,
                                minWidth: ACTION_COL_WIDTH,
                                maxWidth: ACTION_COL_WIDTH,
                              }}
                            />
                          )}

                          {visibleCols.map((col, i) => (
                            <td
                              key={col.key}
                              style={getCellWidthStyle(col)}
                              className="px-2 py-1 text-right dark:text-slate-200"
                            >
                              {i === 0 && (
                                <span className="float-left text-gray-500 dark:text-gray-400 uppercase text-[10px] whitespace-nowrap">
                                  Subtotal: {row.label}
                                </span>
                              )}
                              <div className="truncate overflow-hidden whitespace-nowrap max-w-full">
                                {row.aggregates[col.key] !== undefined
                                  ? formatValue(row.aggregates[col.key], col)
                                  : ""}
                              </div>
                            </td>
                          ))}
                        </tr>
                      );
                    }

                    // Determine if drill-down is expanded
                    const isDrillDownExpanded = expandedRowKeys.includes(row[rowKey]);

                    return (
                      <React.Fragment key={idx}>
                        <tr
                          className={`hover:bg-blue-50 dark:hover:bg-slate-800 border-b dark:border-slate-700 transition-colors group ${
                            String(row?.status || "").toUpperCase() === "FAILED"
                              ? "text-red-600 dark:text-red-400"
                              : ""
                          } ${isDrillDownExpanded ? "bg-blue-50/80 dark:bg-slate-800" : ""}`}
                          onDoubleClick={() => onRowDoubleClick?.(row)}
                        >
                          {hasActionCol && (
                            <td
                              className={`sticky left-0 z-[5] group-hover:bg-blue-50 dark:group-hover:bg-slate-800 border-r border-gray-200 dark:border-slate-700 py-0 text-center ${isDrillDownExpanded ? "bg-blue-50/80 dark:bg-slate-800" : "bg-white dark:bg-slate-900"}`}
                              style={{
                                width: ACTION_COL_WIDTH,
                                minWidth: ACTION_COL_WIDTH,
                                maxWidth: ACTION_COL_WIDTH,
                              }}
                            >
                              <div className="flex items-center justify-center gap-1.5 h-6">
                                
                                {/* --- NATIVE CHEVRON RENDER --- */}
                                {renderDetailPanel && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (onRowExpand) onRowExpand(row);
                                    }}
                                    className={`inline-flex h-5 w-5 items-center justify-center rounded transition-colors ${
                                      isDrillDownExpanded
                                        ? "bg-blue-600 text-white shadow-inner"
                                        : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 hover:text-slate-800 dark:hover:text-slate-200"
                                    }`}
                                    title={isDrillDownExpanded ? "Collapse Details" : "Drill Down"}
                                  >
                                    <FontAwesomeIcon
                                      icon={faChevronDown}
                                      className={`text-[9px] transition-transform duration-200 ${
                                        isDrillDownExpanded ? "-rotate-180" : "rotate-0"
                                      }`}
                                    />
                                  </button>
                                )}

                                {onRowAction && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onRowAction?.(row);
                                    }}
                                    className="px-2 py-0.5 bg-blue-500 text-white rounded hover:bg-blue-600 transition leading-none shadow-sm"
                                    title="View"
                                  >
                                    <FontAwesomeIcon icon={faEye} className="w-2.5 h-3.5" />
                                  </button>
                                )}

                                {onRowActionsClick && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onRowActionsClick(row);
                                    }}
                                    className="px-2 py-0.5 bg-gray-500 text-white rounded hover:bg-gray-600 transition leading-none shadow-sm"
                                    title={actionsTitle || "Edit"}
                                  >
                                    <FontAwesomeIcon
                                      icon={actionsIcon || faPenToSquare}
                                      className="w-2.5 h-3.5"
                                    />
                                  </button>
                                )}
                              </div>
                            </td>
                          )}

                          {visibleCols.map((col) => (
                            <td
                              key={col.key}
                              style={getCellWidthStyle(col)}
                              className={`px-1.5 py-1 text-[11px] leading-tight whitespace-nowrap ${
                                  isRedRow(row) ? "text-red-600 dark:text-red-400" : "text-gray-700 dark:text-slate-300"
                                } ${
                                  col.renderType === "number" || col.renderType === "currency"
                                    ? "text-right tabular-nums"
                                    : "text-left"
                                }`}
                            >
                              <div className="truncate overflow-hidden whitespace-nowrap max-w-full">
                                {formatValue(row[col.key], col)}
                              </div>
                            </td>
                          ))}
                        </tr>
                        
                        {/* --- DRILL DOWN NESTED ROW --- */}
                        {renderDetailPanel && isDrillDownExpanded && (
                          <tr className="bg-slate-50 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700">
                            <td 
                              colSpan={visibleCols.length + (hasActionCol ? 1 : 0)} 
                              className="p-0"
                            >
                              {renderDetailPanel(row)}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>

                {filteredData.length > 0 && hasGrandTotalColumns && (
                  <tfoot className="sticky bottom-0 z-10 shadow-[0_-4px_6px_rgba(0,0,0,0.05)] bg-blue-100 dark:bg-slate-800 font-bold border-t border-blue-400 dark:border-blue-900">
                    <tr>
                      {hasActionCol && (
                        <td
                          className="sticky left-0 z-[5] bg-blue-100 dark:bg-slate-800 border-r border-gray-300 dark:border-slate-700"
                          style={{
                            width: ACTION_COL_WIDTH,
                            minWidth: ACTION_COL_WIDTH,
                            maxWidth: ACTION_COL_WIDTH,
                          }}
                        />
                      )}

                      {visibleCols.map((col, i) => (
                        <td
                          key={col.key}
                          style={getCellWidthStyle(col)}
                          className={`px-2 py-1.5 text-[11px] dark:text-slate-200 ${
                            col.renderType === "number" ||
                            col.renderType === "currency"
                              ? "text-right tabular-nums"
                              : "text-left"
                          }`}
                        >
                          {i === 0 && (
                            <span className="text-gray-800 dark:text-slate-300 uppercase tracking-wide">
                              Grand Total
                            </span>
                          )}
                          <div className="truncate overflow-hidden whitespace-nowrap max-w-full">
                            {grandTotals[col.key] !== undefined
                              ? formatValue(grandTotals[col.key], col)
                              : ""}
                          </div>
                        </td>
                      ))}
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </div>

        {pagination && (
          <div className="p-2 bg-white dark:bg-slate-800 border-t dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0">
            <div className="text-[11px] text-gray-500 dark:text-slate-400">
              Showing{" "}
              <span className="font-bold text-gray-800 dark:text-slate-200">
                {(safePage - 1) * rowsPerPage + 1}
              </span>
              –
              <span className="font-bold text-gray-800 dark:text-slate-200">
                {Math.min(safePage * rowsPerPage, totalItems)}
              </span>{" "}
              of <span className="font-bold text-gray-800 dark:text-slate-200">{totalItems}</span>{" "}
              items
            </div>

            <div className="flex items-center gap-2 flex-wrap justify-center">
              <select
                value={rowsPerPage === totalItems ? "all" : rowsPerPage}
                onChange={(e) => {
                  const val = e.target.value;
                  setRowsPerPage(val === "all" ? totalItems : Number(val));
                  setCurrentPage(1);
                }}
                className="h-8 border dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-[11px] text-slate-800 dark:text-slate-200 px-2 outline-none"
              >
                {[10, 20, 50, 100, 200, 500].map((n) => (
                  <option key={n} value={n}>
                    {n} / page
                  </option>
                ))}
                <option value="all">All</option>
              </select>

              <div className="flex items-center gap-1 text-slate-800 dark:text-slate-200">
                <button
                  disabled={safePage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="h-8 px-4 bg-gray-50 dark:bg-slate-700 border dark:border-slate-600 rounded text-[11px] hover:bg-blue-50 dark:hover:bg-slate-600 transition disabled:opacity-40"
                >
                  Prev
                </button>
                <span className="text-[11px] px-3 font-medium">
                  Page {safePage} of {totalPages}
                </span>
                <button
                  disabled={safePage >= totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="h-8 px-4 bg-gray-50 dark:bg-slate-700 border dark:border-slate-600 rounded text-[11px] hover:bg-blue-50 dark:hover:bg-slate-600 transition disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        <div
          ref={exportContainerRef}
          className="fixed top-[-9999px] left-[-9999px] bg-white p-5 w-[1200px]"
        >
          {/* ... Export component doesn't need dark mode as it generates files ... */}
          <h1 className="text-xl font-bold mb-4">{docType}</h1>

          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                {visibleCols.map((c) => (
                  <th key={c.key} className="border p-2 text-xs uppercase">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {fullRenderRows.map((row, i) => (
                <tr key={i}>
                  {visibleCols.map((col, idx) => (
                    <td key={col.key} className="border p-1 text-[10px]">
                      {row.isGroup
                        ? idx === 0
                          ? row.value
                          : ""
                        : formatValue(row[col.key], col)}
                    </td>
                  ))}
                </tr>
              ))}

              {hasGrandTotalColumns && (
                <tr className="bg-gray-50 font-bold">
                  {visibleCols.map((col, i) => (
                    <td key={col.key} className="border p-1 text-[10px]">
                      {i === 0
                        ? "Grand Total"
                        : grandTotals[col.key] !== undefined
                          ? formatValue(grandTotals[col.key], col)
                          : ""}
                    </td>
                  ))}
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <ExportFileNameModal
          isOpen={exportModal.isOpen}
          title={exportModal.title}
          defaultFileName={exportModal.defaultFileName}
          confirmText={exportModal.confirmText}
          onClose={closeExportModal}
          onConfirm={handleExportConfirm}
        />
      </div>
    );
  },
);

export default SearchGlobalReportTableDrilldown;
