import React, {
  useEffect,
  useMemo,
  useState,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSort,
  faSortUp,
  faSortDown,
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
} from "@fortawesome/free-solid-svg-icons";

import { reftables } from "@/NAYSA Cloud/Global/reftable";
import { exportGenericQueryExcel } from "@/NAYSA Cloud/Global/report";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import {
  formatNumber,
  parseFormattedNumber,
} from "@/NAYSA Cloud/Global/behavior.jsx";
import { useReturnToDate } from "@/NAYSA Cloud/Global/dates";
import Swal from "sweetalert2";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const TableLoader = () => (
  <div className="global-ref-norecords-ui">Loading...</div>
);

const parseAutoFillGrid = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false" || normalized === "") return false;
  }
  return false;
};

const SearchGlobalReferenceTable = forwardRef(
  (
    {
      columns = [],
      data = [],
      itemsPerPage = 50,
      showFilters = true,
      // ✅ ADDED: Background props to control UI visibility without user toggles
      showGlobalSearch = true, 
      showGroupBy = true,
      docType,
      onRowDoubleClick,
      onRowClick, // Added to ensure compatibility with parent components
      selectedRow, // Added to ensure compatibility with parent components
      className = "",
      initialState,
      onStateChange,
      totalExemptions = ["rate", "percent", "ratio", "id", "code"],
      isLoading = false,
      isFetching = false,
      onRefresh,
      tableSize = "Full",
      onMobileRowOpen,
      autoFillGrid: autoFillGridProp = undefined,
    },
    ref,
  ) => {
    const scrollRef = useRef(null);
    const exportContainerRef = useRef(null);

    const [isMobile, setIsMobile] = useState(false);
    const [forceTableView, setForceTableView] = useState(false);
    const useCardView = isMobile && !forceTableView;
    const [isMobileView, setIsMobileView] = useState(false);
    const [autoFillGrid, setAutoFillGrid] = useState(() =>
      parseAutoFillGrid(autoFillGridProp ?? initialState?.autoFillGrid),
    );

    useEffect(() => {
      if (autoFillGridProp !== undefined) {
        setAutoFillGrid(parseAutoFillGrid(autoFillGridProp));
      }
    }, [autoFillGridProp]);

    useEffect(() => {
      const checkSmall = () => setIsMobileView(window.innerWidth < 640);
      checkSmall();

      window.addEventListener("resize", checkSmall);
      return () => window.removeEventListener("resize", checkSmall);
    }, []);

    useEffect(() => {
      const mq = window.matchMedia("(max-width: 768px)");
      const apply = () => setIsMobile(mq.matches);
      apply();
      mq.addEventListener?.("change", apply);
      return () => mq.removeEventListener?.("change", apply);
    }, []);

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

    const [rowsPerPage, setRowsPerPage] = useState(() => {
      const init = Number(initialState?.itemsPerPage ?? itemsPerPage ?? 50);
      return Number.isFinite(init) ? init : 50;
    });

    const [columnOrder, setColumnOrder] = useState([]);
    const [groupBy, setGroupBy] = useState(() => initialState?.groupBy || []);
    const [expandedGroups, setExpandedGroups] = useState({});
    const [draggedCol, setDraggedCol] = useState(null);

    const [colWidths, setColWidths] = useState({});
    const [manualResizedCols, setManualResizedCols] = useState({});
    const resizingRef = useRef(null);

    const [userHiddenCols, setUserHiddenCols] = useState(
      () => initialState?.userHiddenCols || [],
    );

    const [showColumnChooser, setShowColumnChooser] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);

    const { companyInfo, currentUserRow } = useAuth();

    const isInitialLoading = isLoading && (!data || data.length === 0);

    useEffect(() => {
      const keys = (columns || []).map((c) => c.key).filter(Boolean);
      if (!keys.length) return;

      setColumnOrder((prev) => {
        const prevArr = Array.isArray(prev) ? prev : [];
        const prevSet = new Set(prevArr);

        const kept = prevArr.filter((k) => keys.includes(k));
        const added = keys.filter((k) => !prevSet.has(k));

        if (kept.length === prevArr.length && added.length === 0) return prevArr;
        return [...kept, ...added];
      });
    }, [columns]);

    useEffect(() => {
      onStateChange?.({
        filters,
        sortConfig,
        currentPage,
        groupBy,
        userHiddenCols,
        itemsPerPage: rowsPerPage,
        globalSearch,
        autoFillGrid: autoFillGrid ? "True" : "False",
      });
    }, [
      filters,
      sortConfig,
      currentPage,
      groupBy,
      userHiddenCols,
      rowsPerPage,
      globalSearch,
      autoFillGrid,
      onStateChange,
    ]);

    useEffect(() => {
      if (!data || data.length === 0) {
        if (groupBy.length > 0) setGroupBy([]);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data]);

    useEffect(() => {
      const onDown = (e) => {
        const t = e.target;
        if (!t.closest?.("[data-sgrt-export]")) setShowExportMenu(false);
        if (!t.closest?.("[data-sgrt-cols]")) setShowColumnChooser(false);
      };
      document.addEventListener("mousedown", onDown);
      document.addEventListener("touchstart", onDown, { passive: true });
      return () => {
        document.removeEventListener("mousedown", onDown);
        document.removeEventListener("touchstart", onDown);
      };
    }, []);

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

    const extractTextFromNode = (node) => {
      if (node === null || node === undefined || typeof node === "boolean")
        return "";
      if (typeof node === "string" || typeof node === "number")
        return String(node);
      if (Array.isArray(node)) {
        return node
          .map(extractTextFromNode)
          .filter(Boolean)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
      }
      if (React.isValidElement(node)) {
        return extractTextFromNode(node.props?.children);
      }
      return "";
    };

    const getCellDisplayText = (row, col) => {
      if (!col) return "";

      if (typeof col.render === "function") {
        const rendered = col.render(row);
        const extracted = extractTextFromNode(rendered);
        if (extracted) return extracted;
      }

      return formatValue(row?.[col.key], col);
    };

    const orderedCols = useMemo(() => {
      if (columnOrder.length === 0) return columns;
      return columnOrder.map((key) => columns.find((c) => c.key === key)).filter(Boolean);
    }, [columns, columnOrder]);

    const baseVisibleColumns = useMemo(
      () => orderedCols.filter((c) => !c.hidden),
      [orderedCols],
    );

    const effectiveGroupBy = isMobile ? [] : groupBy;
    const isGroupedView = effectiveGroupBy.length > 0;
    const groupedKeysSet = useMemo(
      () => new Set(effectiveGroupBy),
      [effectiveGroupBy],
    );

    const visibleCols = useMemo(
      () =>
        baseVisibleColumns.filter(
          (c) => !userHiddenCols.includes(c.key) && !groupedKeysSet.has(c.key),
        ),
      [baseVisibleColumns, userHiddenCols, groupedKeysSet],
    );

    const isActionColumn = (c) =>
      c?.key === "__actions" ||
      c?.renderType === "actions" ||
      String(c?.label || "").toLowerCase() === "actions";

    const exportVisibleCols = useMemo(
      () => visibleCols.filter((c) => !isActionColumn(c)),
      [visibleCols],
    );

    const exportColumns = useMemo(
      () => (columns || []).filter((c) => !isActionColumn(c)),
      [columns],
    );

    const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

    const estimatePx = (text) => {
      const s = String(text ?? "");
      return s.length * 7 + 40;
    };

    const headerCellWrap = "w-full min-w-0 whitespace-normal break-words";
    const hasActionCol = useMemo(
      () => visibleCols.some((c) => isActionColumn(c)),
      [visibleCols],
    );

    const handleColDragStart = (e, key) => {
      setDraggedCol(key);
      e.dataTransfer.effectAllowed = "move";
    };

    const handleColDrop = (e, targetKey, isDropZone = false) => {
      e.preventDefault();
      if (!draggedCol) return;

      if (isDropZone) {
        const draggedColDef = columns.find((c) => c.key === draggedCol);

        if (isActionColumn(draggedColDef)) {
          setDraggedCol(null);
          return;
        }

        setGroupBy((prev) => (prev.includes(draggedCol) ? prev : [...prev, draggedCol]));
      } else {
        if (groupBy.includes(draggedCol)) return;
        if (draggedCol === targetKey) return;

        const newOrder = [...columnOrder];
        const oldIdx = newOrder.indexOf(draggedCol);
        const newIdx = newOrder.indexOf(targetKey);

        if (oldIdx > -1 && newIdx > -1) {
          newOrder.splice(oldIdx, 1);
          newOrder.splice(newIdx, 0, draggedCol);
          setColumnOrder(newOrder);
        }
      }

      setDraggedCol(null);
    };

    const handleSort = useCallback((key, sortable) => {
      if (sortable === false) return;
      setSortConfig((prev) => {
        if (prev.key === key) {
          if (prev.direction === "asc") return { key, direction: "desc" };
          if (prev.direction === "desc") return { key: null, direction: null };
        }
        return { key, direction: "asc" };
      });
      setCurrentPage(1);
    }, []);

    const filteredData = useMemo(() => {
      const active = Object.entries(filters).filter(
        ([, v]) => String(v || "").trim() !== "",
      );
      let rows = Array.isArray(data) ? data : [];

      if (active.length) {
        rows = rows.filter((r) =>
          active.every(([k, v]) =>
            String(r?.[k] ?? "").toLowerCase().includes(String(v).toLowerCase()),
          ),
        );
      }

      const q = String(globalSearch || "").trim().toLowerCase();
      if (q) {
        const keys = (visibleCols || []).map((c) => c.key).filter(Boolean);

        rows = rows.filter((r) =>
          keys.some((k) => String(r?.[k] ?? "").toLowerCase().includes(q)),
        );
      }

      if (sortConfig?.key && sortConfig?.direction) {
        const { key, direction } = sortConfig;
        const col = columns.find((c) => c.key === key);
        const isNumeric =
          col?.renderType === "number" || col?.renderType === "currency";
        const norm = (val) =>
          isNumeric ? parseNumber(val) || 0 : String(val ?? "").toLowerCase();

        rows = [...rows].sort((a, b) => {
          const A = norm(a?.[key]);
          const B = norm(b?.[key]);
          const cmp = isNumeric
            ? A - B
            : String(A).localeCompare(String(B), undefined, { numeric: true });
          return direction === "asc" ? cmp : -cmp;
        });
      }

      return rows.map((row) => {
        const cleanRow = { ...row };
        delete cleanRow.isGroup;
        delete cleanRow.children;
        return cleanRow;
      });
    }, [data, filters, globalSearch, visibleCols, sortConfig, columns]);

    const autoColWidths = useMemo(() => {
      const MIN = 60;
      const MAX = 400;
      const SAMPLE = 80;

      const sampleRows = (Array.isArray(filteredData) ? filteredData : []).slice(0, SAMPLE);
      const out = {};

      visibleCols.forEach((col) => {
        let w = estimatePx(col.label || "");

        for (const r of sampleRows) {
          let str = "";

          if (col.autoWidthValue) {
            str = String(col.autoWidthValue(r) ?? "");
          } else if (typeof col.render === "function") {
            str = String(r?.[col.key] ?? "");
          } else {
            str = String(formatValue(r?.[col.key], col) ?? "");
          }

          w = Math.max(w, estimatePx(str));
        }

        const colBase = Number(col.width);
        if (Number.isFinite(colBase)) w = Math.max(w, colBase);

        out[col.key] = clamp(w, MIN, MAX);
      });

      return out;
    }, [visibleCols, filteredData]);

    const getColWidth = (col) => {
      const manualWidth = colWidths[col.key];
      const isManual = manualResizedCols[col.key];
      const autoWidth = autoColWidths[col.key];
      const defaultWidth = col.width || 140;

      if (isManual && manualWidth) return manualWidth;
      return autoWidth || defaultWidth;
    };

    const getStickyLeftOffset = (index) => {
      if (index <= 0) return 0;

      let offset = 0;
      for (let i = 0; i < index; i++) {
        const prevCol = visibleCols[i];
        offset += prevCol ? getColWidth(prevCol) : 140;
      }
      return offset;
    };

    const shouldSumColumn = (col) => {
      const noTotalKeys = ["unitcost", "currrate", "unitprice", "runbal"];
      if (!col) return false;

      const key = String(col.key ?? "").toLowerCase();
      const label = String(col.label ?? "").toLowerCase();

      if (noTotalKeys.includes(key)) return false;
      if (col.renderType !== "number" && col.renderType !== "currency") return false;

      if (totalExemptions.some((ex) => label.includes(ex) || key.includes(ex))) {
        return false;
      }

      return true;
    };

    const calculateAggregates = (rows) => {
      const sums = {};
      exportVisibleCols.forEach((col) => {
        if (shouldSumColumn(col)) {
          sums[col.key] = (rows || []).reduce(
            (acc, r) => acc + (parseNumber(r?.[col.key]) || 0),
            0,
          );
        }
      });
      return sums;
    };

    const resolveGroupDisplayValue = useCallback(
      (row, groupKey) => {
        const groupedCol = columns.find((c) => c.key === groupKey);
        if (!groupedCol) return String(row?.[groupKey] ?? "(Blank)");

        const labelKeyCandidates = [
          groupedCol.groupDisplayKey,
          groupedCol.displayKey,
          groupedCol.nameKey,
          groupKey.endsWith("_code") ? groupKey.replace(/_code$/i, "_name") : null,
          groupKey.endsWith("Code") ? groupKey.replace(/Code$/i, "Name") : null,
          groupKey.endsWith("code") ? groupKey.replace(/code$/i, "name") : null,
        ].filter(Boolean);

        for (const candidate of labelKeyCandidates) {
          const candidateValue = row?.[candidate];
          if (
            candidateValue !== undefined &&
            candidateValue !== null &&
            String(candidateValue).trim() !== ""
          ) {
            return String(candidateValue);
          }
        }

        if (typeof groupedCol.groupDisplayValue === "function") {
          const customValue = groupedCol.groupDisplayValue(row);
          if (
            customValue !== undefined &&
            customValue !== null &&
            String(customValue).trim() !== ""
          ) {
            return String(customValue);
          }
        }

        const rendered = getCellDisplayText(row, groupedCol);
        if (rendered && String(rendered).trim() !== "") return String(rendered);

        return String(row?.[groupKey] ?? "(Blank)");
      },
      [columns],
    );

    function getGroupNodeId(node) {
      return node?.path || `${node.key}-${node.rawValue ?? node.value}-${node.level}`;
    }

    const groupData = (rows, level = 0, activeGroupBy = [], parentPath = "") => {
      if (level >= activeGroupBy.length) return rows.map((r) => ({ ...r }));

      const groupKey = activeGroupBy[level];
      const groups = {};

      rows.forEach((row) => {
        const rawValue = String(row?.[groupKey] ?? "(Blank)");
        const displayValue = resolveGroupDisplayValue(row, groupKey) || "(Blank)";
        const bucketKey = `${rawValue}|||${displayValue}`;

        if (!groups[bucketKey]) {
          groups[bucketKey] = {
            rawValue,
            displayValue,
            rows: [],
          };
        }

        groups[bucketKey].rows.push(row);
      });

      return Object.values(groups)
        .sort((a, b) =>
          String(a.displayValue).localeCompare(String(b.displayValue), undefined, {
            numeric: true,
          }),
        )
        .map((group) => {
          const nodePath = parentPath
            ? `${parentPath}__${groupKey}:${group.rawValue}`
            : `${groupKey}:${group.rawValue}`;

          return {
            isGroup: true,
            key: groupKey,
            rawValue: group.rawValue,
            value: group.displayValue,
            level,
            path: nodePath,
            children: groupData(group.rows, level + 1, activeGroupBy, nodePath),
            count: group.rows.length,
            aggregates: calculateAggregates(group.rows),
          };
        });
    };

    const buildExpandedExportRows = (nodes) => {
      const firstKey = exportVisibleCols?.[0]?.key;
      const out = [];

      const walk = (arr) => {
        (arr || []).forEach((node) => {
          if (node?.isGroup) {
            const headerRow = {};
            exportColumns.forEach((c) => (headerRow[c.key] = ""));
            if (firstKey) {
              const label = columns.find((c) => c.key === node.key)?.label || node.key;
              headerRow[firstKey] = `${label}: ${node.value} (${node.count})`;
            }
            out.push(headerRow);

            const uniqueId = getGroupNodeId(node);
            if (expandedGroups[uniqueId]) walk(node.children);
          } else {
            const clean = { ...node };
            delete clean.isGroup;
            delete clean.isSubtotal;
            delete clean.children;
            delete clean.aggregates;
            out.push(clean);
          }
        });
      };

      walk(nodes);
      return out;
    };

    const processRenderList = (nodes, activeGroupBy = []) => {
      let list = [];
      nodes.forEach((node) => {
        if (node.isGroup) {
          list.push(node);
          const uniqueId = getGroupNodeId(node);
          if (expandedGroups[uniqueId]) {
            if (node.level === activeGroupBy.length - 1) list = list.concat(node.children);
            else list = list.concat(processRenderList(node.children, activeGroupBy));
          }
        } else {
          list.push(node);
        }
      });
      return list;
    };

    const groupedStructure = useMemo(() => {
      if (effectiveGroupBy.length === 0) return filteredData;
      return groupData(filteredData, 0, effectiveGroupBy);
    }, [filteredData, effectiveGroupBy, resolveGroupDisplayValue]);

    const fullRenderRows = useMemo(() => {
      if (effectiveGroupBy.length === 0) return filteredData;

      const expandAll = (nodes) => {
        let list = [];
        nodes.forEach((node) => {
          if (node.isGroup) {
            list.push(node);
            if (node.level === effectiveGroupBy.length - 1) list = list.concat(node.children);
            else list = list.concat(expandAll(node.children));
          } else {
            list.push(node);
          }
        });
        return list;
      };

      return expandAll(groupedStructure);
    }, [filteredData, groupedStructure, effectiveGroupBy]);

    const effectiveRowsPerPage = isMobileView ? 0 : rowsPerPage;

    const totalItems =
      effectiveGroupBy.length > 0 ? groupedStructure.length : filteredData.length;

    const totalPages =
      effectiveRowsPerPage > 0
        ? Math.max(1, Math.ceil(totalItems / effectiveRowsPerPage))
        : 1;

    const safePage = isMobileView
      ? 1
      : Math.min(Math.max(1, currentPage), totalPages);

    useEffect(() => {
      if (isMobileView) {
        if (currentPage !== 1) setCurrentPage(1);
        return;
      }

      if (currentPage > totalPages && totalPages > 0) setCurrentPage(totalPages);
      else if (currentPage < 1 && totalPages > 0) setCurrentPage(1);
    }, [currentPage, totalPages, isMobileView]);

    const displayRows = useMemo(() => {
      const start =
        effectiveRowsPerPage > 0 ? (safePage - 1) * effectiveRowsPerPage : 0;

      if (effectiveGroupBy.length === 0) {
        return effectiveRowsPerPage > 0
          ? filteredData.slice(start, start + effectiveRowsPerPage)
          : filteredData;
      }

      const pagedGroups =
        effectiveRowsPerPage > 0
          ? groupedStructure.slice(start, start + effectiveRowsPerPage)
          : groupedStructure;

      return processRenderList(pagedGroups, effectiveGroupBy);
    }, [
      safePage,
      effectiveRowsPerPage,
      filteredData,
      groupedStructure,
      expandedGroups,
      effectiveGroupBy,
    ]);

    const grandTotals = useMemo(() => ({}), []);
    const hasDataFiltered = Array.isArray(filteredData) && filteredData.length > 0;
    const hasOriginalData = Array.isArray(data) && data.length > 0;

    const collectGroupKeys = (nodes) => {
      const keys = [];

      const walk = (arr) => {
        (arr || []).forEach((n) => {
          if (n?.isGroup) {
            keys.push(getGroupNodeId(n));
            if (Array.isArray(n.children) && n.children.length > 0) {
              walk(n.children);
            }
          }
        });
      };

      walk(nodes);
      return keys;
    };

    const allGroupKeys = useMemo(() => {
      if (effectiveGroupBy.length === 0) return [];
      return collectGroupKeys(groupedStructure);
    }, [groupedStructure, effectiveGroupBy]);

    const prevGroupKeysRef = useRef([]);

    const allExpanded =
      allGroupKeys.length > 0 && allGroupKeys.every((key) => expandedGroups[key]);

    useEffect(() => {
      if (isMobile || effectiveGroupBy.length === 0) {
        prevGroupKeysRef.current = [];
        setExpandedGroups({});
        setCurrentPage(1);
        return;
      }

      setExpandedGroups((prev) => {
        const prevKeys = prevGroupKeysRef.current || [];
        const wasAllExpanded =
          prevKeys.length > 0 && prevKeys.every((key) => prev[key]);

        let nextState = {};

        if (wasAllExpanded) {
          nextState = Object.fromEntries(allGroupKeys.map((key) => [key, true]));
        } else {
          nextState = Object.fromEntries(
            allGroupKeys.filter((key) => prev[key]).map((key) => [key, true]),
          );
        }

        prevGroupKeysRef.current = allGroupKeys;
        return nextState;
      });

      setCurrentPage(1);
    }, [isMobile, effectiveGroupBy, allGroupKeys]);

    const toggleGroup = (node) => {
      const uniqueId = getGroupNodeId(node);
      setExpandedGroups((prev) => ({
        ...prev,
        [uniqueId]: !prev[uniqueId],
      }));
    };

    const toggleAll = (expand) => {
      if (!expand) {
        setExpandedGroups({});
        return;
      }

      setExpandedGroups(Object.fromEntries(allGroupKeys.map((key) => [key, true])));
    };

    const handleToggleExpandCollapse = () => {
      toggleAll(!allExpanded);
    };

    const handleRemoveGroup = (gKey) => {
      setGroupBy((prev) => prev.filter((k) => k !== gKey));
      setExpandedGroups((prev) => {
        const next = { ...prev };

        Object.keys(next).forEach((key) => {
          if (key.startsWith(`${gKey}:`) || key.includes(`__${gKey}:`)) {
            delete next[key];
          }
        });

        return next;
      });
      setCurrentPage(1);
    };

    const handleRemoveAllGroups = () => {
      setGroupBy([]);
      setExpandedGroups({});
      setCurrentPage(1);
      setUserHiddenCols((prev) => prev.filter((k) => !groupBy.includes(k)));
    };

    const handleMouseMove = useCallback((e) => {
      if (!resizingRef.current) return;

      const { startX, startWidth, key } = resizingRef.current;
      const delta = e.clientX - startX;
      const newWidth = Math.max(60, startWidth + delta);

      setColWidths((prev) => ({ ...prev, [key]: newWidth }));
      setManualResizedCols((prev) => ({ ...prev, [key]: true }));
    }, []);

    const handleMouseUp = useCallback(() => {
      if (!resizingRef.current) return;
      resizingRef.current = null;
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    }, [handleMouseMove]);

    const startResizing = (e, key) => {
      e.preventDefault();
      e.stopPropagation();
      const th = e.currentTarget?.parentElement;
      const currentWidth =
        th?.offsetWidth ||
        colWidths[key] ||
        Number(columns.find((c) => c.key === key)?.width) ||
        140;

      resizingRef.current = { startX: e.clientX, startWidth: currentWidth, key };
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
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

    const getDefaultExportFileName = () => {
      const effectiveDocType = String(docType ?? "").trim();
      const title = reftables?.[effectiveDocType] || effectiveDocType || "Reference";
      return sanitizeFileName(`${title}_${getDateTimeStamp()}`);
    };

    const handleExportExcel = async () => {
      if (!hasDataFiltered) return;

      const defaultFileName = getDefaultExportFileName();
      const { value: fileName } = await Swal.fire({
        input: "text",
        inputLabel: "Export Excel File Name:",
        inputValue: defaultFileName,
        width: "400px",
        showCancelButton: true,
        confirmButtonText: "Export",
        inputValidator: (value) =>
          !value || value.trim() === "" ? "File name cannot be empty!" : null,
      });
      if (!fileName) return;

      const exportData =
        effectiveGroupBy.length > 0 ? buildExpandedExportRows(groupedStructure) : filteredData;

      const normalizedExportData = exportData.map((row) => {
        const out = {};
        exportVisibleCols.forEach((col) => {
          out[col.key] = row?.isGroup ? row[col.key] ?? "" : getCellDisplayText(row, col);
        });
        return out;
      });

      await exportGenericQueryExcel(
        normalizedExportData,
        grandTotals,
        exportVisibleCols,
        [],
        exportColumns,
        {},
        7,
        fileName,
        currentUserRow?.userName,
        companyInfo?.compName,
        companyInfo?.compAddr,
        companyInfo?.telNo,
      );
    };

    const handleExportCsv = async () => {
      if (!hasDataFiltered) return;

      const defaultFileName = getDefaultExportFileName();
      const { value: fileName } = await Swal.fire({
        input: "text",
        inputLabel: "Export CSV File Name:",
        inputValue: defaultFileName,
        width: "400px",
        showCancelButton: true,
        confirmButtonText: "Export CSV",
        inputValidator: (value) =>
          !value || value.trim() === "" ? "File name cannot be empty!" : null,
      });
      if (!fileName) return;

      const headerRow = exportVisibleCols
        .map((col) => {
          let header = String(col.label ?? "");
          header = header.replace(/,/g, "");
          header = header.toUpperCase().replace(/\s+/g, "_");
          const escaped = header.replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(",");

      const csvLines = [headerRow];
      const csvRows = effectiveGroupBy.length === 0 ? filteredData : fullRenderRows;

      csvRows.forEach((row) => {
        const line = exportVisibleCols
          .map((col, idx) => {
            let formatted = "";

            if (row?.isGroup) {
              formatted =
                idx === 0
                  ? `${columns.find((c) => c.key === row.key)?.label}: ${row.value} (${row.count})`
                  : "";
            } else {
              formatted = getCellDisplayText(row, col);
            }

            const noCommas = String(formatted ?? "").replace(/,/g, "");
            const escaped = noCommas.replace(/"/g, '""');
            return `"${escaped}"`;
          })
          .join(",");
        csvLines.push(line);
      });

      const blob = new Blob([csvLines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${fileName}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    };

    const handleExportPdf = async () => {
      if (!hasDataFiltered || !exportContainerRef.current) return;

      const defaultFileName = getDefaultExportFileName();
      const { value: fileName } = await Swal.fire({
        input: "text",
        inputLabel: "Export PDF File Name:",
        inputValue: defaultFileName,
        width: "400px",
        showCancelButton: true,
        confirmButtonText: "Export PDF",
        inputValidator: (value) =>
          !value || value.trim() === "" ? "File name cannot be empty!" : null,
      });
      if (!fileName) return;

      const canvas = await html2canvas(exportContainerRef.current, {
        scale: 2,
        useCORS: true,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("l", "mm", "a4");

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const ratio = Math.min(pdfWidth / canvas.width, pdfHeight / canvas.height);

      const imgWidth = canvas.width * ratio;
      const imgHeight = canvas.height * ratio;
      const x = (pdfWidth - imgWidth) / 2;
      const y = (pdfHeight - imgHeight) / 2;

      pdf.addImage(imgData, "PNG", x, y, imgWidth, imgHeight);
      pdf.save(`${fileName}.pdf`);
    };

    const handleExportImage = async () => {
      if (!hasDataFiltered || !exportContainerRef.current) return;

      const defaultFileName = getDefaultExportFileName();
      const { value: fileName } = await Swal.fire({
        input: "text",
        inputLabel: "Export Image File Name:",
        inputValue: defaultFileName,
        width: "400px",
        showCancelButton: true,
        confirmButtonText: "Export Image",
        inputValidator: (value) =>
          !value || value.trim() === "" ? "File name cannot be empty!" : null,
      });
      if (!fileName) return;

      const canvas = await html2canvas(exportContainerRef.current, {
        scale: 2,
        useCORS: true,
      });
      const imgData = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = imgData;
      link.download = `${fileName}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    useImperativeHandle(ref, () => ({
      getState: () => ({
        filters,
        sortConfig,
        currentPage: safePage,
        groupBy,
        userHiddenCols,
        itemsPerPage: rowsPerPage,
        globalSearch,
        autoFillGrid: autoFillGrid ? "True" : "False",
      }),
      setAutoFillGrid: (value) => setAutoFillGrid(parseAutoFillGrid(value)),
      scrollRef,
      clearAllState: () => {
        setFilters({});
        setSortConfig({ key: null, direction: null });
        setGroupBy([]);
        setExpandedGroups({});
        setCurrentPage(1);
        setUserHiddenCols([]);
        setRowsPerPage(Number(itemsPerPage) || 50);
        setGlobalSearch("");
        setAutoFillGrid(parseAutoFillGrid(autoFillGridProp ?? initialState?.autoFillGrid));
      },
      resetFilters: () => setFilters({}),
      clearSort: () => setSortConfig({ key: null, direction: null }),
      goToPage: (p) => setCurrentPage(Math.max(1, Number(p) || 1)),
      setCardView: (on) => setForceTableView(!on),
    }));

    const allChooserKeys = baseVisibleColumns.map((c) => c.key);
    const allChecked = userHiddenCols.length === 0;
    const toggleSelectAll = () => {
      if (allChecked) setUserHiddenCols(allChooserKeys);
      else setUserHiddenCols([]);
    };

    const handleRowOpen = (row) => {
      if (isMobile) {
        onMobileRowOpen?.(row);
      } else {
        onRowDoubleClick?.(row);
      }
    };

    const filterInputClass =
      "w-full min-w-0 px-2 py-1 text-[11px] rounded-md border border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-300";

    const renderMobileCard = (row, idx) => {
      if (row?.isGroup) {
        const uniqueId = getGroupNodeId(row);
        const isExpanded = expandedGroups[uniqueId];

        return (
          <div
            key={`g-${uniqueId}`}
            className="rounded-lg border bg-gray-100 p-4 cursor-pointer"
            onClick={() => toggleGroup(row)}
          >
            <div className="flex items-center">
              <FontAwesomeIcon
                icon={isExpanded ? faChevronDown : faChevronRight}
                className="mr-2 text-gray-500"
              />
              <span className="mr-2 text-gray-600">
                {columns.find((c) => c.key === row.key)?.label}:
              </span>
              <span className="mr-2 font-bold">{row.value}</span>
              <span className="bg-blue-200 text-blue-800 text-[10px] px-2 rounded-full">
                {row.count}
              </span>
            </div>
          </div>
        );
      }

      const firstCols = visibleCols.slice(0, 4);
      const otherCols = visibleCols.slice(4);
      const isSelected = selectedRow && row && (selectedRow.id === row.id || selectedRow.key === row.key);

      return (
        <div
          key={row.__idx ?? idx}
          className={`rounded-lg border shadow-sm p-3 cursor-pointer active:scale-[0.99] transition ${
            isSelected ? "bg-blue-50 border-blue-200" : "bg-white"
          }`}
          onClick={() => {
            if (onRowClick) onRowClick(row);
            handleRowOpen(row);
          }}
        >
          <div className="space-y-1">
            {firstCols.map((col) => (
              <div
                key={col.key}
                className={`flex items-start justify-between gap-1 ${
                  col.key === "__actions" ? "flex-col items-stretch mb-2" : ""
                }`}
              >
                <span
                  className={`text-[10px] font-semibold text-gray-600 ${
                    col.key === "__actions" ? "min-w-0 mb-1" : "min-w-[110px]"
                  }`}
                >
                  {col.label}
                </span>
                <div className="text-[10px] text-gray-800 text-left break-words flex-1">
                  {typeof col.render === "function"
                    ? col.render(row)
                    : formatValue(row[col.key], col)}
                </div>
              </div>
            ))}

            {otherCols.length > 0 && (
              <div className="pt-2 border-t border-gray-100 space-y-1">
                {otherCols.map((col) => (
                  <div key={col.key} className="flex items-start justify-between gap-1">
                    <span className="text-[10px] font-semibold text-gray-600 min-w-[110px]">
                      {col.label}
                    </span>
                    <div
                      className={`text-[10px] text-gray-800 text-left break-words ${
                        col.key === "__actions" ? "w-full" : "flex-1"
                      }`}
                    >
                      {typeof col.render === "function"
                        ? col.render(row)
                        : formatValue(row[col.key], col)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    };

    return (
      <div
        className={[
          "global-tran-table-main-div-ui flex flex-col flex-1 min-h-[330px] overflow-hidden",
          className,
        ].join(" ")}
      >
        {hasOriginalData && (
          <div
            className="
              p-2 rounded-md
              flex flex-col md:flex-row md:items-center md:justify-between gap-2
            "
            onDragOver={(e) => {
              if (!isMobile) e.preventDefault();
            }}
            onDrop={(e) => {
              if (!isMobile) handleColDrop(e, null, true);
            }}
          >
            {/* GROUP BY SECTION (Controlled by background prop showGroupBy) */}
            {!isMobile && showGroupBy && (
              <div className="flex-1 flex flex-wrap gap-2 items-center min-w-0">
                {groupBy.length === 0 && (
                  <div
                    className={`text-gray-400 italic border border-dashed border-gray-300 rounded ${
                      tableSize === "Half"
                        ? "text-[8px] sm:text-[9px] w-18 px-2 py-1.5"
                        : "text-[10px] sm:text-xs px-8 py-2"
                    }`}
                  >
                    <FontAwesomeIcon icon={faLayerGroup} className="mr-1" />
                    Drag column here to Group by
                  </div>
                )}

                {groupBy.map((gKey) => (
                  <div
                    key={gKey}
                    className={`flex items-center bg-blue-100 text-blue-800 rounded border border-blue-200 max-w-full ${
                      tableSize === "Half"
                        ? "text-[10px] px-1.5 py-0.5"
                        : "text-xs px-2 py-1"
                    }`}
                  >
                    <span className="truncate">
                      {columns.find((c) => c.key === gKey)?.label}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleRemoveGroup(gKey)}
                      className="ml-2 text-blue-600 hover:text-red-600 shrink-0"
                      title="Remove group"
                    >
                      <FontAwesomeIcon icon={faTimes} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* CONTROLS SECTION (Right Side) */}
            <div className={`flex items-center gap-2 flex-wrap justify-end w-full md:w-auto ${!isMobile && showGroupBy ? "" : "ml-auto"}`}>
              
              {/* EXPAND/COLLAPSE ALL GROUPS */}
              {!isMobile && showGroupBy && groupBy.length > 0 && (
                <div className="flex items-center gap-2">
                  <label
                    className={`inline-flex items-center cursor-pointer select-none ${
                      tableSize === "Half" ? "h-7" : "h-9"
                    }`}
                    title={allExpanded ? "Collapse All" : "Expand All"}
                  >
                    <input
                      type="checkbox"
                      checked={allExpanded}
                      onChange={handleToggleExpandCollapse}
                      className="sr-only"
                    />

                    <div
                      className={`relative rounded-full transition-colors duration-200 ${
                        allExpanded ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-600"
                      } ${tableSize === "Half" ? "w-[78px] h-7" : "w-24 h-8"}`}
                    >
                      <span
                        className={`absolute rounded-full bg-white shadow-md transition-all duration-200 ${
                          allExpanded
                            ? tableSize === "Half"
                              ? "left-[48px]"
                              : "left-[66px]"
                            : "left-[2px]"
                        } ${tableSize === "Half" ? "top-[2px] w-6 h-6" : "top-[2px] w-7 h-7"}`}
                      />

                      <span
                        className={`absolute inset-0 flex items-center font-medium pointer-events-none transition-all duration-200 ${
                          tableSize === "Half" ? "text-[10px]" : "text-[11px]"
                        } ${
                          allExpanded
                            ? "justify-start pl-4 text-white"
                            : "justify-end pr-4 text-gray-700"
                        }`}
                      >
                        {allExpanded ? "Collapse" : "Expand"}
                      </span>
                    </div>
                  </label>

                  <button
                    type="button"
                    onClick={handleRemoveAllGroups}
                    className={`font-medium text-white bg-red-600 border rounded-md hover:bg-red-700 active:scale-[0.98] transition ${
                      tableSize === "Half"
                        ? "h-7 text-[10px] px-2 py-1"
                        : "h-8 text-xs px-3 py-1"
                    }`}
                    title="Remove All Groups"
                  >
                    <FontAwesomeIcon
                      icon={faTimes}
                      className={`mr-1 text-white ${
                        tableSize === "Half" ? "text-[10px]" : "text-sm"
                      }`}
                    />
                    Remove
                  </button>
                </div>
              )}

              {/* QUICK SEARCH (Controlled by background prop showGlobalSearch) */}
              {showGlobalSearch && (
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <input
                    type="text"
                    value={globalSearch}
                    onChange={(e) => {
                      setGlobalSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Quick Search..."
                    className={`w-full rounded-md border border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-300 ${
                      tableSize === "Half"
                        ? "h-7 md:w-24 px-2 text-[11px]"
                        : "h-8 md:w-64 px-3 text-xs"
                    }`}
                  />

                  {globalSearch?.trim() && (
                    <button
                      type="button"
                      className={`rounded-md bg-gray-200 hover:bg-gray-300 shrink-0 ${
                        tableSize === "Half" ? "h-7 px-2 text-[10px]" : "h-8 px-3 text-xs"
                      }`}
                      onClick={() => {
                        setGlobalSearch("");
                        setCurrentPage(1);
                      }}
                      title="Clear search"
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}

              {/* AUTO FIT SWITCH */}
              {!isMobile && (
                <label
                  className={`inline-flex items-center cursor-pointer select-none shrink-0 ${
                    tableSize === "Half" ? "h-7" : "h-8"
                  }`}
                  title={autoFillGrid ? "Disable auto fit" : "Enable auto fit"}
                >
                  <input
                    type="checkbox"
                    checked={autoFillGrid}
                    onChange={() => setAutoFillGrid((p) => !p)}
                    className="sr-only"
                  />

                  <div
                    className={`relative rounded-full transition-colors duration-200 ${
                      autoFillGrid ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-600"
                    } ${tableSize === "Half" ? "w-20 h-7" : "w-20 h-8"}`}
                  >
                    <span
                      className={`absolute top-[2px] rounded-full bg-white shadow-md transition-all duration-200 ${
                        autoFillGrid
                          ? tableSize === "Half"
                            ? "left-[55px]"
                            : "left-[50px]"
                          : "left-[2px]"
                      } ${tableSize === "Half" ? "w-6 h-6" : "w-7 h-7"}`}
                    />

                    <span
                      className={`absolute inset-0 flex items-center text-[11px] font-medium pointer-events-none transition-all duration-200 ${
                        autoFillGrid
                          ? "justify-start pl-2 text-white"
                          : "justify-end pr-2 text-gray-700"
                      }`}
                    >
                      Auto Fit
                    </span>
                  </div>
                </label>
              )}

              {/* REFRESH */}
              {onRefresh && (
                <div className="relative flex-1 md:flex-none min-w-[40px]">
                  <button
                    type="button"
                    onClick={onRefresh}
                    className={`w-full text-xs font-medium text-white bg-blue-600 border border-slate-300 rounded-md hover:bg-slate-50 hover:text-blue-600 active:scale-[0.98] transition flex items-center justify-center ${
                      tableSize === "Half" ? "h-7 px-2 py-1" : "h-8 px-3 py-2"
                    }`}
                    title="Refresh Data"
                  >
                    <FontAwesomeIcon
                      icon={faSyncAlt}
                      spin={isFetching}
                      className="mr-1 md:mr-0 lg:mr-1"
                    />
                    <span className={` ${tableSize === "Half" ? "inline lg:hidden" : "hidden lg:inline"}`}>Refresh</span>
                  </button>
                </div>
              )}

              {/* EXPORT */}
              <div className="relative flex-1 md:flex-none min-w-[80px]" data-sgrt-export>
                <button
                  type="button"
                  onClick={() => hasDataFiltered && setShowExportMenu((p) => !p)}
                  disabled={!hasDataFiltered}
                  className={`w-full text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 active:scale-[0.98] transition flex items-center justify-center ${
                    tableSize === "Half"
                      ? "h-7 md:w-38 px-3 py-1"
                      : "h-8 md:w-[80px] px-3 py-2"
                  }`}
                >
                  <FontAwesomeIcon icon={faFileExport} className="mr-1" />
                  Export
                </button>

                {showExportMenu && (
                  <div className="absolute right-0 mt-1 min-w-[80px] rounded-lg shadow-lg bg-white ring-1 ring-black/10 z-[60] overflow-hidden">
                    <button
                      type="button"
                      onClick={async () => {
                        setShowExportMenu(false);
                        await handleExportExcel();
                      }}
                      className={`flex items-center w-full text-left hover:bg-blue-50 transition-colors ${
                        tableSize === "Half" ? "h-7 text-xs px-2" : "h-8 text-sm px-4"
                      }`}
                    >
                      <FontAwesomeIcon
                        icon={faFileExcel}
                        className={`mr-2 text-green-600 ${
                          tableSize === "Half" ? "text-xs" : "text-sm"
                        }`}
                      />
                      Excel
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        setShowExportMenu(false);
                        await handleExportCsv();
                      }}
                      className={`flex items-center w-full text-left hover:bg-blue-50 transition-colors ${
                        tableSize === "Half" ? "h-7 text-xs px-2" : "h-8 text-sm px-4"
                      }`}
                    >
                      <FontAwesomeIcon
                        icon={faFileCsv}
                        className={`mr-2 text-emerald-600 ${
                          tableSize === "Half" ? "text-xs" : "text-sm"
                        }`}
                      />
                      CSV
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        setShowExportMenu(false);
                        await handleExportPdf();
                      }}
                      className={`flex items-center w-full text-left hover:bg-blue-50 transition-colors ${
                        tableSize === "Half" ? "h-7 text-xs px-2" : "h-8 text-sm px-4"
                      }`}
                    >
                      <FontAwesomeIcon
                        icon={faFilePdf}
                        className={`mr-2 text-red-600 ${
                          tableSize === "Half" ? "text-xs" : "text-sm"
                        }`}
                      />
                      PDF
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        setShowExportMenu(false);
                        await handleExportImage();
                      }}
                      className={`flex items-center w-full text-left hover:bg-blue-50 transition-colors ${
                        tableSize === "Half" ? "h-7 text-xs px-2" : "h-8 text-sm px-4"
                      }`}
                    >
                      <FontAwesomeIcon
                        icon={faFileImage}
                        className={`mr-2 text-blue-600 ${
                          tableSize === "Half" ? "text-xs" : "text-sm"
                        }`}
                      />
                      Image
                    </button>
                  </div>
                )}
              </div>

              {/* COLUMNS */}
              <div className="relative flex-1 md:flex-none min-w-[80px]" data-sgrt-cols>
                <button
                  type="button"
                  onClick={() => setShowColumnChooser((p) => !p)}
                  className={`w-full text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 active:scale-[0.98] transition flex items-center justify-center ${
                    tableSize === "Half"
                      ? "h-7 text-xs px-2 py-1"
                      : "h-8 text-sm px-3 py-2"
                  }`}
                >
                  <FontAwesomeIcon icon={faColumns} className="mr-1" />
                  Columns
                </button>

                {showColumnChooser && (
                  <div className="absolute right-0 mt-1 bg-white border rounded shadow-lg p-2 max-h-64 overflow-auto z-50 min-w-[240px]">
                    <div className="flex items-center justify-between text-[11px] font-semibold mb-1 border-b pb-1">
                      <span>Show / Hide Columns</span>
                      <label className="flex items-center gap-1 text-[11px]">
                        <input
                          type="checkbox"
                          className="h-3 w-3"
                          checked={allChecked}
                          onChange={toggleSelectAll}
                        />
                        <span>Select All</span>
                      </label>
                    </div>

                    {baseVisibleColumns.map((col) => (
                      <label
                        key={col.key}
                        className="flex items-center text-[11px] gap-2 mb-1"
                      >
                        <input
                          type="checkbox"
                          className="h-3 w-3"
                          checked={!userHiddenCols.includes(col.key)}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setUserHiddenCols((prev) =>
                              checked
                                ? prev.filter((k) => k !== col.key)
                                : [...prev, col.key],
                            );
                          }}
                        />
                        <span className="truncate">{col.label}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="global-tran-table-main-sub-div-ui flex flex-col flex-1 min-h-[481px] relative">
          {isInitialLoading ? (
            <TableLoader />
          ) : useCardView ? (
            <div className="flex-1 overflow-auto space-y-2 p-2">
              {displayRows.map((row, idx) => renderMobileCard(row, idx))}
            </div>
          ) : (
            <div
              ref={scrollRef}
              className={`flex-1 border border-gray-200 rounded-sm relative custom-scrollbar ${
                autoFillGrid ? "overflow-y-auto overflow-x-hidden" : "overflow-auto"
              }`}
            >
              <div className="text-[10px] text-gray-400 px-2 py-1 md:hidden">
                Tip: swipe left/right to see more columns
              </div>

              <table
                className={`global-tran-table-div-ui border-collapse ${
                  autoFillGrid ? "table-fixed w-full min-w-full" : "table-auto min-w-max w-max"
                }`}
              >
                <thead className="global-tran-thead-div-ui text-[11px] sticky top-0 z-30 bg-white">
                  <tr>
                    {visibleCols.map((col, index) => {
                      const isStickyLeft = index < 3;
                      const leftOffset = getStickyLeftOffset(index);
                      const colWidth = getColWidth(col);
                      const isManual = manualResizedCols[col.key];
                      const actionCol = isActionColumn(col);

                      return (
                        <th
                          key={col.key}
                          className={`global-tran-th-ui bg-blue-100 select-none relative ${
                            isStickyLeft ? "sticky z-40" : ""
                          } ${actionCol ? "cursor-default" : "cursor-pointer"} ${col.className || ""}`}
                          draggable={!isMobile && showGroupBy && !groupBy.includes(col.key) && !actionCol}
                          onDragStart={(e) => {
                            if (!isMobile && showGroupBy && !actionCol) handleColDragStart(e, col.key);
                          }}
                          onDragOver={(e) => {
                            if (!isMobile && showGroupBy) e.preventDefault();
                          }}
                          onDrop={(e) => {
                            if (!isMobile && showGroupBy) handleColDrop(e, col.key);
                          }}
                          onClick={() => handleSort(col.key, col.sortable)}
                          title={
                            !isMobile && showGroupBy && !actionCol
                              ? "Click to sort • Drag to reorder/group"
                              : col.sortable
                                ? "Click to sort"
                                : ""
                          }
                          style={{
                            ...(autoFillGrid && !isManual && !col.width
                              ? {}
                              : {
                                  width: `${colWidth}px`,
                                  minWidth: `${colWidth}px`,
                                  maxWidth: `${colWidth}px`,
                                }),
                            left: isStickyLeft ? `${leftOffset}px` : undefined,
                          }}
                        >
                          <div className="flex items-center justify-between gap-2 min-w-0">
                            <span className={headerCellWrap}>{col.label}</span>
                            {sortConfig.key === col.key ? (
                              <FontAwesomeIcon
                                icon={sortConfig.direction === "asc" ? faSortUp : faSortDown}
                              />
                            ) : (
                              <FontAwesomeIcon icon={faSort} className="opacity-30" />
                            )}
                          </div>

                          <div
                            className="absolute top-0 right-0 h-full w-2 cursor-col-resize select-none z-50"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              startResizing(e, col.key);
                            }}
                          />
                        </th>
                      );
                    })}
                  </tr>

                  {showFilters && hasOriginalData && (
                    <tr className="sticky top-[34px] z-20 bg-white">
                      {visibleCols.map((col, index) => {
                        const isStickyLeft = index < 3;
                        const leftOffset = getStickyLeftOffset(index);
                        const colWidth = getColWidth(col);
                        const isManual = manualResizedCols[col.key];

                        return (
                          <th
                            key={`f-${col.key}`}
                            className={`global-tran-th-ui px-1 py-1 bg-white ${
                              isStickyLeft ? "sticky z-30" : ""
                            }`}
                            style={{
                              ...(autoFillGrid && !isManual
                                ? {}
                                : {
                                    width: `${colWidth}px`,
                                    minWidth: `${colWidth}px`,
                                    maxWidth: `${colWidth}px`,
                                  }),
                              left: isStickyLeft ? `${leftOffset}px` : undefined,
                            }}
                          >
                            <input
                              className={filterInputClass}
                              placeholder="Filter..."
                              value={filters[col.key] || ""}
                              onChange={(e) => {
                                setFilters((p) => ({ ...p, [col.key]: e.target.value }));
                                setCurrentPage(1);
                              }}
                            />
                          </th>
                        );
                      })}
                    </tr>
                  )}
                </thead>

                <tbody>
                  {!hasDataFiltered ? (
                    <tr>
                      <td colSpan={visibleCols.length} className="global-ref-norecords-ui">
                        {Array.isArray(data) && data.length > 0 ? "No records found" : "No data"}
                      </td>
                    </tr>
                  ) : (
                    displayRows.map((row, idx) => {
                      if (isGroupedView && row.isGroup) {
                        const uniqueId = getGroupNodeId(row);
                        const isExpanded = expandedGroups[uniqueId];
                        return (
                          <tr
                            key={`g-${uniqueId}`}
                            className="global-tran-tr-ui bg-gray-100 cursor-pointer"
                            onClick={() => toggleGroup(row)}
                          >
                            <td
                              colSpan={visibleCols.length}
                              className="global-tran-td-ui font-semibold text-blue-900"
                            >
                              <div
                                className="flex items-center"
                                style={{ paddingLeft: row.level * 20 }}
                              >
                                <FontAwesomeIcon
                                  icon={isExpanded ? faChevronDown : faChevronRight}
                                  className="mr-2 text-gray-500"
                                />
                                <span className="mr-2 text-gray-600">
                                  {columns.find((c) => c.key === row.key)?.label}:
                                </span>
                                <span className="mr-2 font-bold">{row.value}</span>
                                <span className="bg-blue-200 text-blue-800 text-[10px] px-2 rounded-full">
                                  {row.count}
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <tr
                          key={row.__idx ?? idx}
                          className="global-tran-tr-ui hover:bg-gray-50 cursor-pointer"
                          onClick={() => {
                            if (onRowClick) onRowClick(row);
                            if (isMobile) handleRowOpen(row);
                          }}
                          onDoubleClick={() => {
                            if (!isMobile) handleRowOpen(row);
                          }}
                        >
                          {visibleCols.map((col, index) => {
                            const isStickyLeft = index < 3;
                            const leftOffset = getStickyLeftOffset(index);

                            return (
                              <td
                                key={col.key}
                                className={`global-tran-td-ui align-center bg-white ${
                                  isStickyLeft
                                    ? "sticky z-10 shadow-[-1px_0_0_0_rgba(229,231,235,1)]"
                                    : ""
                                } ${col.className || ""}`}
                                style={{
                                  width: getColWidth(col),
                                  minWidth: col.width ? col.width : autoFillGrid ? 120 : 90,
                                  left: isStickyLeft ? leftOffset : undefined,
                                }}
                              >
                                <div className="w-full whitespace-normal break-words">
                                  {typeof col.render === "function"
                                    ? col.render(row)
                                    : formatValue(row[col.key], col)}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {hasDataFiltered && !isMobileView && (
          <div
            className="
              border-t bg-white shrink-0
              px-3 py-2 sm:px-2
              flex flex-col gap-3
              lg:flex-row lg:items-center lg:justify-between
            "
          >
            <div className="text-[11px] sm:text-xs text-gray-600 text-center lg:text-left flex items-center justify-center lg:justify-start gap-2">
              <div>
                Showing{" "}
                <span className="font-semibold text-gray-900">
                  {effectiveRowsPerPage > 0 ? (safePage - 1) * effectiveRowsPerPage + 1 : 1}
                </span>
                –
                <span className="font-semibold text-gray-900">
                  {effectiveRowsPerPage > 0
                    ? Math.min(safePage * effectiveRowsPerPage, totalItems)
                    : totalItems}
                </span>{" "}
                of <span className="font-semibold text-gray-900">{totalItems}</span>
              </div>

              {isFetching && (
                <span className="text-[10px] text-blue-500 animate-pulse font-bold flex items-center gap-1 uppercase ml-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                  Syncing...
                </span>
              )}
            </div>

            <div
              className="
                flex flex-col sm:flex-row sm:flex-wrap
                items-stretch sm:items-center
                justify-center lg:justify-end
                gap-2 sm:gap-2
                w-full lg:w-auto
              "
            >
              <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
                <span className="text-[11px] sm:text-xs text-gray-600 whitespace-nowrap">
                  Rows per page
                </span>

                <select
                  className="
                    global-tran-textbox-ui global-tran-textbox-enabled
                    h-8 min-w-[70px] w-20
                    rounded-md sm:text-xs
                  "
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                >
                  {[10, 20, 50, 100, 200, 500, 1000].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>

              <div
                className="
                  flex items-center justify-between sm:justify-end
                  gap-2 sm:gap-3
                  w-full sm:w-auto
                "
              >
                <button
                  className="
                    global-tran-btn-ui
                    h-8 px-3 sm:px-4
                    min-w-[80px]
                    rounded-md
                    hover:bg-blue-100 hover:text-blue-800
                    text-xs sm:text-sm
                    active:scale-[0.98] transition
                    disabled:opacity-50 disabled:cursor-not-allowed
                  "
                  disabled={safePage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  Prev
                </button>

                <div className="text-[11px] sm:text-xs text-gray-700 whitespace-nowrap">
                  Page <span className="font-semibold">{safePage}</span> /{" "}
                  <span className="font-semibold">{totalPages}</span>
                </div>

                <button
                  className="
                    global-tran-btn-ui
                    h-8 px-3 sm:px-4
                    min-w-[80px]
                    rounded-md
                    hover:bg-blue-100 hover:text-blue-800
                    text-xs sm:text-sm
                    active:scale-[0.98] transition
                    disabled:opacity-50 disabled:cursor-not-allowed
                  "
                  disabled={safePage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        {hasDataFiltered && (
          <div
            ref={exportContainerRef}
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              width: 0,
              height: 0,
              overflow: "hidden",
              opacity: 0,
              pointerEvents: "none",
            }}
          >
            <table className="border-collapse text-[5px]">
              <thead>
                <tr>
                  {exportVisibleCols.map((col) => (
                    <th
                      key={col.key}
                      className="border px-2 py-1 text-left bg-gray-200 align-bottom"
                      style={{ maxWidth: 150, whiteSpace: "normal", wordBreak: "break-word" }}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {(effectiveGroupBy.length === 0 ? filteredData : fullRenderRows).map((row, idx) => {
                  if (effectiveGroupBy.length > 0 && row.isGroup) {
                    return (
                      <tr key={`exp-g-${row.key}-${row.value}-${row.level}-${idx}`}>
                        <td
                          colSpan={exportVisibleCols.length}
                          className="border px-2 py-1 font-semibold bg-gray-100"
                        >
                          {columns.find((c) => c.key === row.key)?.label}: {row.value} ({row.count})
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={`exp-row-${idx}`}>
                      {exportVisibleCols.map((col) => (
                        <td
                          key={col.key}
                          className="border px-2 py-1 align-bottom"
                          style={{ maxWidth: 150, whiteSpace: "normal", wordBreak: "break-word" }}
                        >
                          {getCellDisplayText(row, col)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  },
);

export default SearchGlobalReferenceTable;