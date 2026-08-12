import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useReturnToDate } from "@/NAYSA Cloud/Global/dates";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import AttachDocumentModal from "@/NAYSA Cloud/Lookup/SearchAttachment.jsx";
import {
  useSwalErrorAlert,
  useSwalProceedConfirm,
} from "@/NAYSA Cloud/Global/behavior.jsx";
import {
  CheckCircle2,
  Eye,
  Maximize2,
  MessageSquare,
  Minimize2,
  Paperclip,
  RotateCcw,
  Search,
  UserCircle,
  XCircle,
} from "lucide-react";
import {
  faMinus,
  faSort,
  faSortDown,
  faSortUp,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";

const DEFAULT_DETAIL_COLUMNS = [
  { key: "documentNo", label: "Document No." },
  { key: "documentDate", label: "Document Date" },
  { key: "description", label: "Description" },
  { key: "amount", label: "Amount", align: "right" },
];

const MIN_COLUMN_WIDTH = 80;
const MAX_AUTO_COLUMN_WIDTH = 260;
const MAX_MANUAL_COLUMN_WIDTH = 520;
const CHAR_WIDTH = 7;
const ACTION_COL_WIDTH = 184;
const FROZEN_DETAIL_COLUMN_COUNT = 2;
const MOBILE_DETAIL_LIMIT = 8;

const fieldClassName =
  "h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-[12px] text-slate-800 outline-none";

const DisapprovalReasonModal = ({
  isOpen,
  rows = [],
  reason,
  isProcessing,
  title = "Disapprove Document",
  description,
  fieldLabel = "Reason for Disapproval",
  placeholder = "Explain why you are disapproving this document...",
  submitLabel = "Disapprove",
  variant = "danger",
  onReasonChange,
  onCancel,
  onSubmit,
}) => {
  if (!isOpen) return null;

  const rowCount = rows.length;
  const isDanger = variant === "danger";
  const NoticeIcon = isDanger ? XCircle : MessageSquare;
  const noticeClasses = isDanger
    ? "border-red-500 bg-red-50 text-red-800"
    : "border-blue-500 bg-blue-50 text-blue-800";
  const iconClassName = isDanger ? "text-red-500" : "text-blue-500";
  const focusClassName = isDanger
    ? "focus:border-red-500 focus:ring-red-500/20"
    : "focus:border-blue-500 focus:ring-blue-500/20";
  const submitClassName = isDanger
    ? "bg-red-600 hover:bg-red-700"
    : "bg-blue-600 hover:bg-blue-700";
  const summary =
    description ||
    `Provide the reason for disapproving ${rowCount} selected transaction${
      rowCount > 1 ? "s" : ""
    }.`;

  return (
    <div className="fixed inset-0 z-[10050] flex items-center justify-center bg-gray-900/25 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between bg-white px-6 pb-2 pt-5">
          <h2 className="text-lg font-black tracking-tight text-gray-900">
            {title}
          </h2>

          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="text-gray-400 transition-colors hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <XCircle size={20} />
          </button>
        </div>

        <div className="space-y-4 px-6 pb-6 pt-2">
          <div className={`flex items-start gap-3 rounded-r-md border-l-4 p-3 ${noticeClasses}`}>
            <NoticeIcon className={`mt-0.5 shrink-0 ${iconClassName}`} size={20} />
            <p className="text-left text-sm font-medium leading-snug">
              {summary}
            </p>
          </div>

          <div>
            <label className="mb-1 block text-left text-sm font-semibold text-gray-700">
              {fieldLabel}
            </label>
            <textarea
              value={reason}
              onChange={(event) => onReasonChange(event.target.value)}
              placeholder={placeholder}
              rows={3}
              disabled={isProcessing}
              className={`w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-left text-sm shadow-sm focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-gray-100 ${focusClassName}`}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50 px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onSubmit}
            disabled={isProcessing}
            className={`rounded-lg border border-transparent px-4 py-2 text-sm font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-40 ${submitClassName}`}
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

const isDocNoColumn = (key) => String(key || "").toLowerCase() === "docno";
const isBoldValueColumn = (key) =>
  ["docno", "branchcode"].includes(String(key || "").toLowerCase());

const getRowKey = (row, index) =>
  String(
    row?.id ||
      row?.documentID ||
      row?.docID ||
      row?.docNo ||
      row?.documentNo ||
      row?.prNo ||
      row?.PR_NO ||
      index,
  );

const getDocumentNo = (row) =>
  String(
    row?.documentNo ||
      row?.docNo ||
      row?.prNo ||
      row?.PR_NO ||
      row?.tranNo ||
      row?.tranId ||
      "",
  ).trim();

const getRowsDocumentLabel = (rows) => {
  const targetRows = Array.isArray(rows) ? rows.filter(Boolean) : [];

  if (targetRows.length > 1) return "Various";

  return getDocumentNo(targetRows[0]) || "-";
};

const getRowStatus = (row) =>
  String(
    row?.status ||
      row?.approvalStatus ||
      row?.appStatus ||
      row?.prStatus ||
      row?.documentStatus ||
      "",
  ).toLowerCase();

const openDocumentPath = (path) => {
  if (!path) return false;

  const documentPath = String(path);
  const url = /^https?:\/\//i.test(documentPath)
    ? documentPath
    : `${window.location.origin}${documentPath.startsWith("/") ? "" : "/"}${documentPath}`;

  window.open(url, "_blank", "noopener,noreferrer");
  return true;
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const includesFilter = (value, filterValue) => {
  const needle = String(filterValue || "").trim().toUpperCase();
  if (!needle) return true;
  return String(value ?? "").toUpperCase().includes(needle);
};

const normalizeDetailColumns = (columns) => {
  const source = Array.isArray(columns) ? columns : DEFAULT_DETAIL_COLUMNS;

  return source
    .filter((column) => column && !column.hidden)
    .map((column) => {
      const renderType = column.renderType || column.type;
      const isNumeric = renderType === "number" || renderType === "currency";

      return {
        ...column,
        key: column.key || column.dataField || column.field || column.name,
        label:
          column.label ||
          column.header ||
          column.headerName ||
          column.caption ||
          column.name,
        align: column.align || (isNumeric ? "right" : "left"),
        renderType,
      };
    })
    .filter((column) => column.key);
};

const formatCellValue = (value, column) => {
  if (value === null || value === undefined) return "";

  if (column?.render) return column.render(value);

  if (column?.renderType === "date" || column?.type === "date") {
    try {
      const datePart = String(value).split("T")[0];
      return typeof useReturnToDate === "function"
        ? useReturnToDate(datePart)
        : datePart;
    } catch {
      return String(value);
    }
  }

  if (
    column?.type === "number" ||
    column?.type === "currency" ||
    column?.renderType === "number" ||
    column?.renderType === "currency"
  ) {
    const amount = Number(String(value).replace(/,/g, ""));
    if (!Number.isFinite(amount)) return value;

    return amount.toLocaleString("en-US", {
      minimumFractionDigits: column?.decimalPlaces ?? 2,
      maximumFractionDigits: column?.decimalPlaces ?? 2,
    });
  }

  return String(value);
};

const estimateColumnWidth = (column, rows) => {
  const minWidth = Number(column.minWidth) || MIN_COLUMN_WIDTH;
  const maxWidth = Number(column.maxWidth) || MAX_AUTO_COLUMN_WIDTH;
  const label = column.label || column.key || "";

  const longestLength = [label, ...rows.map((row) => formatCellValue(row?.[column.key], column))]
    .map((value) => String(value ?? "").length)
    .reduce((longest, length) => Math.max(longest, length), 0);

  return clamp(longestLength * CHAR_WIDTH + 36, minWidth, maxWidth);
};

const GlobalApprovalModal = forwardRef(
  (
    {
      isOpen,
      title = "Approval",
      transactionLabel = "Transaction",
      documentName = transactionLabel,
      approverName = "",
      approverImageSrc = "",
      approvalLevel = "",
      department = "",
      detailColumns = DEFAULT_DETAIL_COLUMNS,
      detailRows = [],
      isDetailLoading = false,
      onRowApprove,
      onRowDisapprove,
      onRowComment,
      onViewDocument,
      onViewAttachment,
      onApprove,
      onReject,
      onComment,
      onApproveSelected,
      onRejectSelected,
      onCommentSelected,
      onReloadRecords,
      onReturn,
      onDetailChange,
      onDetailRowsChange,
      onClose,
      isProcessing = false,
      closeOnBackdrop = false,
    },
    ref,
  ) => {
    const [internalOpen, setInternalOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);
    const [approverImageFailed, setApproverImageFailed] = useState(false);
    const [filters, setFilters] = useState({});
    const [quickSearch, setQuickSearch] = useState("");
    const [localRows, setLocalRows] = useState([]);
    const [selectedRowKeys, setSelectedRowKeys] = useState(() => new Set());
    const [expandedMobileRowKeys, setExpandedMobileRowKeys] = useState(() => new Set());
    const [pendingDisapprovalRows, setPendingDisapprovalRows] = useState([]);
    const [disapprovalReason, setDisapprovalReason] = useState("");
    const [pendingCommentRows, setPendingCommentRows] = useState([]);
    const [approverNote, setApproverNote] = useState("");
    const [attachParams, setAttachParams] = useState(null);
    const [columnOrder, setColumnOrder] = useState([]);
    const [manualColumnWidths, setManualColumnWidths] = useState({});
    const [sortConfig, setSortConfig] = useState({
      key: null,
      direction: null,
    });
    const draggedColumnRef = useRef(null);
    const resizingColumnRef = useRef({
      key: "",
      startX: 0,
      startWidth: 0,
      minWidth: MIN_COLUMN_WIDTH,
    });

    const open = isOpen ?? internalOpen;
    const showApproverImage = Boolean(approverImageSrc) && !approverImageFailed;

    useEffect(() => {
      if (open) return;
      setIsMinimized(false);
      setIsMaximized(false);
      setPendingDisapprovalRows([]);
      setDisapprovalReason("");
      setPendingCommentRows([]);
      setApproverNote("");
    }, [open]);

    useEffect(() => {
      setApproverImageFailed(false);
    }, [approverImageSrc]);

    useImperativeHandle(ref, () => ({
      open: () => setInternalOpen(true),
      close: () => {
        setInternalOpen(false);
        onClose?.();
      },
    }));

    const baseColumns = useMemo(
      () => normalizeDetailColumns(detailColumns),
      [detailColumns],
    );

    useEffect(() => {
      const keys = baseColumns.map((column) => column.key);

      setColumnOrder((prev) => {
        const next = prev.filter((key) => keys.includes(key));
        keys.forEach((key) => {
          if (!next.includes(key)) next.push(key);
        });
        return next;
      });
    }, [baseColumns]);

    useEffect(() => {
      const handleMouseMove = (event) => {
        const resize = resizingColumnRef.current;
        if (!resize.key) return;

        const nextWidth = clamp(
          resize.startWidth + event.clientX - resize.startX,
          resize.minWidth,
          MAX_MANUAL_COLUMN_WIDTH,
        );

        setManualColumnWidths((prev) => ({
          ...prev,
          [resize.key]: nextWidth,
        }));
      };

      const handleMouseUp = () => {
        resizingColumnRef.current = {
          key: "",
          startX: 0,
          startWidth: 0,
          minWidth: MIN_COLUMN_WIDTH,
        };
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);

      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }, []);

    const columns = useMemo(() => {
      if (!columnOrder.length) return baseColumns;

      return columnOrder
        .map((key) => baseColumns.find((column) => column.key === key))
        .filter(Boolean);
    }, [baseColumns, columnOrder]);
    const hasColumns = columns.length > 0;

    useEffect(() => {
      setLocalRows(Array.isArray(detailRows) ? detailRows : []);
      setExpandedMobileRowKeys(new Set());
    }, [detailRows]);

    const rows = localRows;
    const columnWidths = useMemo(() => {
      return columns.reduce((widths, column) => {
        widths[column.key] =
          manualColumnWidths[column.key] ||
          Number(column.width) ||
          estimateColumnWidth(column, rows);
        return widths;
      }, {});
    }, [columns, rows, manualColumnWidths]);
    const detailTableWidth = useMemo(
      () =>
        columns.reduce(
          (totalWidth, column) =>
            totalWidth + (columnWidths[column.key] || MIN_COLUMN_WIDTH),
          ACTION_COL_WIDTH,
        ),
      [columns, columnWidths],
    );
    const frozenColumnLefts = useMemo(() => {
      let left = ACTION_COL_WIDTH;

      return columns.map((column) => {
        const currentLeft = left;
        left += columnWidths[column.key] || MIN_COLUMN_WIDTH;
        return currentLeft;
      });
    }, [columns, columnWidths]);
    const filteredRows = useMemo(() => {
      const quickNeedle = String(quickSearch || "").trim().toUpperCase();
      const nextRows = rows.filter((row) => {
        const matchesFilters = columns.every((column) =>
            includesFilter(
              formatCellValue(row?.[column.key], column),
              filters[column.key],
            ),
        );

        if (!matchesFilters) return false;
        if (!quickNeedle) return true;

        return columns.some((column) =>
          String(formatCellValue(row?.[column.key], column) ?? "")
            .toUpperCase()
            .includes(quickNeedle),
        );
      });

      if (!sortConfig.key || !sortConfig.direction) return nextRows;

      const column = columns.find((item) => item.key === sortConfig.key);
      const isNumeric =
        column?.renderType === "number" ||
        column?.renderType === "currency" ||
        column?.type === "number" ||
        column?.type === "currency";

      return [...nextRows].sort((a, b) => {
        const leftValue = a?.[sortConfig.key];
        const rightValue = b?.[sortConfig.key];

        const left = isNumeric
          ? Number(String(leftValue ?? "").replace(/,/g, ""))
          : String(formatCellValue(leftValue, column)).toLowerCase();
        const right = isNumeric
          ? Number(String(rightValue ?? "").replace(/,/g, ""))
          : String(formatCellValue(rightValue, column)).toLowerCase();

        const comparison = isNumeric
          ? (Number.isFinite(left) ? left : 0) - (Number.isFinite(right) ? right : 0)
          : left.localeCompare(right, undefined, { numeric: true });

        return sortConfig.direction === "asc" ? comparison : -comparison;
      });
    }, [rows, columns, filters, sortConfig]);

    useEffect(() => {
      setSelectedRowKeys((prev) => {
        const validKeys = new Set(rows.map((row, index) => getRowKey(row, index)));
        const next = new Set([...prev].filter((key) => validKeys.has(key)));
        return next.size === prev.size ? prev : next;
      });
    }, [rows]);

    const filteredRowKeys = useMemo(
      () =>
        filteredRows.map((row, index) => {
          const sourceIndex = rows.indexOf(row);
          return getRowKey(row, sourceIndex >= 0 ? sourceIndex : index);
        }),
      [filteredRows, rows],
    );
    const selectedRows = useMemo(
      () =>
        rows.filter((row, index) =>
          selectedRowKeys.has(getRowKey(row, index)),
        ),
      [rows, selectedRowKeys],
    );
    const allFilteredRowsSelected =
      filteredRowKeys.length > 0 &&
      filteredRowKeys.every((key) => selectedRowKeys.has(key));
    const statusCounts = useMemo(() => {
      return rows.reduce(
        (counts, row) => {
          const status = getRowStatus(row);
          counts.total += 1;

          if (["a", "approved", "approve"].includes(status)) counts.approved += 1;
          else if (["r", "rejected", "reject", "disapproved", "disapprove"].includes(status)) counts.rejected += 1;
          else if (["c", "cancelled", "canceled", "cancel"].includes(status)) counts.cancelled += 1;
          else counts.pending += 1;

          return counts;
        },
        { total: 0, pending: 0, approved: 0, rejected: 0, cancelled: 0 },
      );
    }, [rows]);

    const handleClose = () => {
      if (isProcessing) return;
      setIsMinimized(false);
      setIsMaximized(false);
      setInternalOpen(false);
      onClose?.();
    };

    const handleFilterChange = (key, value) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    };

    const handleToggleRowSelection = (row, rowIndex) => {
      const rowKey = getRowKey(row, rowIndex);

      setSelectedRowKeys((prev) => {
        const next = new Set(prev);
        if (next.has(rowKey)) next.delete(rowKey);
        else next.add(rowKey);
        return next;
      });
    };

    const handleToggleSelectAll = () => {
      setSelectedRowKeys((prev) => {
        const next = new Set(prev);

        if (allFilteredRowsSelected) {
          filteredRowKeys.forEach((key) => next.delete(key));
        } else {
          filteredRowKeys.forEach((key) => next.add(key));
        }

        return next;
      });
    };

    const handleToggleMobileDetails = (rowKey) => {
      setExpandedMobileRowKeys((prev) => {
        const next = new Set(prev);
        if (next.has(rowKey)) next.delete(rowKey);
        else next.add(rowKey);
        return next;
      });
    };

    const handleResetTable = () => {
      setFilters({});
      setQuickSearch("");
      setSortConfig({ key: null, direction: null });
      setSelectedRowKeys(new Set());
      onReloadRecords?.();
    };

    const renderColumnFilter = (column) => (
      <div className="relative">
        <input
          type="text"
          value={filters[column.key] || ""}
          onChange={(event) => handleFilterChange(column.key, event.target.value)}
          className="global-lookup-filter-text-ui"
          placeholder="Filter..."
        />
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
          size={12}
        />
      </div>
    );

    const handleSort = (key) => {
      setSortConfig((prev) => {
        if (prev.key !== key) return { key, direction: "asc" };
        if (prev.direction === "asc") return { key, direction: "desc" };
        return { key: null, direction: null };
      });
    };

    const handleHeaderDragStart = (key) => {
      draggedColumnRef.current = key;
    };

    const handleHeaderDrop = (targetKey) => {
      const sourceKey = draggedColumnRef.current;
      draggedColumnRef.current = null;

      if (!sourceKey || sourceKey === targetKey) return;

      setColumnOrder((prev) => {
        const currentOrder = prev.length
          ? [...prev]
          : columns.map((column) => column.key);
        const fromIndex = currentOrder.indexOf(sourceKey);
        const toIndex = currentOrder.indexOf(targetKey);

        if (fromIndex < 0 || toIndex < 0) return prev;

        const next = [...currentOrder];
        const [moved] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, moved);
        return next;
      });
    };

    const startColumnResize = (event, column) => {
      event.preventDefault();
      event.stopPropagation();

      resizingColumnRef.current = {
        key: column.key,
        startX: event.clientX,
        startWidth: columnWidths[column.key] || MIN_COLUMN_WIDTH,
        minWidth: Number(column.minWidth) || MIN_COLUMN_WIDTH,
      };
    };

    const handleRowApprove = (row) => {
      if (onRowApprove) {
        onRowApprove(row);
        return;
      }

      onApprove?.(row);
    };

    const openDisapprovalModal = async (targetRows) => {
      const rowsToDisapprove = Array.isArray(targetRows)
        ? targetRows.filter(Boolean)
        : [targetRows].filter(Boolean);

      if (!rowsToDisapprove.length) return;

      const disapprovalCount = rowsToDisapprove.length;
      const confirm = await useSwalProceedConfirm(
        `Disapprove ${documentName}?`,
        `Disapprove ${disapprovalCount} selected transaction${
          disapprovalCount > 1 ? "s" : ""
        }?`,
        "Yes, disapprove",
      );

      if (!confirm?.isConfirmed) return;

      setPendingDisapprovalRows(rowsToDisapprove);
      setDisapprovalReason("");
    };

    const handleRowDisapprove = (row) => {
      openDisapprovalModal(row);
    };

    const openCommentModal = (targetRows) => {
      const rowsToComment = Array.isArray(targetRows)
        ? targetRows.filter(Boolean)
        : [targetRows].filter(Boolean);

      if (!rowsToComment.length) return;

      setPendingCommentRows(rowsToComment);
      setApproverNote("");
    };

    const handleRowComment = (row, rowIndex) => {
      const rowKey = getRowKey(row, rowIndex);
      const shouldUseSelectedRows =
        selectedRows.length > 1 && selectedRowKeys.has(rowKey);

      openCommentModal(shouldUseSelectedRows ? selectedRows : row);
    };

    const handleApproveSelected = () => {
      if (!selectedRows.length) return;

      if (onApproveSelected) {
        onApproveSelected(selectedRows);
        return;
      }

      selectedRows.forEach((row) => handleRowApprove(row));
    };

    const handleRejectSelected = () => {
      if (!selectedRows.length) return;

      openDisapprovalModal(selectedRows);
    };

    const handleCloseDisapprovalModal = () => {
      if (isProcessing) return;

      setPendingDisapprovalRows([]);
      setDisapprovalReason("");
    };

    const handleCloseCommentModal = () => {
      if (isProcessing) return;

      setPendingCommentRows([]);
      setApproverNote("");
    };

    const handleSubmitDisapproval = async () => {
      const trimmedReason = disapprovalReason.trim();

      if (!trimmedReason) {
        useSwalErrorAlert(
          "Required Fields",
          "Reason for disapproval is required.",
        );
        return;
      }

      const rowsToDisapprove = pendingDisapprovalRows;
      setPendingDisapprovalRows([]);
      setDisapprovalReason("");

      let result;

      if (onRejectSelected) {
        result = await onRejectSelected(rowsToDisapprove, trimmedReason);
      } else if (onRowDisapprove) {
        result = await onRowDisapprove(
          rowsToDisapprove.length === 1
            ? rowsToDisapprove[0]
            : rowsToDisapprove,
          trimmedReason,
        );
      } else if (onReject) {
        result = await Promise.all(
          rowsToDisapprove.map((row) => onReject(row, trimmedReason)),
        );
      }

      if (result === false) return;
    };

    const handleSubmitComment = async () => {
      const trimmedNote = approverNote.trim();

      if (!trimmedNote) {
        useSwalErrorAlert(
          "Required Fields",
          "Approver's note is required.",
        );
        return;
      }

      const rowsToComment = pendingCommentRows;
      setPendingCommentRows([]);
      setApproverNote("");

      let result;

      if (onCommentSelected) {
        result = await onCommentSelected(rowsToComment, trimmedNote);
      } else if (onRowComment) {
        result = await onRowComment(
          rowsToComment.length === 1 ? rowsToComment[0] : rowsToComment,
          trimmedNote,
        );
      } else if (onComment) {
        result = await Promise.all(
          rowsToComment.map((row) => onComment(row, trimmedNote)),
        );
      }

      if (result === false) return;
    };

    const handleViewDocument = (row) => {
      if (onViewDocument) {
        onViewDocument(row);
        return;
      }

      openDocumentPath(row?.viewDocument || row?.pathUrl || row?.pathURL);
    };

    const handleViewAttachment = (row) => {
      if (onViewAttachment) {
        onViewAttachment(row);
        return;
      }

      const documentID = row?.tranId;
      if (!documentID) return;

      setAttachParams({
        DocumentID: documentID,
        DocumentNo: row?.docNo,
        DocumentName: documentName,
        viewOnly: true,
      });
    };

    const handleDetailChange = (rowIndex, fieldName, value) => {
      setLocalRows((prevRows) => {
        const nextRows = prevRows.map((row, index) =>
          index === rowIndex ? { ...row, [fieldName]: value } : row,
        );

        onDetailChange?.(rowIndex, fieldName, value, nextRows[rowIndex]);
        onDetailRowsChange?.(nextRows);

        return nextRows;
      });
    };

    if (!open) return null;

    if (isMinimized) {
      return (
        <div className="fixed inset-0 z-[9999] bg-transparent">
          <div className="absolute bottom-4 right-4 flex max-w-[calc(100vw-24px)] items-center gap-2 rounded-2xl border border-slate-200 bg-white/95 px-3 py-2 text-xs text-slate-700 shadow-2xl shadow-slate-900/20 backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:shadow-slate-900/25">
            <div className="min-w-0">
              <div className="max-w-[260px] truncate font-semibold text-slate-800">
                {title}
              </div>
              <div className="truncate text-[10px] text-slate-500">
                {transactionLabel}
              </div>
            </div>

            <div className="ml-2 flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => setIsMinimized(false)}
                className="h-7 rounded-lg border border-slate-300 bg-white px-3 text-[11px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                Restore
              </button>

              <button
                type="button"
                onClick={handleClose}
                disabled={isProcessing}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-500 shadow-sm hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                title="Close"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <>
        <div
          className={`fixed inset-0 z-[9999] bg-transparent ${
            isMaximized ? "p-0" : "p-2 md:p-4"
          } flex items-center justify-center`}
          onMouseDown={() => {
            if (closeOnBackdrop) handleClose();
          }}
        >
          <div
            className={`relative flex flex-col overflow-hidden border border-slate-200 bg-white shadow-xl ${
              isMaximized
                ? "h-[100dvh] w-screen rounded-none"
                : "h-[96dvh] w-full max-w-[1400px] rounded-xl md:h-[92vh] md:rounded-2xl"
            }`}
            onMouseDown={(event) => event.stopPropagation()}
          >
          {isProcessing && (
            <div className="absolute inset-0 z-[120] flex flex-col items-center justify-center bg-white/45 backdrop-blur-[1px]">
              <div className="rounded-xl border border-slate-200 bg-white/95 px-5 py-4 text-center shadow-xl">
                <LoadingSpinner />
                <div className="mt-2 text-[12px] font-semibold text-slate-700">
                  Processing approval...
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100 py-0.5 md:py-1">
            <div className="flex min-w-0 items-center gap-2 pl-2 sm:pl-3">
              <div className="min-w-0">
                <h2 className="global-lookup-headertext-ui truncate !text-[15px] md:!text-[18px]">{title}</h2>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsMinimized(true)}
                disabled={isProcessing}
                className="p-1.5 text-slate-400 transition-colors hover:text-blue-600 disabled:opacity-50 md:p-2"
                title="Minimize"
              >
                <FontAwesomeIcon icon={faMinus} />
              </button>

              <button
                type="button"
                onClick={() => setIsMaximized((prev) => !prev)}
                disabled={isProcessing}
                className="p-1.5 text-slate-400 transition-colors hover:text-blue-600 disabled:opacity-50 md:p-2"
                title={isMaximized ? "Restore" : "Maximize"}
              >
                {isMaximized ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </button>

              <button
                type="button"
                onClick={handleClose}
                disabled={isProcessing}
                className="p-1.5 text-slate-400 transition-colors hover:text-red-600 disabled:opacity-50 md:p-2"
                title="Close"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>
          </div>

          <div className="flex flex-1 flex-col overflow-hidden px-2 py-2 md:px-4 md:py-3">
            <section className="mb-2 md:mb-4">
              <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-3 gap-y-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 shadow-sm md:grid-cols-[minmax(240px,1.35fr)_repeat(4,minmax(120px,1fr))] md:gap-4 md:rounded-xl md:px-4 md:py-3">
                <div className="flex min-w-0 items-center gap-2 md:order-1 md:gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-blue-100 bg-blue-50 text-blue-600 md:h-10 md:w-10">
                    {showApproverImage ? (
                      <img
                        src={approverImageSrc}
                        alt={approverName ? `${approverName} profile` : "Approver profile"}
                        className="h-full w-full object-cover"
                        onError={() => setApproverImageFailed(true)}
                      />
                    ) : (
                      <UserCircle
                        size={22}
                        strokeWidth={1.8}
                        className="md:h-[30px] md:w-[30px]"
                      />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[11px] font-bold text-slate-900 md:text-[13px]">
                      {approverName || ""}
                    </div>
                    <div className="text-[9px] font-semibold text-slate-500 md:text-[11px]">
                      Approver
                    </div>
                  </div>
                </div>

                <div className="border-slate-200 text-right md:order-4 md:border-l md:pl-5">
                  <div className="text-[9px] font-semibold text-slate-500 md:text-[11px]">Total PRs</div>
                  <div className="text-[16px] font-bold leading-tight text-slate-900 md:text-[20px]">{statusCounts.total}</div>
                </div>

                <div className="border-slate-200 text-right md:order-5 md:border-l md:pl-5">
                  <div className="text-[9px] font-semibold text-slate-500 md:text-[11px]">Selected</div>
                  <div className="text-[16px] font-bold leading-tight text-blue-700 md:text-[20px]">{selectedRows.length}</div>
                </div>

                <div className="col-span-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-2 md:order-2 md:col-span-1 md:block md:border-l md:border-t-0 md:pl-5 md:pt-0">
                  <div className="min-w-0">
                    <div className="text-[9px] font-semibold text-slate-500 md:text-[11px]">Level</div>
                    <div className="truncate text-[11px] font-bold text-slate-900 md:text-[12px]">
                      {approvalLevel || ""}
                    </div>
                  </div>
                  <div className="min-w-0 md:hidden">
                    <div className="text-[9px] font-semibold text-slate-500">Department</div>
                    <div className="truncate text-[11px] font-bold text-slate-900">
                      {department || ""}
                    </div>
                  </div>
                </div>

                <div className="hidden min-w-0 border-slate-200 md:order-3 md:block md:border-l md:pl-5">
                  <div className="text-[11px] font-semibold text-slate-500">Department</div>
                  <div className="truncate text-[12px] font-bold text-slate-900">
                    {department || ""}
                  </div>
                </div>
              </div>
            </section>

            <section className="flex min-h-0 min-w-0 flex-1 overflow-hidden rounded-lg border border-slate-200 bg-white md:rounded-xl">
              <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-2 py-1.5 md:gap-3 md:px-3 md:py-2">
                  <div className="relative min-w-[170px] flex-1 max-w-[420px]">
                    <input
                      type="text"
                      value={quickSearch}
                      onChange={(event) => setQuickSearch(event.target.value)}
                      className="h-7 w-full rounded-md border border-slate-300 bg-white pl-7 pr-2 text-[11px] font-semibold text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 md:h-8 md:rounded-lg md:pl-8 md:pr-3 md:text-[12px]"
                      placeholder="Quick Search..."
                    />
                    <Search
                      className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 md:left-2.5"
                      size={13}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleResetTable}
                    disabled={isProcessing}
                    className="inline-flex h-7 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 md:h-8 md:gap-2 md:rounded-lg md:px-3 md:text-[12px]"
                  >
                    <RotateCcw size={13} />
                    <span className="hidden sm:inline">Reset</span>
                  </button>

                  <div className="flex w-full items-center gap-1.5 md:ml-auto md:w-auto md:gap-2">
                    <label className="inline-flex h-7 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 text-[10px] font-semibold text-slate-700 md:hidden">
                      <input
                        type="checkbox"
                        checked={allFilteredRowsSelected}
                        onChange={handleToggleSelectAll}
                        disabled={isProcessing || !filteredRows.length}
                        className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-40"
                      />
                      Select All
                    </label>

                    <button
                      type="button"
                      onClick={handleApproveSelected}
                      disabled={isProcessing || !selectedRows.length}
                      className="ml-auto inline-flex h-7 items-center gap-1.5 rounded-md border border-blue-600 bg-blue-600 px-2 text-[10px] font-bold text-white transition-colors hover:border-blue-700 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40 md:ml-0 md:h-8 md:gap-2 md:rounded-lg md:px-3 md:text-[12px]"
                    >
                      <CheckCircle2 size={13} strokeWidth={1.8} />
                      <span className="md:hidden">Approve All</span>
                      <span className="hidden md:inline">Approve Selected</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleRejectSelected}
                      disabled={isProcessing || !selectedRows.length}
                      className="inline-flex h-7 items-center gap-1.5 rounded-md border border-red-500 bg-red-500 px-2 text-[10px] font-bold text-white transition-colors hover:border-red-600 hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40 md:h-8 md:gap-2 md:rounded-lg md:px-3 md:text-[12px]"
                    >
                      <XCircle size={13} strokeWidth={1.8} />
                      <span className="md:hidden">Disapprove All</span>
                      <span className="hidden md:inline">Disapprove Selected</span>
                    </button>
                  </div>
                </div>
              <div className="min-h-0 min-w-0 flex-1 overflow-auto bg-slate-50 p-2 md:hidden">
                {isDetailLoading ? (
                  <div className="flex min-h-[220px] items-center justify-center">
                    <LoadingSpinner />
                  </div>
                ) : filteredRows.length ? (
                  <div className="space-y-2">
                    {filteredRows.map((row, rowIndex) => {
                      const sourceIndex = rows.indexOf(row);
                      const selectionIndex = sourceIndex >= 0 ? sourceIndex : rowIndex;
                      const rowKey = getRowKey(row, selectionIndex);
                      const selected = selectedRowKeys.has(rowKey);
                      const primaryColumn =
                        columns.find((column) => isDocNoColumn(column.key)) ||
                        columns[0];
                      const secondaryColumns = columns.filter(
                        (column) => column.key !== primaryColumn?.key,
                      );
                      const isMobileDetailsExpanded = expandedMobileRowKeys.has(rowKey);
                      const visibleSecondaryColumns = isMobileDetailsExpanded
                        ? secondaryColumns
                        : secondaryColumns.slice(0, MOBILE_DETAIL_LIMIT);
                      const hiddenSecondaryColumnCount =
                        secondaryColumns.length - visibleSecondaryColumns.length;

                      return (
                        <article
                          key={rowKey}
                          className="rounded-md border border-slate-200 bg-white p-2 shadow-sm"
                        >
                          <div className="flex items-start gap-2">
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => handleToggleRowSelection(row, selectionIndex)}
                              disabled={isProcessing}
                              className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-40"
                              aria-label="Select row"
                            />

                            <div className="min-w-0 flex-1">
                              <div className="text-[9px] font-semibold uppercase text-slate-500">
                                {primaryColumn?.label || documentName}
                              </div>
                              <div className="truncate text-[12px] font-normal text-slate-900">
                                {primaryColumn
                                  ? formatCellValue(row?.[primaryColumn.key], primaryColumn)
                                  : documentName}
                              </div>
                            </div>
                          </div>

                          <div className="mt-2 divide-y divide-slate-100 border-t border-slate-100">
                            {visibleSecondaryColumns.map((column) => (
                              <div
                                key={column.key}
                                className="grid min-w-0 grid-cols-[42%_minmax(0,1fr)] items-center gap-2 py-1"
                              >
                                <div className="truncate text-[9px] font-semibold text-slate-500">
                                  {column.label}
                                </div>
                                <div
                                  className={`truncate text-[10px] font-normal text-slate-800 ${
                                    column.align === "right" ? "text-right tabular-nums" : ""
                                  }`}
                                >
                                  {formatCellValue(row?.[column.key], column)}
                                </div>
                              </div>
                            ))}
                          </div>

                          {secondaryColumns.length > MOBILE_DETAIL_LIMIT && (
                            <button
                              type="button"
                              onClick={() => handleToggleMobileDetails(rowKey)}
                              className="mt-1.5 text-[10px] font-semibold text-blue-600 hover:text-blue-700"
                            >
                              {isMobileDetailsExpanded
                                ? "See less"
                                : `See more (${hiddenSecondaryColumnCount})`}
                            </button>
                          )}

                          <div className="mt-2 grid grid-cols-5 gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleRowApprove(row)}
                              disabled={isProcessing}
                              className="inline-flex h-9 flex-col items-center justify-center gap-0.5 rounded border border-emerald-200 bg-emerald-50 text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                              title="Approve"
                              aria-label="Approve"
                            >
                              <CheckCircle2 size={13} strokeWidth={1.8} />
                              <span className="text-[8px] font-semibold leading-none">Approve</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRowDisapprove(row)}
                              disabled={isProcessing}
                              className="inline-flex h-9 flex-col items-center justify-center gap-0.5 rounded border border-red-200 bg-red-50 text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                              title="Disapprove"
                              aria-label="Disapprove"
                            >
                              <XCircle size={13} strokeWidth={1.8} />
                              <span className="text-[8px] font-semibold leading-none">Disapprove</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleViewDocument(row)}
                              disabled={isProcessing}
                              className="inline-flex h-9 flex-col items-center justify-center gap-0.5 rounded border border-blue-200 bg-blue-50 text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                              title="View Document"
                              aria-label="View Document"
                            >
                              <Eye size={13} strokeWidth={1.8} />
                              <span className="text-[8px] font-semibold leading-none">View</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleViewAttachment(row)}
                              disabled={isProcessing}
                              className="inline-flex h-9 flex-col items-center justify-center gap-0.5 rounded border border-amber-200 bg-amber-50 text-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
                              title="View Attachment"
                              aria-label="View Attachment"
                            >
                              <Paperclip size={13} strokeWidth={1.8} />
                              <span className="text-[8px] font-semibold leading-none">Attach</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRowComment(row, selectionIndex)}
                              disabled={isProcessing}
                              className="inline-flex h-9 flex-col items-center justify-center gap-0.5 rounded border border-blue-200 bg-blue-50 text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                              title="Approver's Note"
                              aria-label="Approver's Note"
                            >
                              <MessageSquare size={13} strokeWidth={1.8} />
                              <span className="text-[8px] font-semibold leading-none">Note</span>
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="px-3 py-10 text-center text-[12px] text-slate-500">
                    No approval detail available.
                  </div>
                )}
              </div>

              <div
                className="relative hidden min-h-0 min-w-0 flex-1 overflow-auto md:block"
              >
                <table
                  className="table-fixed border-separate border-spacing-0 text-[11px]"
                  style={{
                    width: Math.max(detailTableWidth, 760),
                    minWidth: Math.max(detailTableWidth, 760),
                  }}
                >
                  <thead className="sticky top-0 z-30 bg-slate-200 text-slate-800">
                    <tr>
                      {hasColumns && (
                        <th
                          className="sticky left-0 top-0 z-50 border-b border-r border-slate-300 bg-slate-200 px-1.5 py-2 text-left font-bold shadow-[4px_0_6px_-6px_rgba(15,23,42,0.35)]"
                          style={{
                            left: 0,
                            width: ACTION_COL_WIDTH,
                            minWidth: ACTION_COL_WIDTH,
                            maxWidth: ACTION_COL_WIDTH,
                          }}
                        >
                          <div className="flex h-full items-center justify-start gap-2">
                            <label className="flex cursor-pointer items-center gap-1.5 text-[11px] font-bold text-slate-700">
                              <input
                                type="checkbox"
                                checked={allFilteredRowsSelected}
                                onChange={handleToggleSelectAll}
                                disabled={isProcessing || !filteredRows.length}
                                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-40"
                              />
                              Select All
                            </label>
                            <span className="text-slate-400">|</span>
                            <span>Action</span>
                          </div>
                        </th>
                      )}
                      {columns.map((column, columnIndex) => {
                        const isFrozenColumn = columnIndex < FROZEN_DETAIL_COLUMN_COUNT;

                        return (
                        <th
                          key={column.key}
                          draggable
                          onDragStart={() => handleHeaderDragStart(column.key)}
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={() => handleHeaderDrop(column.key)}
                          onClick={() => handleSort(column.key)}
                          className={`whitespace-nowrap border-b border-slate-300 px-2 py-2 font-bold ${
                            column.align === "right" ? "text-right" : "text-left"
                          } relative cursor-pointer select-none ${
                            isFrozenColumn
                              ? "sticky top-0 z-40 border-r border-slate-300 bg-slate-200"
                              : ""
                          }`}
                          style={{
                            left: isFrozenColumn
                              ? frozenColumnLefts[columnIndex]
                              : undefined,
                            width: columnWidths[column.key],
                            minWidth: columnWidths[column.key],
                            maxWidth: columnWidths[column.key],
                          }}
                        >
                          <div className="flex items-center justify-between gap-2 overflow-hidden">
                            <span className="truncate">{column.label}</span>
                            <FontAwesomeIcon
                              icon={
                                sortConfig.key === column.key
                                  ? sortConfig.direction === "asc"
                                    ? faSortUp
                                    : faSortDown
                                  : faSort
                              }
                              className="shrink-0 text-[10px] text-slate-500"
                            />
                          </div>
                          <div
                            role="presentation"
                            onMouseDown={(event) => startColumnResize(event, column)}
                            onClick={(event) => event.stopPropagation()}
                            draggable={false}
                            className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-blue-400/60"
                            title="Resize column"
                          />
                        </th>
                        );
                      })}
                    </tr>
                    <tr className="bg-slate-200">
                      {hasColumns && (
                        <th
                          className="sticky top-[34px] z-50 border-b border-r border-slate-300 bg-slate-200 px-1 py-1 shadow-[4px_0_6px_-6px_rgba(15,23,42,0.35)]"
                          style={{
                            left: 0,
                            width: ACTION_COL_WIDTH,
                            minWidth: ACTION_COL_WIDTH,
                            maxWidth: ACTION_COL_WIDTH,
                          }}
                        >
                          <div className="translate-x-1 truncate whitespace-nowrap text-center text-[8px] font-semibold leading-5 text-slate-600">
                            Approve | Disapprove | View | Attachment | Note
                          </div>
                        </th>
                      )}
                      {columns.map((column, columnIndex) => {
                        const isFrozenColumn = columnIndex < FROZEN_DETAIL_COLUMN_COUNT;

                        return (
                        <th
                          key={`filter-${column.key}`}
                          className={`border-b border-slate-300 px-1 py-1 ${
                            isFrozenColumn
                              ? "sticky top-[34px] z-40 border-r bg-slate-200"
                              : ""
                          }`}
                          style={{
                            left: isFrozenColumn
                              ? frozenColumnLefts[columnIndex]
                              : undefined,
                            width: columnWidths[column.key],
                            minWidth: columnWidths[column.key],
                            maxWidth: columnWidths[column.key],
                          }}
                        >
                          {renderColumnFilter(column)}
                        </th>
                        );
                      })}
                    </tr>
                  </thead>

                  <tbody className="text-slate-700">
                    {isDetailLoading ? (
                      <tr>
                        <td
                          colSpan={hasColumns ? columns.length + 1 : 1}
                          className="h-[220px] px-3 py-10 text-center text-[12px] text-slate-500"
                        >
                          <LoadingSpinner />
                        </td>
                      </tr>
                    ) : filteredRows.length ? (
                      filteredRows.map((row, rowIndex) => {
                        const sourceIndex = rows.indexOf(row);
                        const selectionIndex = sourceIndex >= 0 ? sourceIndex : rowIndex;
                        const rowKey = getRowKey(row, selectionIndex);
                        const rowBackgroundClass =
                          rowIndex % 2 === 0 ? "bg-white" : "bg-slate-50";

                        return (
                        <tr
                          key={rowKey}
                          className={`group border-b border-slate-200 ${rowBackgroundClass} hover:bg-blue-100`}
                        >
                          <td
                            className={`sticky z-10 border-b border-r border-slate-200 px-0.5 py-0.5 text-center shadow-[4px_0_6px_-6px_rgba(15,23,42,0.35)] group-hover:bg-blue-100 ${rowBackgroundClass}`}
                            style={{
                              left: 0,
                              width: ACTION_COL_WIDTH,
                              minWidth: ACTION_COL_WIDTH,
                              maxWidth: ACTION_COL_WIDTH,
                            }}
                          >
                            <div className="grid grid-cols-[22px_repeat(5,28px)] items-center justify-center gap-1">
                              <input
                                type="checkbox"
                                checked={selectedRowKeys.has(rowKey)}
                                onChange={() => handleToggleRowSelection(row, selectionIndex)}
                                disabled={isProcessing}
                                className="mx-auto h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-40"
                                aria-label="Select row"
                              />

                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleRowApprove(row);
                                }}
                                disabled={isProcessing}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-emerald-600 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                                title="Approve"
                                aria-label="Approve"
                              >
                                <CheckCircle2 size={15} strokeWidth={1.8} />
                              </button>

                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleRowDisapprove(row);
                                }}
                                disabled={isProcessing}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-red-600 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                                title="Disapprove"
                                aria-label="Disapprove"
                              >
                                <XCircle size={15} strokeWidth={1.8} />
                              </button>

                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleViewDocument(row);
                                }}
                                disabled={isProcessing}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-blue-600 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                                title="View Document"
                                aria-label="View Document"
                              >
                                <Eye size={15} strokeWidth={1.8} />
                              </button>

                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleViewAttachment(row);
                                }}
                                disabled={isProcessing}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-amber-600 transition-colors hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
                                title="View Attachment"
                                aria-label="View Attachment"
                              >
                                <Paperclip size={15} strokeWidth={1.8} />
                              </button>

                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleRowComment(row, selectionIndex);
                                }}
                                disabled={isProcessing}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-blue-600 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                                title="Approver's Note"
                                aria-label="Approver's Note"
                              >
                                <MessageSquare size={15} strokeWidth={1.8} />
                              </button>
                            </div>
                          </td>
                          {columns.map((column, columnIndex) => {
                            const isFrozenColumn = columnIndex < FROZEN_DETAIL_COLUMN_COUNT;

                            return (
                            <td
                              key={column.key}
                              className={`whitespace-nowrap overflow-hidden text-ellipsis border-b border-r border-slate-100 px-2 py-1 text-[11px] leading-tight ${
                                column.align === "right"
                                  ? "text-right tabular-nums"
                                  : "text-left"
                              } ${
                                isBoldValueColumn(column.key)
                                  ? "font-bold text-slate-900"
                                  : ""
                              } ${
                                isFrozenColumn
                                  ? `sticky z-10 border-r border-slate-200 group-hover:bg-blue-100 ${rowBackgroundClass}`
                                  : ""
                              }`}
                              style={{
                                left: isFrozenColumn
                                  ? frozenColumnLefts[columnIndex]
                                  : undefined,
                                width: columnWidths[column.key],
                                minWidth: columnWidths[column.key],
                                maxWidth: columnWidths[column.key],
                              }}
                            >
                              {formatCellValue(row?.[column.key], column)}
                            </td>
                            );
                          })}
                        </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td
                          colSpan={hasColumns ? columns.length + 1 : 1}
                          className="px-3 py-10 text-center text-[12px] text-slate-500"
                        >
                          No approval detail available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              </div>
            </section>

          </div>

          </div>
        </div>

        {attachParams && (
          <AttachDocumentModal
            isOpen={Boolean(attachParams)}
            params={attachParams}
            onClose={() => setAttachParams(null)}
          />
        )}

        <DisapprovalReasonModal
          isOpen={Boolean(pendingDisapprovalRows.length)}
          rows={pendingDisapprovalRows}
          reason={disapprovalReason}
          isProcessing={isProcessing}
          onReasonChange={setDisapprovalReason}
          onCancel={handleCloseDisapprovalModal}
          onSubmit={handleSubmitDisapproval}
        />

        <DisapprovalReasonModal
          isOpen={Boolean(pendingCommentRows.length)}
          rows={pendingCommentRows}
          reason={approverNote}
          isProcessing={isProcessing}
          title="Approver's Note"
          description={`Document No.: ${getRowsDocumentLabel(pendingCommentRows)}`}
          fieldLabel="Approver's Note"
          placeholder="Enter approver's note or comment..."
          submitLabel="Apply"
          variant="note"
          onReasonChange={setApproverNote}
          onCancel={handleCloseCommentModal}
          onSubmit={handleSubmitComment}
        />
      </>
    );
  },
);

export default GlobalApprovalModal;
