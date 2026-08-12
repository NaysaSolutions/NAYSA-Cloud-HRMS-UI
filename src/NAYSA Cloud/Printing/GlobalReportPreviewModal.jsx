import React, { useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCircleNotch,
  faDownload,
  faFileExcel,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";

import SearchGlobalReportTable from "@/NAYSA Cloud/Lookup/SearchGlobalReportTable.jsx";

const COLUMN_KEY_FIELDS = [
  "key",
  "field",
  "fieldName",
  "field_name",
  "columnName",
  "column_name",
  "colName",
  "dataField",
  "accessorKey",
  "accessor",
  "name",
];

const COLUMN_LABEL_FIELDS = [
  "label",
  "headerName",
  "header",
  "caption",
  "columnCaption",
  "column_caption",
  "displayName",
  "display_name",
  "title",
  "description",
];

const COLUMN_TYPE_FIELDS = [
  "renderType",
  "dataType",
  "data_type",
  "type",
  "columnType",
  "column_type",
  "formatType",
  "format_type",
];

const getFirstValue = (source, fields) => {
  for (const field of fields) {
    const value = source?.[field];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return "";
};

const parseConfig = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;

  if (typeof value === "string") {
    try {
      return parseConfig(JSON.parse(value));
    } catch {
      return [];
    }
  }

  return parseConfig(
    value?.data ??
      value?.columns ??
      value?.result ??
      value?.rows ??
      [],
  );
};

const humanizeColumnName = (value = "") =>
  String(value)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());

const isHiddenColumn = (column) => {
  const hidden = column?.hidden ?? column?.hide ?? column?.isHidden;
  const visible = column?.visible ?? column?.isVisible ?? column?.show;

  if (hidden === true || hidden === 1) return true;
  if (["Y", "YES", "TRUE", "1"].includes(String(hidden ?? "").toUpperCase())) {
    return true;
  }

  if (visible === false || visible === 0) return true;
  if (["N", "NO", "FALSE", "0"].includes(String(visible ?? "").toUpperCase())) {
    return true;
  }

  return false;
};

const normalizeRenderType = (rawType, key, rows) => {
  const type = String(rawType || "").trim().toLowerCase();

  if (["money", "currency", "amount"].includes(type)) return "currency";
  if (["number", "numeric", "decimal", "float", "double", "integer", "int"].includes(type)) {
    return "number";
  }
  if (["date", "datetime", "timestamp"].includes(type)) return "date";

  const sample = rows.find((row) => row?.[key] !== null && row?.[key] !== undefined)?.[key];
  if (typeof sample === "number") return "number";

  const normalizedKey = String(key || "").toLowerCase();
  if (/(^|_)(date|tran_date|doc_date|created_at|updated_at)($|_)/.test(normalizedKey)) {
    return "date";
  }
  if (/(amount|balance|debit|credit|cost|price|total|gross|net|tax|vat|qty|quantity|rate|variance|budget|actual)/.test(normalizedKey)) {
    return "number";
  }

  return "text";
};

const getRoundingOff = (column, renderType) => {
  const raw =
    column?.roundingOff ??
    column?.rounding_off ??
    column?.decimalPlaces ??
    column?.decimal_places ??
    column?.decimals ??
    column?.scale;

  const parsed = Number(raw);
  if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  return renderType === "currency" || renderType === "number" ? 2 : undefined;
};

const buildStandardColumns = (rows = [], configuredColumns = []) => {
  const actualKeys = [];
  const actualKeyMap = new Map();

  rows.forEach((row) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) return;

    Object.keys(row).forEach((key) => {
      const normalized = key.toLowerCase();
      if (!actualKeyMap.has(normalized)) {
        actualKeyMap.set(normalized, key);
        actualKeys.push(key);
      }
    });
  });

  const used = new Set();
  const configured = parseConfig(configuredColumns)
    .filter((column) => !isHiddenColumn(column))
    .map((column) => {
      const requestedKey = String(getFirstValue(column, COLUMN_KEY_FIELDS) || "").trim();
      if (!requestedKey) return null;

      const actualKey = actualKeyMap.get(requestedKey.toLowerCase());
      if (!actualKey || used.has(actualKey.toLowerCase())) return null;

      used.add(actualKey.toLowerCase());
      const renderType = normalizeRenderType(
        getFirstValue(column, COLUMN_TYPE_FIELDS),
        actualKey,
        rows,
      );

      return {
        key: actualKey,
        label: String(
          getFirstValue(column, COLUMN_LABEL_FIELDS) || humanizeColumnName(actualKey),
        ),
        renderType,
        roundingOff: getRoundingOff(column, renderType),
        width: Number(column?.width ?? column?.colWidth ?? column?.columnWidth) || undefined,
        minWidth: Number(column?.minWidth ?? column?.min_width) || undefined,
        maxWidth: Number(column?.maxWidth ?? column?.max_width) || undefined,
        sortable: column?.sortable !== false,
      };
    })
    .filter(Boolean);

  const fallback = actualKeys
    .filter((key) => !used.has(key.toLowerCase()))
    .map((key) => {
      const renderType = normalizeRenderType("", key, rows);
      return {
        key,
        label: humanizeColumnName(key),
        renderType,
        roundingOff: getRoundingOff({}, renderType),
        sortable: true,
      };
    });

  return [...configured, ...fallback];
};

const GlobalReportPreviewModal = ({
  isOpen,
  onClose,
  title = "Report Preview",
  rows = [],
  columns = [],
  onDownload,
  isDownloading = false,
  branchName = "",
  startDate = "",
  endDate = "",
}) => {
  const standardColumns = useMemo(
    () => buildStandardColumns(Array.isArray(rows) ? rows : [], columns),
    [rows, columns],
  );

  if (!isOpen) return null;

  const safeRows = Array.isArray(rows) ? rows : [];

  return (
    <div
      className="fixed inset-0 z-[220] flex items-center justify-center p-2 sm:p-5"
      style={{ background: "rgba(15, 23, 42, 0.62)", backdropFilter: "blur(5px)" }}
    >
      <div className="flex h-[94dvh] w-full max-w-[96vw] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex flex-shrink-0 items-center justify-between gap-3 bg-blue-600 px-4 py-3 text-white sm:px-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faFileExcel} className="text-emerald-200" />
              <h2 className="truncate text-sm font-bold sm:text-base">{title}</h2>
            </div>
            <p className="mt-1 truncate text-[10px] text-blue-100">
              {[
                branchName,
                startDate && endDate ? `${startDate} to ${endDate}` : "",
                `${safeRows.length.toLocaleString()} row${safeRows.length === 1 ? "" : "s"}`,
              ]
                .filter(Boolean)
                .join(" • ")}
            </p>
          </div>

          <div className="flex flex-shrink-0 items-center gap-2">
            {onDownload && (
              <button
                type="button"
                onClick={onDownload}
                disabled={isDownloading || safeRows.length === 0}
                className="flex items-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-[11px] font-bold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FontAwesomeIcon
                  icon={isDownloading ? faCircleNotch : faDownload}
                  spin={isDownloading}
                />
                <span className="hidden sm:inline">
                  {isDownloading ? "Downloading..." : "Download Excel"}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
              title="Close preview"
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-hidden p-2 sm:p-3">
          <SearchGlobalReportTable
            columns={standardColumns}
            data={safeRows}
            docType={title}
            showFilters
            showGlobalSearch
            showGroupBy
            pagination
            itemsPerPage={100}
            autoFit
            autoFillGrid
            tableSize="Full"
            className="h-full"
          />
        </main>
      </div>
    </div>
  );
};

export default GlobalReportPreviewModal;
