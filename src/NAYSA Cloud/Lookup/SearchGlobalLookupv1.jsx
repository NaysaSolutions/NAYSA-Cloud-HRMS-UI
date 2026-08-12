
import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { createPortal } from "react-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTimes,
  faSort,
  faSortUp,
  faSortDown,
  faSpinner,
  faBroom,
  faEraser,
  faLayerGroup,
  faChevronRight,
  faChevronDown,
  faExpandArrowsAlt,
  faCompressArrowsAlt,
  faFileExport,
  faFileExcel,
  faFileCsv,
  faFilePdf,
  faFileImage,
  faColumns,
  faSearch,
  faGripVertical,
} from "@fortawesome/free-solid-svg-icons";
import { formatNumber,useSwalErrorAlert } from "../Global/behavior.jsx";
import { exportGenericQueryExcel } from "@/NAYSA Cloud/Global/report";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import ExportFileNameModal from "@/NAYSA Cloud/Lookup/SearchExport.jsx";


const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const MAX_AUTO_WIDTH_CHARS = 40;
const MAX_COLUMN_WIDTH_PX = 520;
const RIGHT_EDGE_GUTTER_PX = 24;
const GlobalLookupModalv1 = ({
  isOpen,
  onClose,
  onCancel,
  endpoint,
  data,
  title,
  btnCaption,
  onSelectionChange,
  onSelectionReset,
  singleSelect = false,
  modalMaxWidthClass = "max-w-8xl",
  overlayZIndexClass = "z-50",
  exportFileName = "Lookup",
}) => {
  const [records, setRecords] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [selected, setSelected] = useState([]); // selection order preserved by push/remove
  const [filters, setFilters] = useState({});
  const [globalSearch, setGlobalSearch] = useState("");
  const [columnConfig, setColumnConfig] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: "", direction: "asc" });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const { companyInfo, currentUserRow } = useAuth();

  // Column order + widths
  const [columnOrder, setColumnOrder] = useState([]);
  const [colWidths, setColWidths] = useState({});
  const dragKeyRef = useRef(null);

  // Grouping (NEW)
  const [groupBy, setGroupBy] = useState([]);
  const [expandedGroups, setExpandedGroups] = useState({});

  // Column chooser (NEW)
  const [userHiddenCols, setUserHiddenCols] = useState([]);
  const [showColumnChooser, setShowColumnChooser] = useState(false);
  const [columnChooserSearch, setColumnChooserSearch] = useState("");
  const [columnChooserDraftHidden, setColumnChooserDraftHidden] = useState([]);

  // Export menu (NEW)
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportModal, setExportModal] = useState({
    isOpen: false,
    title: "Export File",
    confirmText: "Export",
    defaultFileName: "",
    type: null,
  });
  const exportContainerRef = useRef(null); // hidden full-table container for PDF/Image

  // Resizing
  const resizingRef = useRef({ key: null, startX: 0, startWidth: 0 });

  // Bottom scrollbar (source of truth for horizontal scroll)
  const bottomXRef = useRef(null);
  const headerTrackRef = useRef(null);
  const bodyTrackRef = useRef(null);
  const scrollLeftRef = useRef(0);
  const scrollRafRef = useRef(null);

  const applyHorizontalScroll = useCallback((nextLeft = 0) => {
    scrollLeftRef.current = nextLeft;
    const transform = `translate3d(${-nextLeft}px, 0, 0)`;

    if (headerTrackRef.current) headerTrackRef.current.style.transform = transform;
    if (bodyTrackRef.current) bodyTrackRef.current.style.transform = transform;
  }, []);

  const handleHorizontalScroll = useCallback(
    (e) => {
      const nextLeft = e.currentTarget.scrollLeft;

      if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
      scrollRafRef.current = requestAnimationFrame(() => {
        scrollRafRef.current = null;
        applyHorizontalScroll(nextLeft);
      });
    },
    [applyHorizontalScroll]
  );

  // Keyboard nav
  const modalKeyScopeRef = useRef(null);
  const bodyScrollRef = useRef(null);
  const rowRefs = useRef([]);
  const [highlightIndex, setHighlightIndex] = useState(0);


  const tableMeasureRef = useRef(null);
  const [viewportWidth, setViewportWidth] = useState(0);



  // =========================
  // Persistence (localStorage)
  // =========================
  const persistKey = useMemo(() => {
    const t = String(title || "").trim();
    if (t) return `GlobalLookupModalv1:${t}`;

    // fallback to endpoint signature
    if (Array.isArray(endpoint) && endpoint.length) {
      const sig = endpoint
        .map((c) => `${c.key}:${c.label ?? ""}:${c.hidden ? 1 : 0}`)
        .join("|");
      return `GlobalLookupModalv1:endpoint:${sig}`;
    }

    return "GlobalLookupModalv1:default";
  }, [title, endpoint]);

  const safeParse = (s) => {
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  };

  // Load persisted preferences when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const raw = localStorage.getItem(persistKey);
    const saved = raw ? safeParse(raw) : null;

    if (saved?.columnOrder && Array.isArray(saved.columnOrder)) {
      setColumnOrder(saved.columnOrder);
    }
    if (saved?.colWidths && typeof saved.colWidths === "object") {
      setColWidths(saved.colWidths);
    }
    if (saved?.groupBy && Array.isArray(saved.groupBy)) {
      setGroupBy(saved.groupBy);
    }
    if (saved?.userHiddenCols && Array.isArray(saved.userHiddenCols)) {
      setUserHiddenCols(saved.userHiddenCols);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, persistKey]);

  // Save preferences (debounced)
  useEffect(() => {
    if (!isOpen) return;

    const id = setTimeout(() => {
      const payload = {
        columnOrder,
        colWidths,
        groupBy,
        userHiddenCols,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(persistKey, JSON.stringify(payload));
    }, 250);

    return () => clearTimeout(id);
  }, [isOpen, persistKey, columnOrder, colWidths, groupBy, userHiddenCols]);

  // Reset expansions whenever groupBy changes
  useEffect(() => {
    setExpandedGroups({});
    setCurrentPage(1);
    setHighlightIndex(0);
  }, [groupBy]);

  // =========================
  // Helpers
  // =========================
  const renderValue = (column, value, decimal = 2) => {
    if (!value && value !== 0) return "";
    switch (column.renderType) {
      case "number": {
        const digits = parseInt(decimal, 10);
        const safeDecimal = Number.isNaN(digits) ? 2 : digits;
        return formatNumber(value, safeDecimal);
      }
      case "date": {
        const date = new Date(value);
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const year = date.getFullYear();
        return `${month}/${day}/${year}`;
      }
      default:
        return value;
    }
  };

  const handleEditableCellChange = (row, key, value) => {
    setRecords((prev) =>
      prev.map((record) =>
        record.groupId === row.groupId ? { ...record, [key]: value } : record
      )
    );

    setSelected((prev) =>
      prev.map((record) =>
        record.groupId === row.groupId ? { ...record, [key]: value } : record
      )
    );
  };

  const handleFilterChange = (e, key) => {
    setFilters((prev) => ({ ...prev, [key]: e.target.value }));
    setCurrentPage(1);
    setHighlightIndex(0);
  };

  const clearFilters = () => {
    setFilters({});
    setGlobalSearch("");
    setCurrentPage(1);
    setHighlightIndex(0);
  };

  const clearSelection = () => {
    setSelected([]);
  };

  useEffect(() => {
    if (!isOpen || typeof onSelectionChange !== "function") return;
    onSelectionChange(selected);
  }, [isOpen, selected, onSelectionChange]);

  const handleSort = (key, sortable = true) => {
    if (!sortable) return;
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
    setSortConfig({ key, direction });
    setCurrentPage(1);
    setHighlightIndex(0);
  };

  const renderSortIcon = (colKey) => {
    if (sortConfig.key === colKey) {
      return sortConfig.direction === "asc" ? (
        <FontAwesomeIcon icon={faSortUp} className="ml-1 text-blue-500" />
      ) : (
        <FontAwesomeIcon icon={faSortDown} className="ml-1 text-blue-500" />
      );
    }
    return <FontAwesomeIcon icon={faSort} className="ml-1 text-gray-400" />;
  };

  const toggleSelect = (row) => {
    setSelected((prev) => {
      const exists = prev.some((s) => s.groupId === row.groupId);
      const nextSelected = singleSelect
        ? exists ? [] : [row]
        : exists
          ? prev.filter((s) => s.groupId !== row.groupId)
          : [...prev, row];

      if (typeof onSelectionReset === "function") {
        onSelectionReset(nextSelected);
      }

      return nextSelected;
    });
  };

  const toggleSelectAll = () => {
    setSelected((prev) => {
      const nextSelected = prev.length === filtered.length ? [] : [...filtered];
      if (typeof onSelectionReset === "function") {
        onSelectionReset(nextSelected);
      }
      // select all in current filtered order
      return nextSelected;
    });
  };

  // ✅ returns selection order
  const handleGetSelected = () => {
    const payload = {
      data: selected.map((item) => item.groupId), // in selection order
      records: selected, // optional: full records in selection order
    };
    onClose(payload);
  };

  const handleNextPage = () => {
    setCurrentPage((p) => p + 1);
    setHighlightIndex(0);
  };
  const handlePrevPage = () => {
    setCurrentPage((p) => p - 1);
    setHighlightIndex(0);
  };



  // =========================
  // Auto width (measure)
  // =========================
  const measureTextWidth = useCallback((text, font = "12px Arial") => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    ctx.font = font;
    return ctx.measureText(String(text ?? "")).width;
  }, []);

  const computeAutoWidths = useCallback(
    (cols, rows) => {
      const sample = rows?.slice(0, 200) || [];
      const next = {};
      const bodyFont = "12px Arial";
      const headerFont = "12px Arial";
      const maxAutoWidth = Math.min(
        measureTextWidth("W".repeat(MAX_AUTO_WIDTH_CHARS), bodyFont) + 50,
        MAX_COLUMN_WIDTH_PX
      );
      const getMeasureText = (value) =>
        String(value ?? "").slice(0, MAX_AUTO_WIDTH_CHARS);

      cols.forEach((col) => {
        if (col.hidden) return;

        const headerW = measureTextWidth(getMeasureText(col.label ?? col.key ?? ""), headerFont);
        let maxW = headerW;

        for (let i = 0; i < sample.length; i++) {
          const raw = sample[i]?.[col.key];
          const display = renderValue(col, raw, Number(col.roundingOff));
          const w = measureTextWidth(getMeasureText(display), bodyFont);
          if (w > maxW) maxW = w;
        }

        const padded = maxW + 32 + 18; // padding + sort icon
        next[col.key] = clamp(Math.ceil(padded), 90, maxAutoWidth);
      });

      return next;
    },
    [measureTextWidth]
  );

  
  // =========================
  // Column reorder
  // =========================
  // const baseVisibleCols = useMemo(
  //   () => columnConfig.filter((c) => !c.hidden),
  //   [columnConfig]
  // );

  // Apply permission-based filtering

  
const baseVisibleCols = useMemo(() => {
  const restrictedKeywords = ["amount", "rate", "cost", "amt"];
  const hideSensitiveData = currentUserRow?.viewCostamt === "N";


    return columnConfig.filter((c) => {
    if (c.hidden === 1 || c.hidden === true) return false;

    if (hideSensitiveData) {
      const label = String(c.label || "").toLowerCase();
      const key = String(c.key || "").toLowerCase();
      const isSensitive = restrictedKeywords.some(
        (word) => label.includes(word) || key.includes(word)    
      );
      if (isSensitive) return false;
    }

    return true;
  });
}, [columnConfig, currentUserRow?.viewCostAmt]);






  // Apply userHiddenCols + groupBy hidden (to avoid duplicates in group header)
  const visibleCols = useMemo(() => {
    return baseVisibleCols.filter(
      (c) => !userHiddenCols.includes(c.key) && !groupBy.includes(c.key)
    );
  }, [baseVisibleCols, userHiddenCols, groupBy]);

  const orderedVisibleCols = useMemo(() => {
    if (!columnOrder?.length) return visibleCols;

    const byKey = new Map(visibleCols.map((c) => [c.key, c]));
    const ordered = columnOrder.map((k) => byKey.get(k)).filter(Boolean);

    visibleCols.forEach((c) => {
      if (!columnOrder.includes(c.key)) ordered.push(c);
    });

    return ordered;
  }, [visibleCols, columnOrder]);

  const onDragStartHeader = (colKey) => {
    dragKeyRef.current = colKey;
  };
  const onDragOverHeader = (e) => e.preventDefault();

  const onDropHeader = (targetKey) => {
    const sourceKey = dragKeyRef.current;
    dragKeyRef.current = null;
    if (!sourceKey || sourceKey === targetKey) return;

    setColumnOrder((prev) => {
      const base = prev?.length ? [...prev] : baseVisibleCols.map((c) => c.key);
      const srcIdx = base.indexOf(sourceKey);
      const tgtIdx = base.indexOf(targetKey);
      if (srcIdx === -1 || tgtIdx === -1) return base;

      base.splice(srcIdx, 1);
      base.splice(tgtIdx, 0, sourceKey);
      return base;
    });
  };

  // Group-by drag/drop on header (NEW)
  const onDropHeaderToGroup = (colKey) => {
    setGroupBy((prev) => (prev.includes(colKey) ? prev : [...prev, colKey]));
  };

  // =========================
  // Column resize
  // =========================
  const onResizeMove = useCallback((e) => {
    const { key, startX, startWidth } = resizingRef.current;
    if (!key) return;

    const delta = e.clientX - startX;
    const nextW = clamp(startWidth + delta, 70, MAX_COLUMN_WIDTH_PX);
    setColWidths((prev) => ({ ...prev, [key]: nextW }));
  }, []);

  const stopResize = useCallback(() => {
    resizingRef.current = { key: null, startX: 0, startWidth: 0 };
    window.removeEventListener("mousemove", onResizeMove);
    window.removeEventListener("mouseup", stopResize);
  }, [onResizeMove]);

  const startResize = (e, key) => {
    e.preventDefault();
    e.stopPropagation();

    const auto = computeAutoWidths(columnConfig, records);
    const startWidth = colWidths?.[key] ?? auto?.[key] ?? 150;

    resizingRef.current = { key, startX: e.clientX, startWidth };

    window.addEventListener("mousemove", onResizeMove);
    window.addEventListener("mouseup", stopResize);
  };

  useEffect(() => {
    return () => {
      window.removeEventListener("mousemove", onResizeMove);
      window.removeEventListener("mouseup", stopResize);
    };
  }, [onResizeMove, stopResize]);

  // =========================
  // Data load/reset
  // =========================
  useEffect(() => {
    if (!isOpen) {
      setRecords([]);
      setFiltered([]);
      setSelected([]);
      setFilters({});
      setGlobalSearch("");
      setColumnConfig([]);
      setSortConfig({ key: "", direction: "asc" });
      setCurrentPage(1);
      scrollLeftRef.current = 0;
      setHighlightIndex(0);
      rowRefs.current = [];
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        if (endpoint) setColumnConfig(endpoint);
        if (data) setRecords(data);
      } catch (error) {
        console.error("Failed to fetch record:", error);
        setRecords([]);
        setColumnConfig([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [data, endpoint, isOpen]);

  // init widths (auto for missing keys; keep persisted/user widths)
  useEffect(() => {
    if (!isOpen) return;
    if (!columnConfig?.length) return;

    // if no order yet, default to visible columns
    setColumnOrder((prev) => (prev?.length ? prev : baseVisibleCols.map((c) => c.key)));

    // set auto widths for missing keys only
    const auto = computeAutoWidths(columnConfig, records);
    setColWidths((prev) => {
      let changed = false;
      const next = { ...prev };

      Object.entries(auto).forEach(([key, width]) => {
        if (next[key] == null) {
          next[key] = width;
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [isOpen, columnConfig, records, computeAutoWidths, baseVisibleCols]);

  // filter/sort
  useEffect(() => {
    let currentFiltered = [...records];
    const quickSearch = String(globalSearch || "").trim().toLowerCase().replace(/,/g, "");

    currentFiltered = currentFiltered.filter((item) =>
      Object.entries(filters).every(([key, value]) => {
        if (!value) return true;
        const itemValue = String(item[key] ?? "").toLowerCase().replace(/,/g, "");
        const filterValue = String(value).toLowerCase().replace(/,/g, "");
        return itemValue.includes(filterValue);
      })
    );

    if (quickSearch) {
      const searchableCols = orderedVisibleCols.length ? orderedVisibleCols : baseVisibleCols;
      currentFiltered = currentFiltered.filter((item) =>
        searchableCols.some((col) => {
          const raw = item?.[col.key];
          const display = renderValue(col, raw, Number(col.roundingOff));
          return String(display ?? "").toLowerCase().replace(/,/g, "").includes(quickSearch);
        })
      );
    }

    if (sortConfig?.key) {
      currentFiltered.sort((a, b) => {
        const aValue = String(a[sortConfig.key] ?? "").toLowerCase();
        const bValue = String(b[sortConfig.key] ?? "").toLowerCase();
        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    setFiltered(currentFiltered);
  }, [records, filters, globalSearch, sortConfig, orderedVisibleCols, baseVisibleCols]);

  // =========================
  // Grouping
  // =========================
  const calculateAggregates = useCallback(
    (rows) => {
      const sums = {};
      orderedVisibleCols.forEach((col) => {
        if (col.renderType === "number") {
          sums[col.key] = rows.reduce((acc, r) => acc + (Number(r?.[col.key]) || 0), 0);
        }
      });
      return sums;
    },
    [orderedVisibleCols]
  );

  const groupData = useCallback(
    (rows, level = 0) => {
      if (level >= groupBy.length) return rows.map((r) => ({ ...r }));

      const groupKey = groupBy[level];
      const groups = {};
      rows.forEach((row) => {
        const val = String(row?.[groupKey] ?? "(Blank)");
        if (!groups[val]) groups[val] = [];
        groups[val].push(row);
      });

      const result = [];
      Object.keys(groups)
        .sort()
        .forEach((val) => {
          result.push({
            isGroup: true,
            key: groupKey,
            value: val,
            level,
            count: groups[val].length,
            children: groupData(groups[val], level + 1),
            aggregates: calculateAggregates(groups[val]),
          });
        });

      return result;
    },
    [groupBy, calculateAggregates]
  );

  const groupedStructure = useMemo(() => {
    if (groupBy.length === 0) return filtered;
    return groupData(filtered);
  }, [filtered, groupBy, groupData]);

  const processRenderList = useCallback(
    (nodes) => {
      let list = [];
      nodes.forEach((node) => {
        if (node.isGroup) {
          list.push(node);
          const uniqueId = `${node.key}-${node.value}-${node.level}`;
          if (expandedGroups[uniqueId]) {
            if (node.level === groupBy.length - 1) {
              list = list.concat(node.children);
            } else {
              list = list.concat(processRenderList(node.children));
            }
          }
        } else {
          list.push(node);
        }
      });
      return list;
    },
    [expandedGroups, groupBy.length]
  );

  // =========================
  // pagination info
  // =========================
  const totalItems = groupBy.length > 0 ? groupedStructure.length : filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = totalItems > 0 ? (safePage - 1) * itemsPerPage + 1 : 0;
  const endItem = Math.min(safePage * itemsPerPage, totalItems);

  // paginated data (groups paginated as header rows)
  const paginatedData = useMemo(() => {
    const startIndex = (safePage - 1) * itemsPerPage;

    if (groupBy.length === 0) {
      return filtered.slice(startIndex, startIndex + itemsPerPage);
    }

    const pagedGroups = groupedStructure.slice(startIndex, startIndex + itemsPerPage);
    return processRenderList(pagedGroups);
  }, [filtered, groupedStructure, safePage, groupBy.length, processRenderList]);

  // =========================
  // sizing + horizontal scroll
  // =========================
  const selectColWidth = 70;
  

   const tableMinWidth = useMemo(() => {
    const sum = orderedVisibleCols.reduce(
      (acc, c) => acc + (colWidths[c.key] || 150),
      0
    );
    return sum + (singleSelect ? 0 : selectColWidth) + RIGHT_EDGE_GUTTER_PX;
  }, [orderedVisibleCols, colWidths, singleSelect]);
  
  const fitFactor = useMemo(() => {
  if (!viewportWidth) return 1;

    const available = viewportWidth; // viewport already excludes padding
    // If table is smaller than viewport, stretch it
    if (tableMinWidth < available) {
      return available / tableMinWidth;
    }
    return 1;
  }, [viewportWidth, tableMinWidth]);


  const effectiveSelectColWidth = singleSelect ? 0 : selectColWidth * fitFactor;
 

  // reset horizontal scroll if width/page changes
  useEffect(() => {
    if (!isOpen) return;
    scrollLeftRef.current = 0;
    applyHorizontalScroll(0);
    if (bottomXRef.current) bottomXRef.current.scrollLeft = 0;
  }, [tableMinWidth, isOpen, safePage, applyHorizontalScroll]);

  useEffect(() => {
    if (!isOpen) return;
    applyHorizontalScroll(scrollLeftRef.current);
  }, [isOpen, tableMinWidth, fitFactor, applyHorizontalScroll]);

  useEffect(() => {
    return () => {
      if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
    };
  }, []);

  // =========================
  // Keyboard navigation
  // =========================
  useEffect(() => {
    if (!isOpen) return;

    // auto focus modal for key events
    const t = setTimeout(() => {
      modalKeyScopeRef.current?.focus?.();
    }, 0);

    return () => clearTimeout(t);
  }, [isOpen]);



  useEffect(() => {
  if (!isOpen) return;
  const el = tableMeasureRef.current;
  if (!el) return;

  const ro = new ResizeObserver((entries) => {
    const w = entries?.[0]?.contentRect?.width || 0;
    setViewportWidth((prev) => (Math.abs(prev - w) < 1 ? prev : w));
  });

  ro.observe(el);
  return () => ro.disconnect();
}, [isOpen]);




  // keep highlight within bounds when data changes (skip group rows)
  useEffect(() => {
    const dataRowsCount = paginatedData.filter((r) => !r?.isGroup).length;
    const max = Math.max(0, dataRowsCount - 1);
    setHighlightIndex((i) => clamp(i, 0, max));
    rowRefs.current = [];
  }, [paginatedData, safePage]);

  // scroll highlighted row into view
  useEffect(() => {
    const el = rowRefs.current?.[highlightIndex];
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ block: "nearest" });
    }
  }, [highlightIndex]);

  const getDataRowByHighlight = () => {
    const dataRows = paginatedData.filter((r) => !r?.isGroup);
    return dataRows[highlightIndex];
  };

  const onKeyDown = (e) => {
    if (!isOpen) return;

    // avoid hijacking typing in filter inputs
    const tag = (e.target?.tagName || "").toLowerCase();
    const isTyping = tag === "input" || tag === "textarea" || e.target?.isContentEditable;

    if (isTyping) {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel?.();
      }
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      onCancel?.();
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const dataRowsCount = paginatedData.filter((r) => !r?.isGroup).length;
      setHighlightIndex((i) => clamp(i + 1, 0, Math.max(0, dataRowsCount - 1)));
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      const dataRowsCount = paginatedData.filter((r) => !r?.isGroup).length;
      setHighlightIndex((i) => clamp(i - 1, 0, Math.max(0, dataRowsCount - 1)));
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      const row = getDataRowByHighlight();
      if (row) toggleSelect(row);
      return;
    }
  };

  // =========================
  // Group toggles
  // =========================
  const toggleGroup = (node) => {
    const uniqueId = `${node.key}-${node.value}-${node.level}`;
    setExpandedGroups((prev) => ({ ...prev, [uniqueId]: !prev[uniqueId] }));
  };

  const toggleAll = (expand) => {
    if (!expand) {
      setExpandedGroups({});
      return;
    }
    const allKeys = {};
    const traverse = (nodes) => {
      nodes.forEach((n) => {
        if (n?.isGroup) {
          allKeys[`${n.key}-${n.value}-${n.level}`] = true;
          if (Array.isArray(n.children) && n.children[0]?.isGroup) traverse(n.children);
        }
      });
    };
    traverse(groupedStructure);
    setExpandedGroups(allKeys);
  };

  // =========================
  // Export helpers
  // =========================
  const MIN_VISIBLE_COLUMNS = 2;
  const hasDataFiltered = Array.isArray(filtered) && filtered.length > 0;

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

  const sanitizeFileName = (name) =>
    String(name ?? "")
      .trim()
      .replace(/[\\/:*?"<>|]/g, "")
      .replace(/\s+/g, " ")
      .substring(0, 120);

  const openExportModal = (type) => {
    const titleMap = { excel: "Export Excel", csv: "Export CSV", pdf: "Export PDF", image: "Export Image" };
    setExportModal({
      isOpen: true,
      title: titleMap[type] || "Export File",
      confirmText: "Export",
      defaultFileName: `${exportFileName} ${getDateTimeStamp()}`,
      type,
    });
  };

  const closeExportModal = () => setExportModal({
    isOpen: false,
    title: "Export File",
    confirmText: "Export",
    defaultFileName: "",
    type: null,
  });



  const handleExportCsvClick = async (customFileName) => {
    if (!hasDataFiltered) return;

    try {
      const fileName = sanitizeFileName(customFileName);
      if (!fileName) return;

      const rowsToExport = filtered;

      const headerRow = orderedVisibleCols
        .map((col) => {
          let header = String(col.label ?? "");
          header = header.replace(/,/g, "");
          header = header.toUpperCase().replace(/\s+/g, "_");
          const escaped = header.replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(",");

      const csvLines = [headerRow];

      rowsToExport.forEach((row) => {
        const line = orderedVisibleCols
          .map((col) => {
            const raw = row?.[col.key];
            const formatted = renderValue(col, raw, Number(col.roundingOff));
            const noCommas = String(formatted ?? "").replace(/,/g, "");
            const escaped = noCommas.replace(/"/g, '""');
            return `"${escaped}"`;
          })
          .join(",");
        csvLines.push(line);
      });

      const csvContent = csvLines.join("\r\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${fileName}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error exporting CSV:", err);
    }
  };

  const handleExportPdfClick = async (customFileName) => {
    if (!hasDataFiltered || !exportContainerRef.current) return;

    try {
      const fileName = sanitizeFileName(customFileName);
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
    } catch (err) {
      console.error("Error exporting PDF:", err);
    }
  };

  const handleExportImageClick = async (customFileName) => {
    if (!hasDataFiltered || !exportContainerRef.current) return;

    try {
      const fileName = sanitizeFileName(customFileName);
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
    } catch (err) {
      console.error("Error exporting image:", err);
    }
  };

  // Excel export placeholder:
  // Your lookup currently doesn't have exportGenericQueryExcel wired.
  // If you already have it in your project, just import and implement similar to SearchGlobalReportTable.
const handleExportExcelClick = async (customFileName) => {
  if (!hasDataFiltered) return;

  try {
    const fileName = sanitizeFileName(customFileName);
    if (!fileName) return;

    // ✅ Always export actual rows/structure (NOT boolean)
    const exportData = groupBy.length > 0 ? groupedStructure : filtered;

    // ✅ Your exporter expects the complete column metadata list
    // Use baseVisibleCols (all non-hidden config cols) so exporter can find renderType/roundingOff
    const columnsForExport = baseVisibleCols;

    // ✅ The exporter uses visibleCols to define the final exported columns
    // Use orderedVisibleCols so it matches what user sees (order + hidden + groupBy excluded)
    const visibleColsForExport = orderedVisibleCols.map((c) => ({
      key: c.key,
      label: c.label,
      width: c.width,
    }));

    await exportGenericQueryExcel(
      exportData,
      {}, // grandTotals not available -> allow {}
      visibleColsForExport,
      groupBy,
      columnsForExport,
      expandedGroups,
      7,
      fileName,
      currentUserRow?.userName || "",
      companyInfo?.compName || "",
      companyInfo?.compAddr || "",
      companyInfo?.telNo || ""
    );
  } catch (err) {
    console.error("Error exporting Excel:", err);
  }
};

  const handleExportConfirm = async (enteredFileName) => {
    try {
      const fileName = sanitizeFileName(enteredFileName);
      if (!fileName) return;
      if (exportModal.type === "excel") await handleExportExcelClick(fileName);
      else if (exportModal.type === "csv") await handleExportCsvClick(fileName);
      else if (exportModal.type === "pdf") await handleExportPdfClick(fileName);
      else if (exportModal.type === "image") await handleExportImageClick(fileName);
    } finally {
      closeExportModal();
    }
  };

  

  // Column chooser helpers
  const allChooserKeys = baseVisibleCols.map((c) => c.key);
  const allChecked = allChooserKeys.every((key) => !columnChooserDraftHidden.includes(key));
  const filteredChooserColumns = baseVisibleCols.filter((col) =>
    String(col.label || col.key || "").toLowerCase().includes(columnChooserSearch.trim().toLowerCase())
  );

  const handleToggleColumnChooser = () => {
    setColumnChooserSearch("");
    setColumnChooserDraftHidden(userHiddenCols);
    setShowColumnChooser(true);
  };

  const handleCloseColumnChooser = () => {
    setShowColumnChooser(false);
    setColumnChooserSearch("");
    setColumnChooserDraftHidden([]);
  };

  const handleToggleColumnVisibility = (key, checked) => {
    setColumnChooserDraftHidden((prev) => {
      if (checked) return prev.filter((item) => item !== key);
      const visibleCount = allChooserKeys.filter((item) => !prev.includes(item)).length;
      if (visibleCount <= MIN_VISIBLE_COLUMNS) {
        useSwalErrorAlert("Minimum columns required", "Please retain at least 2 columns.");
        return prev;
      }
      return [...prev, key];
    });
  };

  const handleToggleAllColumns = (checked) => {
    if (checked) setColumnChooserDraftHidden([]);
    else setColumnChooserDraftHidden(allChooserKeys.slice(MIN_VISIBLE_COLUMNS));
  };

  // =========================
  // Render guards
  // =========================
  if (!isOpen) return null;

  // height tuning (space for header area + bottom bar + footer)
  const BODY_MAX_H = "calc(90vh - 320px)";

  // shared “viewport” and “track”
  const viewportStyle = { overflow: "hidden", width: "100%" };
  const trackStyle = {
    width: tableMinWidth * fitFactor,
    willChange: "transform",
  };

  const getColW = (key) => clamp(colWidths[key] || 150, 70, MAX_COLUMN_WIDTH_PX) * fitFactor;

  return (
    <div
      className={`fixed inset-0 ${overlayZIndexClass} flex items-center justify-center bg-black bg-opacity-50 p-4 sm:p-6 lg:p-8 animate-fade-in`}
      onKeyDown={onKeyDown}
    >
      <div
        ref={modalKeyScopeRef}
        tabIndex={0}
        className={`bg-white rounded-xl shadow-2xl w-full ${modalMaxWidthClass} max-h-[90vh] flex flex-col relative overflow-hidden transform scale-95 animate-scale-in outline-none border border-slate-200`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between bg-slate-100 border-b border-slate-200 py-1">
          <div className="flex items-center gap-2 pl-2 sm:pl-3">
            <div className="global-lookup-headertext-ui">
              {title}
            </div>
          </div>

          <button
            onClick={() => onCancel?.()}
            className="p-2 mr-2 text-slate-400 hover:text-red-600 transition-colors"
            aria-label="Close modal"
          >
            <FontAwesomeIcon icon={faTimes} size="lg" />
          </button>
        </div>

        <div className="flex-grow overflow-hidden flex flex-col">
          {loading ? (
            <div className="flex items-center justify-center h-full min-h-[200px] text-blue-500">
              <FontAwesomeIcon icon={faSpinner} spin size="2x" className="mr-3" />
              <span>Loading...</span>
            </div>
          ) : (
            <>
              {/* =========================
                  TOP TOOLBAR (NEW)
                 ========================= */}
              {hasDataFiltered && (
                <div
                  className="p-2 bg-gray-50 border-b flex flex-wrap gap-2 items-center min-h-[45px] shrink-0"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    // allow dropping header to group zone (fallback)
                    e.preventDefault();
                    const sourceKey = dragKeyRef.current;
                    if (sourceKey) onDropHeaderToGroup(sourceKey);
                  }}
                >
                  {/* Left side: Group By */}
                  <div className="flex-1 flex flex-wrap gap-2 items-center">
                    <div className="text-xs font-bold text-gray-500 flex items-center">
                      <FontAwesomeIcon icon={faLayerGroup} className="mr-2" />
                      Group By:
                    </div>
                    {groupBy.length === 0 && (
                      <div className="text-xs text-gray-400 italic border border-dashed border-gray-300 rounded px-3 py-1">
                        Drag Header Here...
                      </div>
                    )}
                    {groupBy.map((gKey) => (
                      <div
                        key={gKey}
                        className="flex items-center bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded border border-blue-200"
                      >
                        <span>{baseVisibleCols.find((c) => c.key === gKey)?.label}</span>
                        <button
                          onClick={() => {
                            setGroupBy((prev) => prev.filter((k) => k !== gKey));
                          }}
                          className="ml-2 text-blue-500 hover:text-red-500"
                          title="Remove group"
                        >
                          <FontAwesomeIcon icon={faTimes} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Right side: group controls + export menu + column chooser */}
                  <div className="flex items-center gap-2">
                    {groupBy.length > 0 && (
                      <>
                        <button
                          onClick={() => toggleAll(true)}
                          className="text-xs bg-white border px-2 py-1 rounded hover:bg-gray-100"
                          title="Expand All"
                        >
                          <FontAwesomeIcon icon={faExpandArrowsAlt} /> Expand
                        </button>
                        <button
                          onClick={() => toggleAll(false)}
                          className="text-xs bg-white border px-2 py-1 rounded hover:bg-gray-100"
                          title="Collapse All"
                        >
                          <FontAwesomeIcon icon={faCompressArrowsAlt} /> Collapse
                        </button>
                        <button
                          onClick={() => setGroupBy([])}
                          className="text-xs bg-white border px-2 py-1 rounded hover:bg-gray-100"
                          title="Remove All Groups"
                        >
                          <FontAwesomeIcon icon={faTimes} className="text-red-600 mr-1" />
                          Remove
                        </button>
                      </>
                    )}

                    <div className="relative">
                      <input
                        type="text"
                        value={globalSearch}
                        onChange={(e) => {
                          setGlobalSearch(e.target.value);
                          setCurrentPage(1);
                          setHighlightIndex(0);
                        }}
                        placeholder="Quick Search..."
                        className="h-8 w-48 rounded-md border border-slate-200 bg-white pl-8 pr-7 text-xs font-semibold text-slate-700 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      />
                      <FontAwesomeIcon
                        icon={faSearch}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]"
                      />
                      {globalSearch && (
                        <button
                          type="button"
                          onClick={() => {
                            setGlobalSearch("");
                            setCurrentPage(1);
                            setHighlightIndex(0);
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                          title="Clear quick search"
                        >
                          <FontAwesomeIcon icon={faTimes} className="text-[10px]" />
                        </button>
                      )}
                    </div>

                    {/* Export dropdown */}
                    <div className="relative shrink-0">
                      <button
                        type="button"
                        onClick={() => hasDataFiltered && setShowExportMenu((prev) => !prev)}
                        disabled={!hasDataFiltered}
                        className="text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 transition flex items-center justify-center h-8 px-3 whitespace-nowrap"
                        title="Export options"
                      >
                        <FontAwesomeIcon icon={faFileExport} className="mr-1" />
                        Export
                      </button>

                      {showExportMenu && (
                        <div className="absolute right-0 mt-1 min-w-[120px] rounded-lg shadow-lg bg-white dark:bg-slate-800 ring-1 ring-black/10 dark:ring-slate-700 z-[60] overflow-hidden py-1">
                          <button
                            type="button"
                            onClick={() => {
                              setShowExportMenu(false);
                              openExportModal("excel");
                            }}
                            className="flex items-center w-full px-4 py-2 text-xs text-gray-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors"
                          >
                            <FontAwesomeIcon icon={faFileExcel} className="mr-2 text-green-600" />
                            Excel
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowExportMenu(false);
                              openExportModal("csv");
                            }}
                            className="flex items-center w-full px-4 py-2 text-xs text-gray-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors"
                          >
                            <FontAwesomeIcon icon={faFileCsv} className="mr-2 text-emerald-600" />
                            CSV
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowExportMenu(false);
                              openExportModal("pdf");
                            }}
                            className="flex items-center w-full px-4 py-2 text-xs text-gray-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors"
                          >
                            <FontAwesomeIcon icon={faFilePdf} className="mr-2 text-red-600" />
                            PDF
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowExportMenu(false);
                              openExportModal("image");
                            }}
                            className="flex items-center w-full px-4 py-2 text-xs text-gray-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors"
                          >
                            <FontAwesomeIcon icon={faFileImage} className="mr-2 text-blue-600" />
                            Image
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Column chooser */}
                    <div className="relative shrink-0">
                      <button
                        type="button"
                        onClick={handleToggleColumnChooser}
                        className="text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition flex items-center justify-center h-8 px-3 whitespace-nowrap"
                        title="Show/Hide columns"
                      >
                        <FontAwesomeIcon icon={faColumns} className="mr-1" /> Columns
                      </button>

                      {showColumnChooser && createPortal(
                        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/45 px-3 py-3">
                          <div className="flex max-h-[60vh] w-full max-w-[480px] flex-col overflow-hidden rounded-md bg-white dark:bg-slate-800 shadow-2xl ring-1 ring-black/10 dark:ring-slate-700">
                            <div className="flex items-start justify-between gap-3 border-b border-gray-200 dark:border-slate-700 px-3 py-2">
                              <div>
                                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Manage Columns - {exportFileName}</h2>
                                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">Choose the columns to display in the table.</p>
                              </div>
                              <button type="button" className="h-6 w-6 shrink-0 text-slate-500 hover:text-red-600" onClick={handleCloseColumnChooser} title="Close">
                                <FontAwesomeIcon icon={faTimes} className="text-sm" />
                              </button>
                            </div>
                            <div className="border-b border-gray-200 dark:border-slate-700 px-3 py-2 space-y-2">
                              <div className="relative">
                                <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400" />
                                <input type="text" value={columnChooserSearch} onChange={(e) => setColumnChooserSearch(e.target.value)} placeholder="Search columns..." className="h-7 w-full rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 pl-9 pr-2 text-[11px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                              </div>
                              <div className="flex items-center gap-2">
                                <label className="inline-flex h-7 items-center gap-1.5 text-[11px] cursor-pointer">
                                  <input type="checkbox" className="h-3 w-3 accent-blue-600" checked={allChecked} onChange={(e) => handleToggleAllColumns(e.target.checked)} />
                                  {allChecked ? `UnSelect All (${allChooserKeys.length})` : `Select All (${allChooserKeys.length})`}
                                </label>
                                <div className="h-5 border-l border-gray-300 dark:border-slate-600" />
                                <button type="button" className="h-7 rounded-md border border-gray-300 dark:border-slate-600 px-2 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700" onClick={() => { setColumnChooserDraftHidden([]); setColumnChooserSearch(""); }}>Restore Default</button>
                              </div>
                            </div>
                            <div className="min-h-0 flex-1 overflow-auto px-3 py-2 custom-scrollbar">
                              <div className="grid grid-cols-1 gap-1.5 md:grid-cols-2">
                                {filteredChooserColumns.map((col) => (
                                  <label key={col.key} className="flex h-7 items-center gap-1.5 rounded border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 text-[11px] text-slate-800 dark:text-slate-200 shadow-sm cursor-pointer hover:bg-blue-50 dark:hover:bg-slate-600">
                                    <input type="checkbox" className="h-3 w-3 shrink-0 accent-blue-600" checked={!columnChooserDraftHidden.includes(col.key)} onChange={(e) => handleToggleColumnVisibility(col.key, e.target.checked)} />
                                    <span className="min-w-0 flex-1 truncate">{col.label}</span>
                                    <FontAwesomeIcon icon={faGripVertical} className="text-[11px] text-slate-300 dark:text-slate-500" />
                                  </label>
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center justify-between gap-2 border-t border-gray-200 dark:border-slate-700 px-3 py-2">
                              <div className="text-[11px] text-slate-500 dark:text-slate-400">Showing {filteredChooserColumns.length === 0 ? 0 : 1}-{filteredChooserColumns.length} of {allChooserKeys.length} columns</div>
                              <div className="flex gap-2">
                                <button type="button" className="h-7 min-w-[72px] rounded-md border border-gray-300 dark:border-slate-600 px-3 text-[11px] font-medium text-slate-600 dark:text-slate-300" onClick={handleCloseColumnChooser}>Cancel</button>
                                <button type="button" className="h-7 min-w-[72px] rounded-md bg-blue-600 px-3 text-[11px] font-medium text-white hover:bg-blue-700" onClick={() => { setUserHiddenCols(columnChooserDraftHidden); handleCloseColumnChooser(); }}>Apply</button>
                              </div>
                            </div>
                          </div>
                        </div>,
                        document.body
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* =========================
                  FROZEN HEADER (ALWAYS VISIBLE)
                 ========================= */}
              <div className="border-b border-slate-200 bg-slate-200">
                <div ref={tableMeasureRef} style={viewportStyle}>
                  <div ref={headerTrackRef} style={trackStyle}>
                    <table className="w-full table-fixed divide-y divide-gray-100">
                      <thead>
                        <tr className="bg-slate-200">
                          {!singleSelect && (
                            <th
                              className="global-lookup-th-ui"
                              style={{ width: effectiveSelectColWidth, minWidth: effectiveSelectColWidth  }}
                            >
                              Select
                            </th>
                          )}

                          {orderedVisibleCols.map((column) => {
                            const w = getColW(column.key);
                            const sortable = column.sortable !== false;

                            return (
                              <th
                                key={column.key}
                                draggable
                                onDragStart={() => onDragStartHeader(column.key)}
                                onDragOver={onDragOverHeader}
                                onDrop={() => onDropHeader(column.key)}
                                onDoubleClick={(e) => {
                                  // ✅ Double click header to group (safe alternative)
                                  e.preventDefault();
                                  onDropHeaderToGroup(column.key);
                                }}
                                onClick={() => handleSort(column.key, sortable)}
                                className={`global-lookup-th-ui relative bg-slate-200 ${
                                  column.className || ""
                                } ${sortable ? "cursor-pointer" : "cursor-default"}`}
                                style={{ width: w, minWidth: 70, maxWidth: 900 }}
                                title="Drag to reorder columns | Double-click to Group By this column"
                              >
                                <div className="flex min-w-0 items-center justify-center gap-3 whitespace-nowrap select-none group">
                                  <span className="global-lookup-th-text-ui truncate">
                                    {column.label}
                                  </span>
                                  <span className="mb-1 text-[10px] opacity-30 group-hover:opacity-100">
                                    {renderSortIcon(column.key)}
                                  </span>
                                </div>

                                {/* Resize handle */}
                                <div
                                  onMouseDown={(e) => startResize(e, column.key)}
                                  className="absolute top-0 right-0 h-full w-2 cursor-col-resize"
                                  title="Drag to resize"
                                />
                              </th>
                            );
                          })}
                          <th
                            className="bg-slate-200"
                            style={{ width: RIGHT_EDGE_GUTTER_PX, minWidth: RIGHT_EDGE_GUTTER_PX }}
                            aria-hidden="true"
                          />
                        </tr>

                        {/* Filter row */}
                        <tr className="bg-slate-200">
                          {!singleSelect && (
                            <td
                              className="bg-slate-200"
                              style={{ width: effectiveSelectColWidth, minWidth: effectiveSelectColWidth  }}
                            />
                          )}
                          {orderedVisibleCols.map((column) => {
                            const w = getColW(column.key);
                            return (
                              <td
                                key={column.key}
                                className="px-2 py-1 bg-slate-200"
                                style={{ width: w, minWidth: 70, maxWidth: 900 }}
                              >
                                <div className="relative">
                                  <input
                                    type="text"
                                    value={filters[column.key] || ""}
                                    onChange={(e) => handleFilterChange(e, column.key)}
                                    className="global-lookup-filter-text-ui"
                                    placeholder="Filter..."
                                  />
                                  <FontAwesomeIcon icon={faSearch} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]" />
                                </div>
                              </td>
                            );
                          })}
                          <td
                            className="bg-slate-200"
                            style={{ width: RIGHT_EDGE_GUTTER_PX, minWidth: RIGHT_EDGE_GUTTER_PX }}
                            aria-hidden="true"
                          />
                        </tr>
                      </thead>
                    </table>
                  </div>
                </div>
              </div>

              {/* =========================
                  BODY (VERTICAL SCROLL ALWAYS VISIBLE)
                 ========================= */}
              <div
                ref={bodyScrollRef}
                className="flex-grow overflow-y-auto overflow-x-hidden custom-scrollbar bg-white"
                style={{ maxHeight: BODY_MAX_H }}
              >
                <div style={viewportStyle}>
                  <div ref={bodyTrackRef} style={trackStyle}>
                    <table className="w-full table-fixed divide-y divide-gray-100">
                      <tbody className="bg-white divide-y divide-slate-100">
                        {paginatedData.length > 0 ? (
                          paginatedData.map((row, idx) => {
                            // Group header row
                            if (groupBy.length > 0 && row?.isGroup) {
                              const uniqueId = `${row.key}-${row.value}-${row.level}`;
                              const isExpanded = expandedGroups[uniqueId];

                              const colSpan =
                                orderedVisibleCols.length + (singleSelect ? 0 : 1) + 1;

                              return (
                                <tr
                                  key={`g-${uniqueId}-${idx}`}
                                  className="bg-gray-100 hover:bg-gray-200 cursor-pointer"
                                  onClick={() => toggleGroup(row)}
                                >
                                 <td
                                      colSpan={colSpan}
                                      className="px-2 py-2 text-xs font-semibold border-b border-gray-300 text-blue-900 whitespace-nowrap overflow-hidden"
                                    >
                                    <div
                                      className="flex items-center"
                                      style={{ paddingLeft: row.level * 20 }}
                                    >
                                      <FontAwesomeIcon
                                        icon={isExpanded ? faChevronDown : faChevronRight}
                                        className="w-3 h-3 mr-2 text-gray-500"
                                      />
                                      <span className="mr-2 text-gray-600">
                                        {baseVisibleCols.find((c) => c.key === row.key)?.label}:
                                      </span>
                                      <span className="mr-2 font-bold">{row.value}</span>
                                      <span className="bg-blue-200 text-blue-800 text-[9px] px-1.5 rounded-full">
                                        {row.count}
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                              );
                            }

                            // normal row
                            const dataRows = paginatedData.filter((r) => !r?.isGroup);
                            const dataIndex = dataRows.indexOf(row);
                            const isChecked = selected.some((s) => s.groupId === row.groupId);

                            return (
                              <tr
                                key={`r-${idx}`}
                                ref={(el) => {
                                  if (dataIndex >= 0) rowRefs.current[dataIndex] = el;
                                }}
                                className={`text-xs ${
                                  isChecked ? "bg-blue-100" : "hover:bg-blue-100"
                                }`}
                                onMouseEnter={() => {
                                  if (dataIndex >= 0) setHighlightIndex(dataIndex);
                                }}
                                onDoubleClick={() => {
                                  if (singleSelect) {
                                    setSelected([row]);
                                    handleGetSelected();
                                  } else {
                                    toggleSelect(row);
                                  }
                                }}
                                onClick={() => {
                                  if (singleSelect) toggleSelect(row);
                                }}
                              >
                                {!singleSelect && (
                                  <td
                                    className="px-2 py-1 text-center"
                                    style={{ width: effectiveSelectColWidth, minWidth: effectiveSelectColWidth  }}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => toggleSelect(row)}
                                      className="form-checkbox h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                  </td>
                                )}

                                {orderedVisibleCols.map((column) => {
                                  const w = getColW(column.key);
                                  const cellValue = renderValue(
                                    column,
                                    row[column.key],
                                    Number(column.roundingOff)
                                  );

                                  return (
                                    <td
                                      key={column.key}
                                      className={`global-lookup-td-ui ${column.classNames || ""} overflow-hidden truncate whitespace-nowrap`}
                                      style={{ width: w, minWidth: 70, maxWidth: 900 }}
                                      title={String(cellValue ?? "")}
                                    >
                                      {column.editable ? (
                                        <input
                                          type={column.inputType || "text"}
                                          value={row[column.key] ?? ""}
                                          onChange={(e) => {
                                            const rawValue = e.target.value;
                                            const nextValue =
                                              column.renderType === "number"
                                                ? rawValue.replace(/[^0-9.-]/g, "")
                                                : rawValue;

                                            handleEditableCellChange(
                                              row,
                                              column.key,
                                              nextValue
                                            );
                                          }}
                                          onClick={(e) => e.stopPropagation()}
                                          onDoubleClick={(e) => e.stopPropagation()}
                                          className="h-7 w-full rounded border border-blue-200 bg-white px-2 text-right text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-300"
                                        />
                                      ) : (
                                        cellValue
                                      )}
                                    </td>
                                  );
                                })}
                                <td
                                  className=""
                                  style={{ width: RIGHT_EDGE_GUTTER_PX, minWidth: RIGHT_EDGE_GUTTER_PX }}
                                  aria-hidden="true"
                                />
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td
                              colSpan={orderedVisibleCols.length + (singleSelect ? 0 : 1) + 1}
                              className="px-4 py-6 text-center text-gray-500 text-lg"
                            >
                              No matching records found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* =========================
                  ALWAYS-VISIBLE HORIZONTAL SCROLLBAR (BOTTOM)
                 ========================= */}
              <div
                ref={bottomXRef}
                className="overflow-x-auto overflow-y-hidden border-t border-gray-200 bg-white"
                onScroll={handleHorizontalScroll}
              >
                <div style={{ width: tableMinWidth, height: 14 }} />
              </div>

              {/* =========================
                  HIDDEN EXPORT CONTAINER (NEW)
                 ========================= */}
              {hasDataFiltered && (
                <div
                  ref={exportContainerRef}
                  style={{ position: "absolute", left: "-99999px", top: 0 }}
                >
                  <table className="border-collapse text-[8px]">
                    <thead>
                      <tr>
                        {orderedVisibleCols.map((col) => (
                          <th
                            key={col.key}
                            className="border px-2 py-1 text-left bg-gray-200 align-top"
                            style={{
                              maxWidth: 150,
                              whiteSpace: "normal",
                              wordBreak: "break-word",
                            }}
                          >
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((row, idx) => (
                        <tr key={`exp-${idx}`}>
                          {orderedVisibleCols.map((col) => (
                            <td
                              key={col.key}
                              className="border px-2 py-1 align-top"
                              style={{
                                maxWidth: 150,
                                whiteSpace: "normal",
                                wordBreak: "break-word",
                              }}
                            >
                              {renderValue(col, row?.[col.key], Number(col.roundingOff))}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center text-xs text-gray-600">
          <div className="flex items-center gap-3 flex-wrap">
            {!singleSelect && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.length === filtered.length && filtered.length > 0}
                  onChange={toggleSelectAll}
                  className="form-checkbox h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                />
                Select All
              </label>
            )}
            <button
              type="button"
              onClick={clearFilters}
              className="px-3 py-2 text-xs font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200"
              title="Clear all filters"
            >
              <FontAwesomeIcon icon={faBroom} className="mr-2" />
              Clear Filters
            </button>

            {!singleSelect && (
              <button
                type="button"
                onClick={clearSelection}
                disabled={selected.length === 0}
                className="px-3 py-2 text-xs font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 disabled:opacity-50"
                title="Clear selection"
              >
                <FontAwesomeIcon icon={faEraser} className="mr-2" />
                Clear Selection
              </button>
            )}

            {!singleSelect && (
              <div className="font-semibold text-gray-700">Selected: {selected.length}</div>
            )}

            <button
              onClick={handleGetSelected}
              disabled={selected.length === 0}
              className="px-4 py-2 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              title="Enter also toggles selection for highlighted row"
            >
              {btnCaption}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="font-semibold">
              Showing {totalItems ? startItem : 0}-{endItem} of {totalItems} entries
            </div>
            <button
              onClick={handlePrevPage}
              disabled={safePage === 1}
              className="px-4 py-2 text-xs font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={handleNextPage}
              disabled={safePage >= totalPages}
              className="px-4 py-2 text-xs font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>

        {/* Small keyboard hint (optional) */}
        <div className="px-4 pb-3 text-[11px] text-gray-400">
          Keyboard: ↑↓ to move, Enter to select/unselect, Esc to close.
          <span className="ml-2">
            Tip: Double-click a column header to Group By it.
          </span>
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
    </div>
  );
};

export default GlobalLookupModalv1;
