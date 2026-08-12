import React, { useState, useMemo, useEffect } from "react";
import {
  Search,
  ListTree,
  PackageOpen,
  Boxes,
  LayoutList,
  ChevronDown,
  ChevronRight,
  ShoppingCart,
  Settings,
  Save,
  Clock3,
  CheckCircle2,
  XCircle,
  RefreshCw,
  AlertTriangle,
  Eye,
  X,
} from "lucide-react";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import { apiClient, fetchData } from "../../../Configuration/BaseURL.jsx";
import { LoadingSpinner } from "../../../Global/utilities.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";

/* ─── helpers ─────────────────────────────────────────────────────────────── */
const pad2 = (value) => String(value).padStart(2, "0");

const formatDate = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

const formatDisplayDate = (value, includeTime = false) => {
  if (!value) return "-";

  const rawValue = String(value).trim();
  const dateMatch = rawValue.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2}))?/,
  );

  if (dateMatch) {
    const [, year, month, day, hour, minute] = dateMatch;
    const formattedDate = `${month}-${day}-${year}`;

    if (!includeTime || hour === undefined || minute === undefined) {
      return formattedDate;
    }

    const numericHour = Number(hour);
    const displayHour = numericHour % 12 || 12;
    const meridiem = numericHour >= 12 ? "PM" : "AM";
    return `${formattedDate} ${pad2(displayHour)}:${minute} ${meridiem}`;
  }

  const parsedDate = new Date(rawValue);
  if (Number.isNaN(parsedDate.getTime())) return rawValue;

  const formattedDate = `${pad2(parsedDate.getMonth() + 1)}-${pad2(
    parsedDate.getDate(),
  )}-${parsedDate.getFullYear()}`;

  if (!includeTime) return formattedDate;

  return `${formattedDate} ${parsedDate.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })}`;
};

const addDays = (date, days) => {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  return formatDate(d);
};

const getStartOfWeek = (date = new Date()) => {
  const d = new Date(date);
  const day = d.getDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - daysSinceMonday);
  return formatDate(d);
};

const getDateRange = (start, end) => {
  if (!start || !end) return [];
  const dates = [];
  let current = new Date(`${start}T00:00:00`);
  const last = new Date(`${end}T00:00:00`);
  while (current <= last) {
    dates.push(formatDate(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
};

const getDisplayDateRange = (start, end, today = formatDate(new Date())) => {
  const dates = getDateRange(start, end);

  if (dates.length <= 7) return dates;

  const currentDateIndex = dates.indexOf(today);
  if (currentDateIndex <= 0) return dates;

  return [
    ...dates.slice(currentDateIndex),
    ...dates.slice(0, currentDateIndex),
  ];
};

const shortDate = (iso) => {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const dayLabel = (iso) => {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-US", { weekday: "short" });
};

const normalizeDateKey = (value) => {
  if (!value) return "";

  const rawValue = String(value).trim();
  const isoMatch = rawValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  const parsedDate = new Date(rawValue);
  return Number.isNaN(parsedDate.getTime()) ? "" : formatDate(parsedDate);
};

const getCategoryLabel = (row = {}) => {
  const category = String(
    row?.categCode ?? row?.categoryCode ?? row?.category ?? "",
  ).trim();
  return category || "Uncategorized";
};

const getStoreKey = (row = {}) =>
  String(row?.storeCode ?? row?.store ?? "").trim();

const getStoreLabel = (row = {}) => {
  const storeName = String(
    row?.storeName ?? row?.branchName ?? row?.store ?? "",
  ).trim();
  const storeCode = String(row?.storeCode ?? "").trim();

  return storeName || storeCode || "Unspecified Store";
};

const getUnconfirmedOrderKey = (order = {}) =>
  `${order.storeCode}|${order.categCode}|${order.itemCode}|${order.deliveryDate}`;

const getUnconfirmedOrderQty = (order = {}) =>
  Number(
    order.editableQty ??
      order.orderQty ??
      order.qty ??
      order.storeQty ??
      order.totalQty ??
      0,
  );

const normalizeCommissarySetupRows = (rows = []) =>
  rows.map((row) => ({
    categCode: String(row.categCode || "").trim(),
    categName: String(row.categName || row.categCode || "").trim(),
    days: Math.max(0, Number.parseInt(row.days, 10) || 0),
    cutoffTime: String(row.cutoffTime || "").slice(0, 5),
  }));

const getDefaultUnconfirmedDeliveryDate = (
  rows = [],
  selectedCategory = "All",
) => {
  const categoryCode = String(selectedCategory || "All").trim().toUpperCase();
  const applicableRows =
    categoryCode === "ALL"
      ? rows
      : rows.filter(
          (row) => String(row.categCode || "").trim().toUpperCase() === categoryCode,
        );
  const deliveryLeadTimes = applicableRows
    .map((row) => Number.parseInt(row.days, 10))
    .filter((days) => Number.isFinite(days) && days >= 0);
  const deliveryLeadTime =
    deliveryLeadTimes.length > 0 ? Math.min(...deliveryLeadTimes) : 0;

  return addDays(formatDate(new Date()), deliveryLeadTime);
};

const addUniqueValue = (values = [], value) => {
  const normalizedValue = String(value ?? "").trim();
  if (!normalizedValue || values.includes(normalizedValue)) return values;
  return [...values, normalizedValue];
};

const getIntegrationStatus = (sentQty = 0, unsentQty = 0) => {
  const sent = Number(sentQty) || 0;
  const unsent = Number(unsentQty) || 0;

  if (unsent <= 0) return "Sent";
  if (sent > 0 && unsent > 0) return "Partially Sent";
  return "Not Sent";
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const findReadableErrorMessage = (value) => {
  if (typeof value === "string") return value.trim();

  if (Array.isArray(value)) {
    for (const item of value) {
      const message = findReadableErrorMessage(item);
      if (message) return message;
    }
    return "";
  }

  if (!value || typeof value !== "object") return "";

  for (const key of ["errorMessage", "message", "detail", "description"]) {
    const message = findReadableErrorMessage(value[key]);
    if (message) return message;
  }

  const technicalKeys = new Set([
    "errornumber",
    "errorline",
    "mode",
    "code",
    "status",
  ]);

  for (const [key, item] of Object.entries(value)) {
    if (technicalKeys.has(key.toLowerCase())) continue;

    const message = findReadableErrorMessage(item);
    if (message) return message;
  }

  return "";
};

const getApiErrorMessage = (error, fallbackMessage) => {
  let responseData = error?.response?.data;

  if (typeof responseData === "string") {
    const plainResponse = responseData.trim();

    if (plainResponse) {
      try {
        responseData = JSON.parse(plainResponse);
      } catch {
        return plainResponse;
      }
    }
  }

  const responseErrorMessage = findReadableErrorMessage(
    responseData?.errorMessage,
  );
  const procedureErrorMessage = findReadableErrorMessage(
    responseData?.errors?.errorMessage,
  );
  const nestedErrorMessage = findReadableErrorMessage(responseData?.error);
  const validationErrorMessage = findReadableErrorMessage(
    responseData?.errors,
  );
  const responseMessage = findReadableErrorMessage(responseData?.message);

  return (
    responseErrorMessage ||
    procedureErrorMessage ||
    nestedErrorMessage ||
    validationErrorMessage ||
    responseMessage ||
    (typeof error?.message === "string" ? error.message.trim() : "") ||
    fallbackMessage
  );
};

const tabs = [
  {
    key: "forecastSummary",
    label: "Forecast Summary",
    viewType: "forecast",
    icon: LayoutList,
    endpoint: "commissary/forecast-summary",
    detailed: false,
    emptyText: "No forecast quantity available for this date range.",
  },
  {
    key: "forecastDetailed",
    label: "Forecast Detailed",
    viewType: "forecast",
    icon: ListTree,
    endpoint: "commissary/forecast-detailed",
    detailed: true,
    emptyText: "No forecast detail available for this date range.",
  },
  {
    key: "forecastMaterialNeededSummary",
    label: "Material Needed Detailed",
    viewType: "forecast",
    icon: Boxes,
    endpoint: "commissary/forecast-material-needed-summary",
    materialSummary: true,
    emptyText: "No material summary available for this forecast date range.",
  },
  {
    key: "forecastMaterialNeeded",
    label: "Material Needed Summary",
    viewType: "forecast",
    icon: PackageOpen,
    endpoint: "commissary/forecast-material-needed",
    detailed: false,
    emptyText:
      "No material requirement available for this forecast date range.",
  },
  {
    key: "confirmedSummary",
    label: "Confirmed Summary",
    viewType: "confirmed",
    icon: LayoutList,
    endpoint: "commissary/confirmed-summary",
    detailed: false,
    emptyText: "No confirmed quantity available for this date range.",
  },
  {
    key: "confirmedDetailed",
    label: "Confirmed Detailed",
    viewType: "confirmed",
    icon: ListTree,
    endpoint: "commissary/confirmed-detailed",
    detailed: true,
    emptyText: "No confirmed detail available for this date range.",
  },
  {
    key: "confirmedMaterialNeededSummary",
    label: "Material Needed Detailed",
    viewType: "confirmed",
    icon: Boxes,
    endpoint: "commissary/confirmed-material-needed-summary",
    materialSummary: true,
    emptyText: "No material summary available for this confirmed date range.",
  },
  {
    key: "confirmedMaterialNeeded",
    label: "Material Needed",
    viewType: "confirmed",
    icon: PackageOpen,
    endpoint: "commissary/confirmed-material-needed",
    detailed: false,
    emptyText:
      "No material requirement available for this confirmed date range.",
  },
];

/* ─── shared UI ───────────────────────────────────────────────────────────── */
const FloatingField = ({
  id,
  label,
  type = "text",
  value,
  onChange,
  readOnly = false,
  disabled = false,
  children,
}) => {
  if (type === "select") {
    return (
      <div className="relative min-w-0 p-1 sm:p-2">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
          disabled={disabled || readOnly}
          className="peer global-tran-textbox-ui"
        >
          {children}
        </select>
        <label htmlFor={id} className="global-tran-floating-label">
          {label}
        </label>
      </div>
    );
  }

  return (
    <div className="relative min-w-0 p-1 sm:p-2">
      <input
        id={id}
        type={type}
        placeholder=" "
        value={value || ""}
        readOnly={readOnly}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.value)}
        className={`peer global-tran-textbox-ui ${readOnly || disabled ? "cursor-default bg-gray-50 dark:bg-gray-700" : ""}`}
      />
      <label htmlFor={id} className="global-tran-floating-label">
        {label}
      </label>
    </div>
  );
};

const unwrapData = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.result)) return response.result;
  return [];
};

const pivotRows = (rows = [], isDetailed = false) => {
  const map = new Map();

  rows.forEach((item) => {
    const itemCode = item.itemCode || "";
    const storeCode = item.storeCode || "";
    const deliveryDate = normalizeDateKey(item.deliveryDate);
    const qty = Number(item.qty ?? item.totalQty ?? item.storeQty ?? 0);

    if (!itemCode || !deliveryDate || !Number.isFinite(qty) || qty <= 0) {
      return;
    }

    const key = isDetailed ? `${storeCode}|${itemCode}` : itemCode;

    if (!map.has(key)) {
      map.set(key, {
        store: item.storeName || item.branchName || storeCode,
        storeName: item.storeName || item.branchName || "",
        storeCode,
        itemCode,
        itemDesc: item.itemDesc || item.itemName || "",
        categCode: item.categCode || item.categoryCode || "",
        uomCode: item.uomCode || "",
        dates: {},
        dateIntegration: {},
        total: 0,
        sentQty: 0,
        unsentQty: 0,
        soNumbers: [],
        drNumbers: [],
        soStatus: "",
        drStatus: "",
        integrationStatus: "Not Sent",
      });
    }

    const row = map.get(key);
    const itemSentQty = Number(item.sentQty) || 0;
    const itemUnsentQty =
      item.unsentQty === undefined || item.unsentQty === null
        ? qty
        : Number(item.unsentQty) || 0;

    row.dates[deliveryDate] = (Number(row.dates[deliveryDate]) || 0) + qty;
    row.total += qty;
    row.sentQty += itemSentQty;
    row.unsentQty += itemUnsentQty;
    row.soNumbers = addUniqueValue(row.soNumbers, item.soNumber);
    row.drNumbers = addUniqueValue(row.drNumbers, item.drNumber);
    row.soStatus =
      String(item.soStatus || "").trim() ||
      (row.soNumbers.length > 0 ? "Closed" : "");
    row.drStatus =
      String(item.drStatus || "").trim() ||
      (row.drNumbers.length > 0 ? "Open - For Picking" : "");
    row.integrationStatus = getIntegrationStatus(row.sentQty, row.unsentQty);

    if (!row.dateIntegration[deliveryDate]) {
      row.dateIntegration[deliveryDate] = {
        total: 0,
        sentQty: 0,
        unsentQty: 0,
        soNumbers: [],
        drNumbers: [],
        soBranchCode: "",
        drBranchCode: "",
        soStatus: "",
        drStatus: "",
        integrationStatus: "Not Sent",
      };
    }

    const dateIntegration = row.dateIntegration[deliveryDate];
    dateIntegration.total += qty;
    dateIntegration.sentQty += itemSentQty;
    dateIntegration.unsentQty += itemUnsentQty;
    dateIntegration.soNumbers = addUniqueValue(
      dateIntegration.soNumbers,
      item.soNumber,
    );
    dateIntegration.drNumbers = addUniqueValue(
      dateIntegration.drNumbers,
      item.drNumber,
    );
    dateIntegration.soBranchCode =
      String(item.soBranchCode || "").trim() ||
      dateIntegration.soBranchCode;
    dateIntegration.drBranchCode =
      String(item.drBranchCode || "").trim() ||
      dateIntegration.drBranchCode;
    dateIntegration.soStatus =
      String(item.soStatus || "").trim() ||
      (dateIntegration.soNumbers.length > 0 ? "Closed" : "");
    dateIntegration.drStatus =
      String(item.drStatus || "").trim() ||
      (dateIntegration.drNumbers.length > 0 ? "Open - For Picking" : "");
    dateIntegration.integrationStatus = getIntegrationStatus(
      dateIntegration.sentQty,
      dateIntegration.unsentQty,
    );
  });

  return Array.from(map.values()).map((row) => {
    const dateIntegration = Object.fromEntries(
      Object.entries(row.dateIntegration || {}).map(([date, detail]) => [
        date,
        {
          ...detail,
          soNumber: (detail.soNumbers || []).join(", "),
          drNumber: (detail.drNumbers || []).join(", "),
        },
      ]),
    );

    return {
      ...row,
      dateIntegration,
      soNumber: row.soNumbers.join(", "),
      drNumber: row.drNumbers.join(", "),
    };
  });
};

const buildMaterialSummaryRows = (rows = []) => {
  const materials = new Map();

  rows.forEach((item) => {
    const itemCode = String(item.itemCode || "").trim();
    const deliveryDate = normalizeDateKey(item.deliveryDate);
    const qty = Number(item.qty ?? item.totalQty ?? item.storeQty ?? 0);

    if (!itemCode || !deliveryDate || !Number.isFinite(qty) || qty <= 0) return;

    if (!materials.has(itemCode)) {
      materials.set(itemCode, {
        itemCode,
        itemDesc: item.itemDesc || item.itemName || "",
        categCode: item.categCode || item.categoryCode || "",
        uomCode: item.uomCode || "",
        dates: {},
        total: 0,
        produceItems: new Map(),
      });
    }

    const material = materials.get(itemCode);
    material.dates[deliveryDate] =
      (Number(material.dates[deliveryDate]) || 0) + qty;
    material.total += qty;

    const produceItemCode = String(
      item.produceItemCode || item.finishedItemCode || "Unspecified",
    ).trim();

    if (!material.produceItems.has(produceItemCode)) {
      material.produceItems.set(produceItemCode, {
        itemCode: produceItemCode,
        itemDesc:
          item.produceItemDesc ||
          item.produceItemName ||
          item.finishedItemName ||
          "Unspecified finished item",
        uomCode: item.produceUomCode || item.finishedUomCode || "",
        dates: {},
        total: 0,
        branches: new Map(),
      });
    }

    const produceItem = material.produceItems.get(produceItemCode);
    produceItem.dates[deliveryDate] =
      (Number(produceItem.dates[deliveryDate]) || 0) + qty;
    produceItem.total += qty;

    const branchCode = String(item.storeCode || item.branchCode || "").trim();
    const branchName = String(
      item.storeName || item.branchName || branchCode || "Unspecified Branch",
    ).trim();
    const branchKey = branchCode || branchName;

    if (!produceItem.branches.has(branchKey)) {
      produceItem.branches.set(branchKey, {
        branchCode,
        branchName,
        dates: {},
        total: 0,
      });
    }

    const branch = produceItem.branches.get(branchKey);
    branch.dates[deliveryDate] =
      (Number(branch.dates[deliveryDate]) || 0) + qty;
    branch.total += qty;
  });

  return Array.from(materials.values()).map((material) => ({
    ...material,
    produceItems: Array.from(material.produceItems.values()).map(
      (produceItem) => ({
        ...produceItem,
        branches: Array.from(produceItem.branches.values()).sort((a, b) =>
          String(a.branchName || a.branchCode).localeCompare(
            String(b.branchName || b.branchCode),
          ),
        ),
      }),
    ),
  }));
};

/* ─── Dynamic Date Range & Zero-Qty Filtering Helper ─────────────────── */
const filterByDates = (
  rows = [],
  validDates = [],
  isMaterialSummary = false,
) => {
  if (!validDates.length) return [];

  const normalizedDates = validDates.map(normalizeDateKey).filter(Boolean);
  const pickSelectedDates = (dateValues = {}) =>
    normalizedDates.reduce((selected, date) => {
      const quantity = Number(dateValues?.[date]) || 0;
      if (quantity > 0) selected[date] = quantity;
      return selected;
    }, {});

  if (!isMaterialSummary) {
    return rows
      .map((row) => {
        const dates = pickSelectedDates(row.dates);
        const total = normalizedDates.reduce(
          (sum, date) => sum + (Number(row.dates?.[date]) || 0),
          0,
        );
        const dateIntegration = normalizedDates.reduce((selected, date) => {
          if (row.dateIntegration?.[date]) {
            selected[date] = row.dateIntegration[date];
          }
          return selected;
        }, {});
        const sentQty = normalizedDates.reduce(
          (sum, date) =>
            sum + (Number(row.dateIntegration?.[date]?.sentQty) || 0),
          0,
        );
        const unsentQty = normalizedDates.reduce(
          (sum, date) =>
            sum + (Number(row.dateIntegration?.[date]?.unsentQty) || 0),
          0,
        );
        const soNumbers = normalizedDates.reduce(
          (values, date) =>
            (row.dateIntegration?.[date]?.soNumbers || []).reduce(
              addUniqueValue,
              values,
            ),
          [],
        );
        const drNumbers = normalizedDates.reduce(
          (values, date) =>
            (row.dateIntegration?.[date]?.drNumbers || []).reduce(
              addUniqueValue,
              values,
            ),
          [],
        );

        return {
          ...row,
          dates,
          dateIntegration,
          total,
          sentQty,
          unsentQty,
          soNumbers,
          drNumbers,
          soNumber: soNumbers.join(", "),
          drNumber: drNumbers.join(", "),
          integrationStatus: getIntegrationStatus(sentQty, unsentQty),
        };
      })
      .filter((row) => row.total > 0);
  }

  return rows
    .map((material) => {
      const produceItems = (material.produceItems || [])
        .map((prod) => {
          const branches = (prod.branches || [])
            .map((branch) => {
              const dates = pickSelectedDates(branch.dates);
              const total = normalizedDates.reduce(
                (sum, date) => sum + (Number(branch.dates?.[date]) || 0),
                0,
              );
              return { ...branch, dates, total };
            })
            .filter((branch) => branch.total > 0);

          const total = branches.reduce((sum, b) => sum + b.total, 0);
          return {
            ...prod,
            dates: pickSelectedDates(prod.dates),
            branches,
            total,
          };
        })
        .filter((prod) => prod.total > 0);

      const total = produceItems.reduce((sum, p) => sum + p.total, 0);
      return {
        ...material,
        dates: pickSelectedDates(material.dates),
        produceItems,
        total,
      };
    })
    .filter((material) => material.total > 0);
};

const QuantityCells = ({ dates, row, className = "" }) => (
  <>
    {dates.map((date) => (
      <td
        key={date}
        className={`global-tran-td-ui w-[96px] min-w-[96px] max-w-[96px] text-right font-medium ${className}`}
      >
        {row.dates?.[date] ? row.dates[date].toLocaleString() : "-"}
      </td>
    ))}
    <td
      className={`global-tran-td-ui w-[100px] min-w-[100px] max-w-[100px] text-right text-xs font-bold ${className}`}
    >
      {(Number(row.total) || 0).toLocaleString()}
    </td>
  </>
);

const IntegrationDateCell = ({ date, row }) => {
  const navigate = useNavigate();
  const quantity = Number(row.dates?.[date]) || 0;
  const detail = row.dateIntegration?.[date];

  if (quantity <= 0) {
    return (
      <td className="global-tran-td-ui w-[160px] min-w-[160px] max-w-[160px] text-center text-slate-400">
        -
      </td>
    );
  }

  const integrationStatus =
    detail?.integrationStatus ||
    getIntegrationStatus(detail?.sentQty, detail?.unsentQty);
  const getDocumentNumbers = (numbers, fallbackNumber) => {
    const values =
      Array.isArray(numbers) && numbers.length > 0
        ? numbers
        : String(fallbackNumber || "")
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean);

    return [...new Set(values.map((value) => String(value).trim()))].filter(
      Boolean,
    );
  };
  const soNumbers = getDocumentNumbers(detail?.soNumbers, detail?.soNumber);
  const drNumbers = getDocumentNumbers(detail?.drNumbers, detail?.drNumber);
  const hasDocuments = soNumbers.length > 0 || drNumbers.length > 0;

  const handleViewDocument = (documentType, documentNumber) => {
    const branchCode = String(
      documentType === "SO"
        ? detail?.soBranchCode
        : detail?.drBranchCode,
    ).trim();

    if (!branchCode) {
      Swal.fire({
        icon: "warning",
        title: `Unable to view ${documentType}`,
        text: `The branch code for ${documentType} ${documentNumber} is missing.`,
      });
      return;
    }

    const params = new URLSearchParams({
      branchCode,
      viewDocument: "true",
    });

    if (documentType === "SO") {
      params.set("soNo", documentNumber);
    } else {
      // DR currently reads "soNo" when loading a document from the URL.
      // Keep "drNo" too so this remains compatible once DR uses its own key.
      params.set("drNo", documentNumber);
      params.set("soNo", documentNumber);
    }

    navigate(`/page/${documentType}?${params.toString()}`);
  };

  const renderDocumentReference = (
    documentType,
    documentNumbers,
    colorClasses,
  ) => (
    <>
      {documentNumbers.length > 0 ? (
        documentNumbers.map((documentNumber) => (
          <div
            key={`${documentType}-${documentNumber}`}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1"
          >
            <span
              className={`min-w-0 truncate font-mono text-[10px] font-semibold ${colorClasses}`}
              title={`${documentType} ${documentNumber}`}
            >
              {documentNumber}
            </span>
            <button
              type="button"
              onClick={() =>
                handleViewDocument(documentType, documentNumber)
              }
              className="inline-flex shrink-0 items-center gap-0.5 rounded border border-slate-200 bg-white px-1 py-0 text-[9px] font-bold leading-4 text-slate-600 shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400/40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-blue-500 dark:hover:bg-blue-950 dark:hover:text-blue-200"
              title={`View ${documentType} ${documentNumber}`}
              aria-label={`View ${documentType} ${documentNumber}`}
            >
              <Eye className="h-2 w-2" />
              View
            </button>
          </div>
        ))
      ) : null}
    </>
  );

  return (
    <td className="global-tran-td-ui w-[160px] min-w-[160px] max-w-[160px] !px-1.5 !py-1 text-left align-top leading-tight">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1">
        <span className="truncate text-[10px] font-bold text-slate-800 dark:text-slate-100">
          Qty: {quantity.toLocaleString()}
        </span>
        <span
          className={`inline-flex shrink-0 rounded-full px-1.5 py-0 text-[9px] font-bold leading-4 ${
            integrationStatus === "Sent"
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200"
              : integrationStatus === "Partially Sent"
                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200"
                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
          }`}
        >
          {integrationStatus}
        </span>
      </div>
      {hasDocuments && (
        <div className="mt-1 grid gap-0.5 border-t border-slate-100 pt-1 dark:border-slate-700">
          {renderDocumentReference(
            "SO",
            soNumbers,
            "text-emerald-700 dark:text-emerald-300",
          )}
          {renderDocumentReference(
            "DR",
            drNumbers,
            "text-blue-700 dark:text-blue-300",
          )}
        </div>
      )}
    </td>
  );
};

const MaterialSummaryRows = ({
  materials,
  dates,
  expandedMaterials,
  onToggleMaterial,
}) => (
  <>
    {materials.map((material) => {
      const isExpanded = expandedMaterials.includes(material.itemCode);

      return (
        <React.Fragment key={`material-${material.itemCode}`}>
          <tr className="bg-white hover:bg-slate-50 dark:bg-black dark:hover:bg-gray-900/50">
            <td className="global-tran-td-ui w-[180px] min-w-[180px] text-left font-semibold text-slate-600 dark:text-slate-300">
              All Branches
            </td>
            <td className="global-tran-td-ui w-[120px] min-w-[120px] text-left font-mono text-sm">
              <button
                type="button"
                onClick={() => onToggleMaterial(material.itemCode)}
                className="flex w-full items-center gap-1 font-semibold text-blue-700 hover:text-blue-900 dark:text-blue-300"
                aria-expanded={isExpanded}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0" />
                )}
                {material.itemCode}
              </button>
            </td>
            <td className="global-tran-td-ui w-[260px] min-w-[260px] text-left font-semibold">
              {material.itemDesc}
            </td>
            <td className="global-tran-td-ui w-[90px] min-w-[90px] text-left font-semibold text-slate-600 dark:text-slate-300">
              {material.uomCode || "-"}
            </td>
            <QuantityCells
              dates={dates}
              row={material}
              className="bg-slate-50 text-blue-700 dark:bg-gray-900 dark:text-blue-300"
            />
          </tr>

          {isExpanded &&
            material.produceItems.map((produceItem) => (
              <React.Fragment
                key={`produce-${material.itemCode}-${produceItem.itemCode}`}
              >
                <tr className="bg-emerald-50/70 dark:bg-emerald-950/20">
                  <td className="global-tran-td-ui w-[180px] min-w-[180px] text-left text-xs font-bold uppercase text-emerald-700 dark:text-emerald-300"></td>
                  <td className="global-tran-td-ui w-[120px] min-w-[120px] pl-7 text-left font-mono text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                    {produceItem.itemCode}
                  </td>
                  <td className="global-tran-td-ui w-[260px] min-w-[260px] text-left font-medium">
                    {produceItem.itemDesc}
                  </td>
                  <td className="global-tran-td-ui w-[90px] min-w-[90px] text-left font-semibold text-slate-600 dark:text-slate-300">
                    {produceItem.uomCode || "-"}
                  </td>
                  <QuantityCells dates={dates} row={produceItem} />
                </tr>

                {produceItem.branches.map((branch) => (
                  <tr
                    key={`branch-${material.itemCode}-${produceItem.itemCode}-${branch.branchCode || branch.branchName}`}
                    className="bg-slate-50/80 hover:bg-slate-100 dark:bg-gray-950 dark:hover:bg-gray-900"
                  >
                    <td className="global-tran-td-ui w-[180px] min-w-[180px] pl-7 text-left font-semibold text-slate-700 dark:text-slate-200">
                      {branch.branchName || branch.branchCode}
                    </td>
                    <td className="global-tran-td-ui w-[120px] min-w-[120px] text-left text-xs font-semibold text-slate-500">
                      Required
                    </td>
                    <td className="global-tran-td-ui w-[260px] min-w-[260px] text-left text-xs text-slate-500">
                      Material needed
                    </td>
                    <td className="global-tran-td-ui w-[90px] min-w-[90px] text-left font-semibold text-slate-600 dark:text-slate-300">
                      {material.uomCode || "-"}
                    </td>
                    <QuantityCells dates={dates} row={branch} />
                  </tr>
                ))}
              </React.Fragment>
            ))}
        </React.Fragment>
      );
    })}
  </>
);

/* ─── main component ──────────────────────────────────────────────────────── */
export default function CommissaryForecast() {
  const { currentUserRow } = useAuth();
  const [startDate, setStartDate] = useState(() => getStartOfWeek());
  const [endDate, setEndDate] = useState(() =>
    addDays(getStartOfWeek(), 6),
  );
  const [category, setCategory] = useState("All");
  const [viewType, setViewType] = useState("forecast");
  const [activeTab, setActiveTab] = useState("forecastSummary");
  const [storeFilter, setStoreFilter] = useState("All");
  const [collapsedCategoriesByTab, setCollapsedCategoriesByTab] = useState({});
  const [expandedMaterialsByTab, setExpandedMaterialsByTab] = useState({});

  const [tabData, setTabData] = useState({
    forecastSummary: [],
    forecastDetailed: [],
    forecastMaterialNeededSummary: [],
    forecastMaterialNeeded: [],
    confirmedSummary: [],
    confirmedDetailed: [],
    confirmedMaterialNeededSummary: [],
    confirmedMaterialNeeded: [],
  });

  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [categoryDescriptionsByCode, setCategoryDescriptionsByCode] = useState(
    {},
  );
  const [branchNamesByCode, setBranchNamesByCode] = useState({});
  const [errorMessage, setErrorMessage] = useState("");
  const [setupRows, setSetupRows] = useState([]);
  const [setupSearch, setSetupSearch] = useState("");
  const [isLoadingSetup, setIsLoadingSetup] = useState(false);
  const [isSavingSetup, setIsSavingSetup] = useState(false);
  const [unconfirmedOrders, setUnconfirmedOrders] = useState([]);
  const [unconfirmedDeliveryDate, setUnconfirmedDeliveryDate] = useState("");
  const [collapsedUnconfirmedCategories, setCollapsedUnconfirmedCategories] =
    useState([]);
  const [isLoadingUnconfirmed, setIsLoadingUnconfirmed] = useState(false);
  const [decisionKey, setDecisionKey] = useState("");
  const [setupMessage, setSetupMessage] = useState("");
  const [setupError, setSetupError] = useState("");
  const [unconfirmedMessage, setUnconfirmedMessage] = useState("");
  const [unconfirmedError, setUnconfirmedError] = useState("");

  const [isGeneratingWO, setIsGeneratingWO] = useState(false);
  const [isSendingToSODR, setIsSendingToSODR] = useState(false);
  const [woSuccessMsg, setWoSuccessMsg] = useState("");
  const [showSODRModal, setShowSODRModal] = useState(false);
  const [selectedIntegrationRowIds, setSelectedIntegrationRowIds] = useState(
    [],
  );
  const [integrationCustomers, setIntegrationCustomers] = useState([]);
  const [isLoadingIntegrationCustomers, setIsLoadingIntegrationCustomers] =
    useState(false);
  const [
    selectedIntegrationCustomersByStore,
    setSelectedIntegrationCustomersByStore,
  ] = useState({});
  const [customerLookupStoreCode, setCustomerLookupStoreCode] = useState("");
  const [customerLookupSearch, setCustomerLookupSearch] = useState("");
  const [soDrForm, setSoDrForm] = useState({
    poNumber: "",
    remarks: "",
  });

  const resetSODRModalData = () => {
    setSoDrForm({
      poNumber: "",
      remarks: "",
    });
    setIntegrationCustomers([]);
    setSelectedIntegrationCustomersByStore({});
    setCustomerLookupStoreCode("");
    setCustomerLookupSearch("");
    setSelectedIntegrationRowIds([]);
    setIsLoadingIntegrationCustomers(false);
  };

  const handleCloseSODRModal = () => {
    setShowSODRModal(false);
    resetSODRModalData();
  };

  const visibleTabs = useMemo(
    () => tabs.filter((tab) => tab.viewType === viewType),
    [viewType],
  );

  const activeTabConfig = useMemo(
    () =>
      visibleTabs.find((tab) => tab.key === activeTab) ||
      visibleTabs[0] ||
      tabs[0],
    [activeTab, visibleTabs],
  );

  const dates = useMemo(
    () => getDisplayDateRange(startDate, endDate),
    [startDate, endDate],
  );

  const loadCategories = async () => {
    try {
      const response = await fetchData("commissary/categories");
      setCategories(unwrapData(response));
    } catch (error) {
      console.error("Failed to load commissary categories", error);
      setCategories([]);
    }
  };

  const loadCommissarySetup = async () => {
    setIsLoadingSetup(true);
    setSetupError("");

    try {
      const response = await fetchData("commissary/setup");
      const rows = normalizeCommissarySetupRows(unwrapData(response));
      setSetupRows(rows);
    } catch (error) {
      console.error("Failed to load Commissary setup", error);
      setSetupRows([]);
      setSetupError(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to load Commissary setup.",
      );
    } finally {
      setIsLoadingSetup(false);
    }
  };

  const loadUnconfirmedOrders = async (deliveryDateOverride = "") => {
    setIsLoadingUnconfirmed(true);
    setUnconfirmedError("");

    try {
      const requestedDeliveryDate =
        typeof deliveryDateOverride === "string" ? deliveryDateOverride : "";
      let deliveryDate = normalizeDateKey(
        requestedDeliveryDate || unconfirmedDeliveryDate,
      );

      if (!deliveryDate) {
        const setupResponse = await fetchData("commissary/setup");
        const rows = normalizeCommissarySetupRows(unwrapData(setupResponse));
        setSetupRows(rows);
        deliveryDate = getDefaultUnconfirmedDeliveryDate(rows, category);
        setUnconfirmedDeliveryDate(deliveryDate);
      }

      const response = await fetchData("commissary/unconfirmed-orders", {
        startDate: deliveryDate,
        endDate: deliveryDate,
        category: category || "All",
        storeCode: storeFilter || "All",
      });
      setUnconfirmedOrders(
        unwrapData(response).map((order) => ({
          ...order,
          editableQty: String(getUnconfirmedOrderQty(order)),
        })),
      );
    } catch (error) {
      console.error("Failed to load unconfirmed orders", error);
      setUnconfirmedOrders([]);
      setUnconfirmedError(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to load unconfirmed orders.",
      );
    } finally {
      setIsLoadingUnconfirmed(false);
    }
  };

  const updateUnconfirmedQty = (order, value) => {
    const rowKey = getUnconfirmedOrderKey(order);

    setUnconfirmedOrders((previous) =>
      previous.map((row) =>
        getUnconfirmedOrderKey(row) === rowKey
          ? { ...row, editableQty: value }
          : row,
      ),
    );
    setUnconfirmedError("");
    setUnconfirmedMessage("");
  };

  const updateSetupRow = (categCode, field, value) => {
    setSetupRows((previous) =>
      previous.map((row) =>
        row.categCode === categCode
          ? {
              ...row,
              [field]:
                field === "days"
                  ? Math.max(0, Math.min(365, Number.parseInt(value, 10) || 0))
                  : value,
            }
          : row,
      ),
    );
    setSetupMessage("");
  };

  const handleSaveCommissarySetup = async () => {
    if (setupRows.length === 0) {
      setSetupError("There are no FG categories to save.");
      return;
    }

    setIsSavingSetup(true);
    setSetupError("");
    setSetupMessage("");

    try {
      const response = await apiClient.post("commissary/setup", {
        setups: setupRows.map((row) => ({
          categCode: row.categCode,
          days: Number(row.days) || 0,
          cutoffTime: row.cutoffTime || null,
        })),
      });

      const savedRows = unwrapData(response?.data);
      if (savedRows.length > 0) {
        setSetupRows(
          savedRows.map((row) => ({
            categCode: String(row.categCode || "").trim(),
            categName: String(row.categName || row.categCode || "").trim(),
            days: Math.max(0, Number.parseInt(row.days, 10) || 0),
            cutoffTime: String(row.cutoffTime || "").slice(0, 5),
          })),
        );
      }

      setSetupMessage(
        response?.data?.message ||
          "Delivery lead-time setup saved successfully.",
      );
    } catch (error) {
      console.error("Failed to save Commissary setup", error);
      const responseData = error?.response?.data;
      const firstValidationError = responseData?.errors
        ? Object.values(responseData.errors).flat().find(Boolean)
        : "";
      setSetupError(
        firstValidationError ||
          responseData?.message ||
          error?.message ||
          "Failed to save Commissary setup.",
      );
    } finally {
      setIsSavingSetup(false);
    }
  };

  const handleUnconfirmedDecision = async (order, decision) => {
    if (!currentUserRow?.userCode) {
      setUnconfirmedError("Your User Code is missing. Please log in again.");
      return;
    }

    const isAccept = decision === "ACCEPTED";
    const quantity = getUnconfirmedOrderQty(order);

    if (isAccept && (!Number.isFinite(quantity) || quantity <= 0)) {
      setUnconfirmedError("Qty must be greater than zero before accepting.");
      return;
    }

    const confirmation = await Swal.fire({
      icon: isAccept ? "question" : "warning",
      title: isAccept ? "Accept late order?" : "Reject late order?",
      text: `${order.storeCode} • ${order.itemCode} • ${order.itemName || order.categName || order.categCode} • Qty ${quantity} • Delivery ${order.deliveryDate}`,
      input: "textarea",
      inputLabel: "Remarks (optional)",
      inputPlaceholder: "Enter the reason or instruction...",
      showCancelButton: true,
      confirmButtonText: isAccept ? "Accept" : "Reject",
      confirmButtonColor: isAccept ? "#059669" : "#dc2626",
      reverseButtons: true,
    });

    if (!confirmation.isConfirmed) return;

    const rowKey = getUnconfirmedOrderKey(order);
    setDecisionKey(rowKey);
    setUnconfirmedError("");
    setUnconfirmedMessage("");

    try {
      const response = await apiClient.post(
        "commissary/unconfirmed-orders/decision",
        {
          storeCode: order.storeCode,
          categCode: order.categCode,
          itemCode: order.itemCode,
          deliveryDate: order.deliveryDate,
          qty: quantity,
          decision,
          remarks: String(confirmation.value || "").trim(),
          userCode: currentUserRow.userCode,
        },
      );

      setUnconfirmedMessage(
        response?.data?.message ||
          (isAccept
            ? "The item was accepted and moved to confirmed orders."
            : "The item was rejected and removed from unconfirmed orders."),
      );
      setUnconfirmedOrders((previous) =>
        previous.filter(
          (row) => getUnconfirmedOrderKey(row) !== rowKey,
        ),
      );

      if (isAccept) {
        await Promise.all([loadUnconfirmedOrders(), loadCommissaryData()]);
      } else {
        await loadUnconfirmedOrders();
      }
    } catch (error) {
      console.error("Failed to update unconfirmed-order decision", error);
      setUnconfirmedError(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to save the decision.",
      );
    } finally {
      setDecisionKey("");
    }
  };

  const loadCategoryDescriptions = async () => {
    try {
      const response = await fetchData("fgCateg");
      const rawResult =
        response?.data?.[0]?.result ??
        response?.result ??
        response?.data ??
        "[]";
      const categoryRows = Array.isArray(rawResult)
        ? rawResult
        : JSON.parse(rawResult);
      const descriptionMap = {};

      categoryRows.forEach((categoryRow) => {
        const categoryCode = String(
          categoryRow.code || categoryRow.categCode || "",
        ).trim();
        const categoryDescription = String(
          categoryRow.description ||
            categoryRow.categName ||
            categoryRow.categDesc ||
            "",
        ).trim();
        if (!categoryCode || !categoryDescription) return;

        descriptionMap[categoryCode] = categoryDescription;
        descriptionMap[categoryCode.toUpperCase()] = categoryDescription;
      });

      setCategoryDescriptionsByCode(descriptionMap);
    } catch (error) {
      console.error("Failed to load Commissary category descriptions", error);
      setCategoryDescriptionsByCode({});
    }
  };

  const loadBranchNames = async () => {
    try {
      const response = await fetchData("lookupBranch", {
        PARAMS: JSON.stringify({
          search: "",
          page: 1,
          pageSize: 5000,
        }),
      });
      const rawResult = response?.data?.[0]?.result || "[]";
      const branches = Array.isArray(rawResult)
        ? rawResult
        : JSON.parse(rawResult);
      const nameMap = {};

      branches.forEach((branch) => {
        const branchCode = String(branch.branchCode || "").trim();
        const branchName = String(branch.branchName || "").trim();
        if (!branchCode || !branchName) return;

        nameMap[branchCode] = branchName;
        nameMap[branchCode.toUpperCase()] = branchName;
      });

      setBranchNamesByCode(nameMap);
    } catch (error) {
      console.error("Failed to load Commissary branch names", error);
      setBranchNamesByCode({});
    }
  };

  const loadCommissaryData = async () => {
    setIsLoading(true);
    setErrorMessage("");
    setWoSuccessMsg("");

    try {
      if (!startDate || !endDate) {
        setTabData({
          forecastSummary: [],
          forecastDetailed: [],
          forecastMaterialNeededSummary: [],
          forecastMaterialNeeded: [],
          confirmedSummary: [],
          confirmedDetailed: [],
          confirmedMaterialNeededSummary: [],
          confirmedMaterialNeeded: [],
        });
        setErrorMessage(
          "From Delivery Date and To Delivery Date are required.",
        );
        return;
      }

      const queryParams = {
        startDate,
        endDate,
        category: category || "All",
      };

      const responses = await Promise.all(
        tabs.map((tab) =>
          fetchData(tab.endpoint, {
            ...queryParams,
            ...(tab.detailed ? { storeCode: "All" } : {}),
          }),
        ),
      );

      const nextData = {};
      tabs.forEach((tab, index) => {
        const responseRows = unwrapData(responses[index]);
        nextData[tab.key] = tab.materialSummary
          ? buildMaterialSummaryRows(responseRows)
          : pivotRows(responseRows, tab.detailed);
      });

      setTabData(nextData);
    } catch (error) {
      console.error("Failed to fetch commissary data", error);
      setTabData({
        forecastSummary: [],
        forecastDetailed: [],
        forecastMaterialNeededSummary: [],
        forecastMaterialNeeded: [],
        confirmedSummary: [],
        confirmedDetailed: [],
        confirmedMaterialNeededSummary: [],
        confirmedMaterialNeeded: [],
      });
      const responseData = error?.response?.data;
      const firstValidationError = responseData?.errors
        ? Object.values(responseData.errors).flat().find(Boolean)
        : "";

      setErrorMessage(
        firstValidationError ||
          responseData?.message ||
          error?.message ||
          "Failed to load commissary data.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateWorkOrders = async () => {
    if (!startDate || !endDate) {
      setErrorMessage(
        "Please select both From Delivery Date and To Delivery Date.",
      );
      return;
    }

    const confirmAction = window.confirm(
      `Generate consolidated Work Orders for all confirmed items between ${startDate} and ${endDate}?\n\nNote: Once generated, the confirmation records will be locked and cannot be edited or integrated again.`,
    );
    if (!confirmAction) return;

    setIsGeneratingWO(true);
    setErrorMessage("");
    setWoSuccessMsg("");

    try {
      const res = await apiClient.post("commissary/generate-work-orders", {
        startDate,
        endDate,
      });
      const response = res.data;

      setWoSuccessMsg(
        response?.message ||
          "Consolidated Work Orders generated and locked successfully!",
      );
      await loadCommissaryData();
    } catch (error) {
      console.error("Failed to generate Work Orders", error);
      const responseData = error?.response?.data;
      const firstValidationError = responseData?.errors
        ? Object.values(responseData.errors).flat().find(Boolean)
        : "";

      setErrorMessage(
        firstValidationError ||
          responseData?.message ||
          error?.message ||
          "Failed to generate Work Orders.",
      );
    } finally {
      setIsGeneratingWO(false);
    }
  };

  const handleSendConfirmedToSODR = async () => {
    if (!startDate || !endDate) {
      setErrorMessage(
        "Please select both From Delivery Date and To Delivery Date.",
      );
      return;
    }

    if (!currentUserRow?.branchCode || !currentUserRow?.userCode) {
      setErrorMessage(
        "Your Branch Code or User Code is missing. Please log in again before sending.",
      );
      return;
    }

    if (integrationRows.length === 0) {
      await Swal.fire({
        icon: "info",
        title: "Nothing to send",
        text: "All confirmed details in the selected filters were already sent to SO and DR.",
      });
      return;
    }

    if (selectedIntegrationRows.length === 0) {
      await Swal.fire({
        icon: "warning",
        title: "Select item(s)",
        text: "Please select at least one item to send to SO/DR.",
      });
      return;
    }

    if (isLoadingIntegrationCustomers) {
      await Swal.fire({
        icon: "info",
        title: "Loading customers",
        text: "Please wait while the Customer Master records are loaded for the selected branches.",
      });
      return;
    }

    if (storesWithoutIntegrationCustomers.length > 0) {
      await Swal.fire({
        icon: "warning",
        title: "Customer setup required",
        text: `No Customer Master record is tagged under: ${storesWithoutIntegrationCustomers.join(
          ", ",
        )}.`,
      });
      return;
    }

    if (storesWithoutSelectedCustomer.length > 0) {
      await Swal.fire({
        icon: "warning",
        title: "Select customer",
        text: `Please select a customer for: ${storesWithoutSelectedCustomer.join(
          ", ",
        )}.`,
      });
      return;
    }

    const selectedItems = selectedIntegrationRows.map((row) => ({
      storeCode: getStoreKey(row),
      itemCode: row.itemCode || "",
      deliveryDates: row.unsentDeliveryDates,
      quantity: Number(row.unsentQty ?? row.total) || 0,
    }));

    const selectedCustomers = selectedIntegrationCustomers.map((customer) => ({
      storeCode: customer.storeCode,
      customerCode: customer.customerCode,
    }));

    const confirmation = await Swal.fire({
      icon: "question",
      title: `Create ${selectedStoreCodes.length.toLocaleString()} SO/DR pair(s)?`,
      text: "The checked items will be grouped by store. Each store will use the selected customer and receive one closed SO and one open DR.",
      showCancelButton: true,
      confirmButtonText: "Send",
      cancelButtonText: "Cancel",
      reverseButtons: true,
    });

    if (!confirmation.isConfirmed) return;

    setIsSendingToSODR(true);
    setErrorMessage("");
    setWoSuccessMsg("");

    try {
      const response = await apiClient.post(
        "commissary/send-confirmed-to-so-dr",
        {
          startDate,
          endDate,
          category: category || "All",
          storeCode: storeFilter || "All",
          branchCode: currentUserRow.branchCode,
          userCode: currentUserRow.userCode,
          documentDate: formatDate(new Date()),
          soTranType: "SO01",
          drTranType: "DR01",
          poNumber: soDrForm.poNumber,
          remarks: soDrForm.remarks,
          selectedItems,
          selectedCustomers,
        },
      );

      const createdDocuments = Array.isArray(response?.data?.documents)
        ? response.data.documents
        : Array.isArray(response?.data?.data)
          ? response.data.data
          : [];
      const successMessage =
        createdDocuments.length === 1
          ? `One SO and one DR were created for ${selectedItems.length.toLocaleString()} selected item(s). The SO is closed and the DR is open for picking.`
          : `${createdDocuments.length.toLocaleString()} SO/DR pairs were created, one pair per store.`;
      const documentRowsHtml = createdDocuments
        .map(
          (document) => `
            <tr>
              <td style="padding:6px;border-bottom:1px solid #e2e8f0;text-align:left">${escapeHtml(document.storeCode || "-")}</td>
              <td style="padding:6px;border-bottom:1px solid #e2e8f0;text-align:left">${escapeHtml(document.customerName || document.customerCode || "-")}</td>
              <td style="padding:6px;border-bottom:1px solid #e2e8f0;text-align:left">${escapeHtml(document.documentDate || "-")}</td>
              <td style="padding:6px;border-bottom:1px solid #e2e8f0;text-align:left">
                <div style="font-weight:700">${escapeHtml(document.soNumber || "-")}</div>
                <div style="font-size:11px;color:#047857">${escapeHtml(document.soStatus || "Closed")}</div>
              </td>
              <td style="padding:6px;border-bottom:1px solid #e2e8f0;text-align:left">
                <div style="font-weight:700">${escapeHtml(document.drNumber || "-")}</div>
                <div style="font-size:11px;color:#1d4ed8">${escapeHtml(document.drStatus || "Open - For Picking")}</div>
              </td>
            </tr>`,
        )
        .join("");

      handleCloseSODRModal();
      setWoSuccessMsg(successMessage);
      await loadCommissaryData();

      await Swal.fire({
        icon: "success",
        title: "Sent successfully",
        width: 900,
        html: `
          <p style="margin:0 0 12px">${escapeHtml(successMessage)}</p>
          <div style="max-height:320px;overflow:auto;border:1px solid #e2e8f0;border-radius:8px">
            <table style="width:100%;border-collapse:collapse;font-size:10px">
              <thead style="position:sticky;top:0;background:#f1f5f9">
                <tr>
                  <th style="padding:7px;text-align:left">Store</th>
                  <th style="padding:7px;text-align:left">Customer</th>
                  <th style="padding:7px;text-align:left">SO Date</th>
                  <th style="padding:7px;text-align:left">SO Document</th>
                  <th style="padding:7px;text-align:left">DR Document</th>
                </tr>
              </thead>
              <tbody>
                ${
                  documentRowsHtml ||
                  '<tr><td colspan="5" style="padding:12px;text-align:center">No document return value was received.</td></tr>'
                }
              </tbody>
            </table>
          </div>`,
      });
    } catch (error) {
      const responseStatus = error?.response?.status;
      const allowedMethods = error?.response?.headers?.allow;
      const message =
        responseStatus === 405
          ? `The backend route POST /api/commissary/send-confirmed-to-so-dr is not registered.${
              allowedMethods ? ` Allowed method(s): ${allowedMethods}.` : ""
            } Please add the POST route in the API before sending.`
          : getApiErrorMessage(error, "SO/DR integration failed.");

      console.error("Failed to send confirmed details to SO/DR:", message);
      setErrorMessage(message);
      await Swal.fire({
        icon: "error",
        title: "Unable to send",
        text: message,
      });
    } finally {
      setIsSendingToSODR(false);
    }
  };

  useEffect(() => {
    loadCategories();
    loadCategoryDescriptions();
    loadBranchNames();
    loadCommissaryData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTab === "commissarySetup" || activeTab === "unconfirmedOrders") {
      return;
    }

    const currentTab = tabs.find((tab) => tab.key === activeTab);
    if (currentTab?.viewType === viewType) return;

    setActiveTab(
      viewType === "forecast" ? "forecastSummary" : "confirmedSummary",
    );
    setStoreFilter("All");
  }, [activeTab, viewType]);

  useEffect(() => {
    if (activeTab === "commissarySetup") {
      loadCommissarySetup();
    }

    if (activeTab === "unconfirmedOrders") {
      loadUnconfirmedOrders();
    }
    // Each maintenance tab intentionally refreshes from the database when opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    if (!showSODRModal) return undefined;

    const handleKeyDown = (event) => {
      if (event.key !== "Escape") return;

      if (customerLookupStoreCode) {
        setCustomerLookupStoreCode("");
        setCustomerLookupSearch("");
        return;
      }

      handleCloseSODRModal();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [customerLookupStoreCode, showSODRModal]);

  const storeOptions = useMemo(() => {
    const map = new Map();
    const sourceRows =
      viewType === "forecast"
        ? tabData.forecastDetailed
        : tabData.confirmedDetailed;

    sourceRows.forEach((row) => {
      const storeKey = getStoreKey(row);
      if (!storeKey) return;

      if (!map.has(storeKey)) {
        map.set(
          storeKey,
          branchNamesByCode[storeKey] ||
            branchNamesByCode[storeKey.toUpperCase()] ||
            getStoreLabel(row),
        );
      }
    });

    return Array.from(map, ([storeCode, storeName]) => ({
      storeCode,
      storeName,
    })).sort((a, b) =>
      String(a.storeName || a.storeCode).localeCompare(
        String(b.storeName || b.storeCode),
      ),
    );
  }, [
    tabData.forecastDetailed,
    tabData.confirmedDetailed,
    viewType,
    branchNamesByCode,
  ]);

  const activeRawData = tabData[activeTab] || [];

  const currentData = useMemo(() => {
    let source = activeRawData;

    if (
      activeTabConfig.detailed &&
      !activeTabConfig.materialSummary &&
      storeFilter !== "All"
    ) {
      source = source.filter((row) => getStoreKey(row) === storeFilter);
    }

    const filteredRows = filterByDates(
      source,
      dates,
      activeTabConfig.materialSummary,
    );

    if (activeTabConfig.materialSummary) {
      return filteredRows.map((material) => ({
        ...material,
        produceItems: (material.produceItems || []).map((produceItem) => ({
          ...produceItem,
          branches: (produceItem.branches || []).map((branch) => {
            const branchCode = String(branch.branchCode || "").trim();
            const branchName =
              branchNamesByCode[branchCode] ||
              branchNamesByCode[branchCode.toUpperCase()] ||
              branch.branchName ||
              branchCode;

            return { ...branch, branchName };
          }),
        })),
      }));
    }

    return filteredRows.map((row) => {
      const branchCode = getStoreKey(row);
      const existingName = String(
        row.storeName || row.branchName || row.store || "",
      ).trim();
      const branchName =
        branchNamesByCode[branchCode] ||
        branchNamesByCode[branchCode.toUpperCase()] ||
        (existingName && existingName !== branchCode
          ? existingName
          : branchCode);

      return {
        ...row,
        store: branchName,
        storeName: branchName,
        branchName,
      };
    });
  }, [
    activeRawData,
    activeTabConfig.detailed,
    activeTabConfig.materialSummary,
    storeFilter,
    dates,
    branchNamesByCode,
  ]);

  const integrationRows = useMemo(
    () =>
      currentData
        .map((row, index) => {
          const unsentDeliveryDates = dates.filter(
            (deliveryDate) =>
              Number(row.dateIntegration?.[deliveryDate]?.unsentQty) > 0,
          );

          return {
            ...row,
            unsentDeliveryDates,
            integrationRowId: `${getStoreKey(row)}|${row.itemCode || "item"}|${index}`,
          };
        })
        .filter(
          (row) =>
            row.unsentDeliveryDates.length > 0 && Number(row.unsentQty) > 0,
        ),
    [currentData, dates],
  );

  const selectedIntegrationRowIdSet = useMemo(
    () => new Set(selectedIntegrationRowIds),
    [selectedIntegrationRowIds],
  );

  const selectedIntegrationRows = useMemo(
    () =>
      integrationRows.filter((row) =>
        selectedIntegrationRowIdSet.has(row.integrationRowId),
      ),
    [integrationRows, selectedIntegrationRowIdSet],
  );

  const selectedStoreCodes = useMemo(
    () =>
      Array.from(
        new Set(
          selectedIntegrationRows
            .map((row) => String(getStoreKey(row) || "").trim())
            .filter(Boolean),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [selectedIntegrationRows],
  );

  const selectedIntegrationCustomers = useMemo(
    () =>
      selectedStoreCodes
        .map((storeCode) => selectedIntegrationCustomersByStore[storeCode])
        .filter(Boolean),
    [selectedIntegrationCustomersByStore, selectedStoreCodes],
  );

  const storesWithoutIntegrationCustomers = useMemo(
    () =>
      selectedStoreCodes.filter(
        (storeCode) =>
          !integrationCustomers.some(
            (customer) =>
              customer?.storeCode === storeCode &&
              customer?.hasCustomer &&
              customer?.customerCode,
          ),
      ),
    [integrationCustomers, selectedStoreCodes],
  );

  const storesWithoutSelectedCustomer = useMemo(
    () =>
      selectedStoreCodes.filter(
        (storeCode) => !selectedIntegrationCustomersByStore[storeCode],
      ),
    [selectedIntegrationCustomersByStore, selectedStoreCodes],
  );

  const customerLookupOptions = useMemo(() => {
    const searchText = String(customerLookupSearch || "")
      .trim()
      .toLowerCase();

    return integrationCustomers
      .filter(
        (customer) =>
          customer?.storeCode === customerLookupStoreCode &&
          customer?.hasCustomer &&
          customer?.customerCode,
      )
      .filter((customer) => {
        if (!searchText) return true;

        return [customer.customerCode, customer.customerName].some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(searchText),
        );
      })
      .sort((a, b) =>
        String(a.customerCode || "").localeCompare(
          String(b.customerCode || ""),
        ),
      );
  }, [customerLookupSearch, customerLookupStoreCode, integrationCustomers]);

  useEffect(() => {
    if (!showSODRModal || selectedStoreCodes.length === 0) {
      setIntegrationCustomers([]);
      setSelectedIntegrationCustomersByStore({});
      setCustomerLookupStoreCode("");
      setCustomerLookupSearch("");
      setIsLoadingIntegrationCustomers(false);
      return undefined;
    }

    let isCurrent = true;

    const loadIntegrationCustomers = async () => {
      setIsLoadingIntegrationCustomers(true);

      try {
        const response = await apiClient.get(
          "commissary/integration-customers",
          {
            params: { storeCodes: selectedStoreCodes },
          },
        );

        if (isCurrent) {
          const customerRows = Array.isArray(response?.data?.data)
            ? response.data.data
            : [];

          setIntegrationCustomers(customerRows);
          setSelectedIntegrationCustomersByStore((previous) => {
            const nextSelection = {};

            selectedStoreCodes.forEach((storeCode) => {
              const selectedCustomer = previous[storeCode];
              const validCustomers = customerRows.filter(
                (customer) =>
                  customer?.storeCode === storeCode &&
                  customer?.hasCustomer &&
                  customer?.customerCode,
              );
              const isStillValid = validCustomers.some(
                (customer) =>
                  customer.customerCode === selectedCustomer?.customerCode,
              );

              if (isStillValid) {
                nextSelection[storeCode] = selectedCustomer;
              } else if (validCustomers.length > 0) {
                nextSelection[storeCode] = validCustomers[0];
              }
            });

            return nextSelection;
          });
        }
      } catch (error) {
        console.error("Failed to match stores to Customer Master", error);

        if (isCurrent) {
          setIntegrationCustomers([]);
          setErrorMessage(
            error?.response?.data?.message ||
              error?.message ||
              "Unable to match the selected stores to Customer Master.",
          );
        }
      } finally {
        if (isCurrent) setIsLoadingIntegrationCustomers(false);
      }
    };

    loadIntegrationCustomers();

    return () => {
      isCurrent = false;
    };
  }, [showSODRModal, selectedStoreCodes]);

  const selectedIntegrationQuantity = useMemo(
    () =>
      selectedIntegrationRows.reduce(
        (sum, row) => sum + (Number(row.unsentQty ?? row.total) || 0),
        0,
      ),
    [selectedIntegrationRows],
  );

  const allIntegrationRowsSelected =
    integrationRows.length > 0 &&
    selectedIntegrationRows.length === integrationRows.length;

  const toggleAllIntegrationRows = () => {
    setSelectedIntegrationRowIds(
      allIntegrationRowsSelected
        ? []
        : integrationRows.map((row) => row.integrationRowId),
    );
  };

  const toggleIntegrationRow = (rowId) => {
    setSelectedIntegrationRowIds((previous) =>
      previous.includes(rowId)
        ? previous.filter((id) => id !== rowId)
        : [...previous, rowId],
    );
  };

  const openCustomerLookup = (storeCode) => {
    setCustomerLookupStoreCode(storeCode);
    setCustomerLookupSearch("");
  };

  const closeCustomerLookup = () => {
    setCustomerLookupStoreCode("");
    setCustomerLookupSearch("");
  };

  const selectIntegrationCustomer = (customer) => {
    if (!customerLookupStoreCode || !customer?.customerCode) return;

    setSelectedIntegrationCustomersByStore((previous) => ({
      ...previous,
      [customerLookupStoreCode]: customer,
    }));
    closeCustomerLookup();
  };

  const activeCollapsedCategories = collapsedCategoriesByTab[activeTab] || [];
  const activeExpandedMaterials = expandedMaterialsByTab[activeTab] || [];
  const activeCollapsedCategorySet = useMemo(
    () => new Set(activeCollapsedCategories),
    [activeCollapsedCategories],
  );

  const groupedCurrentData = useMemo(() => {
    const groups = new Map();

    currentData.forEach((row) => {
      const categoryLabel = getCategoryLabel(row);

      if (!groups.has(categoryLabel)) {
        groups.set(categoryLabel, []);
      }

      groups.get(categoryLabel).push(row);
    });

    return Array.from(groups, ([categoryName, rows]) => {
      const categoryDescription =
        categoryDescriptionsByCode[categoryName] ||
        categoryDescriptionsByCode[categoryName.toUpperCase()] ||
        categoryName;

      return {
        categoryName,
        categoryDescription,
        rows: rows.sort((a, b) => {
          if (activeTabConfig.detailed) {
            const storeCompare = String(a.store || "").localeCompare(
              String(b.store || ""),
            );
            if (storeCompare !== 0) return storeCompare;
          }

          return String(a.itemDesc || a.itemCode || "").localeCompare(
            String(b.itemDesc || b.itemCode || ""),
          );
        }),
      };
    }).sort((a, b) =>
      a.categoryDescription.localeCompare(b.categoryDescription),
    );
  }, [activeTabConfig.detailed, currentData, categoryDescriptionsByCode]);

  const groupedUnconfirmedOrders = useMemo(() => {
    const groups = new Map();

    unconfirmedOrders.forEach((order) => {
      const categoryCode = getCategoryLabel(order);

      if (!groups.has(categoryCode)) {
        groups.set(categoryCode, []);
      }

      groups.get(categoryCode).push(order);
    });

    return Array.from(groups, ([categoryCode, rows]) => {
      const categoryDescription =
        rows[0]?.categName ||
        categoryDescriptionsByCode[categoryCode] ||
        categoryDescriptionsByCode[categoryCode.toUpperCase()] ||
        categoryCode;

      return {
        categoryCode,
        categoryDescription,
        rows: rows.sort((a, b) => {
          const itemCompare = String(
            a.itemName || a.itemCode || "",
          ).localeCompare(String(b.itemName || b.itemCode || ""));
          if (itemCompare !== 0) return itemCompare;

          const dateCompare = String(a.deliveryDate || "").localeCompare(
            String(b.deliveryDate || ""),
          );
          if (dateCompare !== 0) return dateCompare;

          return String(a.storeCode || "").localeCompare(
            String(b.storeCode || ""),
          );
        }),
      };
    }).sort((a, b) =>
      a.categoryDescription.localeCompare(b.categoryDescription),
    );
  }, [unconfirmedOrders, categoryDescriptionsByCode]);

  const collapsedUnconfirmedCategorySet = useMemo(
    () => new Set(collapsedUnconfirmedCategories),
    [collapsedUnconfirmedCategories],
  );

  const toggleUnconfirmedCategory = (categoryCode) => {
    setCollapsedUnconfirmedCategories((previous) =>
      previous.includes(categoryCode)
        ? previous.filter((value) => value !== categoryCode)
        : [...previous, categoryCode],
    );
  };

  const toggleAllUnconfirmedCategories = () => {
    const visibleCategories = groupedUnconfirmedOrders.map(
      (group) => group.categoryCode,
    );
    const allCollapsed =
      visibleCategories.length > 0 &&
      visibleCategories.every((categoryCode) =>
        collapsedUnconfirmedCategorySet.has(categoryCode),
      );

    setCollapsedUnconfirmedCategories(allCollapsed ? [] : visibleCategories);
  };

  const allUnconfirmedCategoriesCollapsed =
    groupedUnconfirmedOrders.length > 0 &&
    groupedUnconfirmedOrders.every((group) =>
      collapsedUnconfirmedCategorySet.has(group.categoryCode),
    );

  const totalQueryQty = useMemo(
    () => currentData.reduce((sum, row) => sum + (Number(row.total) || 0), 0),
    [currentData],
  );

  const getCategoryTotal = (rows = []) =>
    rows.reduce((sum, row) => sum + (Number(row.total) || 0), 0);

  const toggleMaterialExpansion = (itemCode) => {
    setExpandedMaterialsByTab((prev) => {
      const current = prev[activeTab] || [];
      return {
        ...prev,
        [activeTab]: current.includes(itemCode)
          ? current.filter((value) => value !== itemCode)
          : [...current, itemCode],
      };
    });
  };

  const setCollapsedForActiveTab = (updater) => {
    setCollapsedCategoriesByTab((prev) => ({
      ...prev,
      [activeTab]:
        typeof updater === "function"
          ? updater(prev[activeTab] || [])
          : updater,
    }));
  };

  const toggleCategoryCollapse = (categoryName) => {
    setCollapsedForActiveTab((prev) =>
      prev.includes(categoryName)
        ? prev.filter((value) => value !== categoryName)
        : [...prev, categoryName],
    );
  };

  const visibleCollapsedCategoryCount = useMemo(() => {
    return groupedCurrentData.filter((group) =>
      activeCollapsedCategorySet.has(group.categoryName),
    ).length;
  }, [activeCollapsedCategorySet, groupedCurrentData]);

  const handleToggleAllCategories = () => {
    if (groupedCurrentData.length === 0) return;

    const visibleCategories = groupedCurrentData.map(
      (group) => group.categoryName,
    );

    setCollapsedForActiveTab((prev) => {
      const allVisibleCollapsed = visibleCategories.every((categoryName) =>
        prev.includes(categoryName),
      );

      if (allVisibleCollapsed) {
        return prev.filter(
          (categoryName) => !visibleCategories.includes(categoryName),
        );
      }

      return Array.from(new Set([...prev, ...visibleCategories]));
    });
  };

  useEffect(() => {
    setCollapsedCategoriesByTab((prev) => {
      const next = { ...prev };

      tabs.forEach((tab) => {
        const validCategories = new Set(
          (tabData[tab.key] || []).map((row) => getCategoryLabel(row)),
        );
        next[tab.key] = (next[tab.key] || []).filter((categoryName) =>
          validCategories.has(categoryName),
        );
      });

      return next;
    });
  }, [tabData]);

  useEffect(() => {
    if (storeFilter === "All") return;

    const sourceRows =
      viewType === "forecast"
        ? tabData.forecastDetailed
        : tabData.confirmedDetailed;
    const selectedStoreStillExists = sourceRows.some(
      (row) => getStoreKey(row) === storeFilter,
    );

    if (!selectedStoreStillExists) {
      setStoreFilter("All");
    }
  }, [
    tabData.forecastDetailed,
    tabData.confirmedDetailed,
    storeFilter,
    viewType,
  ]);

  const showsBranchColumn =
    activeTabConfig.detailed || activeTabConfig.materialSummary;
  const showsIntegrationDetails = activeTab === "confirmedDetailed";
  const colSpan =
    dates.length +
    (showsBranchColumn ? 5 : 4) +
    (showsIntegrationDetails ? 1 : 0);

  const filteredSetupRows = useMemo(() => {
    const search = String(setupSearch || "")
      .trim()
      .toLowerCase();
    if (!search) return setupRows;

    return setupRows.filter(
      (row) =>
        String(row.categCode || "")
          .toLowerCase()
          .includes(search) ||
        String(row.categName || "")
          .toLowerCase()
          .includes(search),
    );
  }, [setupRows, setupSearch]);

  const renderTabButtons = (includeDataActions = false) => (
    <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
      {visibleTabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`global-tran-tab-padding-ui flex items-center gap-2 ${
              activeTab === tab.key
                ? "global-tran-tab-text_active-ui"
                : "rounded-lg bg-slate-100 text-slate-600 dark:bg-gray-800 dark:text-slate-300"
            }`}
          >
            <Icon className="h-4 w-4" />
            {tab.label}
          </button>
        );
      })}

      <button
        type="button"
        onClick={() => setActiveTab("unconfirmedOrders")}
        className={`global-tran-tab-padding-ui flex items-center gap-2 ${
          activeTab === "unconfirmedOrders"
            ? "global-tran-tab-text_active-ui"
            : "rounded-lg bg-slate-100 text-slate-600 dark:bg-gray-800 dark:text-slate-300"
        }`}
      >
        <AlertTriangle className="h-4 w-4" />
        Unconfirmed
      </button>

      {includeDataActions && (
        <>
          <button
            type="button"
            onClick={
              activeTab === "unconfirmedOrders"
                ? loadUnconfirmedOrders
                : loadCommissaryData
            }
            disabled={
              activeTab === "unconfirmedOrders"
                ? isLoadingUnconfirmed
                : isLoading
            }
            className="global-tran-tab-padding-ui flex items-center gap-2 rounded-lg bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-800 dark:text-slate-300 dark:hover:bg-gray-700"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                (
                  activeTab === "unconfirmedOrders"
                    ? isLoadingUnconfirmed
                    : isLoading
                )
                  ? "animate-spin"
                  : ""
              }`}
            />
            {(
              activeTab === "unconfirmedOrders"
                ? isLoadingUnconfirmed
                : isLoading
            )
              ? "Refreshing..."
              : "Refresh Data"}
          </button>

          <button
            type="button"
            onClick={
              activeTab === "unconfirmedOrders"
                ? toggleAllUnconfirmedCategories
                : handleToggleAllCategories
            }
            disabled={
              activeTab === "unconfirmedOrders"
                ? isLoadingUnconfirmed || groupedUnconfirmedOrders.length === 0
                : isLoading || groupedCurrentData.length === 0
            }
            className="global-tran-tab-padding-ui flex items-center gap-2 rounded-lg bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-800 dark:text-slate-300 dark:hover:bg-gray-700"
          >
            <ChevronDown className="h-4 w-4" />
            {activeTab === "unconfirmedOrders"
              ? allUnconfirmedCategoriesCollapsed
                ? "Show"
                : "Collapse"
              : visibleCollapsedCategoryCount === groupedCurrentData.length &&
                  groupedCurrentData.length > 0
                ? "Show"
                : "Collapse"}
          </button>
        </>
      )}
    </div>
  );

  const renderCommissarySetupButton = () => (
    <button
      type="button"
      onClick={() => setActiveTab("commissarySetup")}
      title="Commissary Setup"
      aria-label="Commissary Setup"
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
        activeTab === "commissarySetup"
          ? "bg-blue-600 text-white shadow"
          : "text-blue-900 hover:bg-blue-200/80 dark:text-white dark:hover:bg-blue-800"
      }`}
    >
      <Settings className="h-5 w-5" />
    </button>
  );

  if (activeTab === "commissarySetup" || activeTab === "unconfirmedOrders") {
    return (
      <div className="global-tran-main-div-ui !mt-0 min-w-0 overflow-x-hidden px-2 pb-20 pt-[136px] sm:pt-[112px] md:pt-[116px] lg:pt-[120px]">
        {isLoading && <LoadingSpinner />}

        <div className="fixed left-2 right-2 top-[54px] z-[20] flex max-w-[calc(100vw-1rem)] items-center justify-between gap-2 rounded-lg bg-gradient-to-r from-blue-200 to-blue-100 p-2 text-blue-900 shadow-xl dark:bg-blue-900 dark:text-white sm:left-4 sm:right-4 sm:top-[62px] sm:max-w-none md:left-6 md:right-6">
          <div className="min-w-0 text-center sm:text-left">
            <h1 className="break-words px-1 text-base font-semibold leading-tight sm:px-3 sm:text-xl lg:text-2xl">
              Commissary
            </h1>
          </div>
          {renderCommissarySetupButton()}
        </div>

        <div className="global-tran-tab-div-ui !p-3 sm:!p-4 lg:!p-6">
          <div className="global-tran-tab-nav-ui !items-stretch !gap-3 sm:!items-center">
            {renderTabButtons(activeTab === "unconfirmedOrders")}
          </div>

          {activeTab === "commissarySetup" && (
            <section className="mt-3 w-full overflow-hidden rounded-lg border border-blue-200 bg-white shadow-sm dark:border-blue-900 dark:bg-gray-950">
              <header className="border-b border-blue-100 bg-blue-50/70 px-3 py-2 dark:border-blue-900 dark:bg-blue-950/30">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-blue-600 p-1.5 text-white">
                    <Settings className="h-4 w-4" />
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 sm:text-base">
                      Commissary Setup
                    </h2>
                  </div>
                </div>
              </header>

              <div className="p-2 sm:p-3">
                {setupError && (
                  <div className="mb-2 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    <span>{setupError}</span>
                  </div>
                )}

                {setupMessage && (
                  <div className="mb-2 flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-xs text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    <span>{setupMessage}</span>
                  </div>
                )}

                <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="relative w-full sm:max-w-xs">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="search"
                      value={setupSearch}
                      onChange={(event) => setSetupSearch(event.target.value)}
                      placeholder="Search category code or name"
                      className="global-tran-textbox-ui !h-8 !py-1 !pl-8 text-xs"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveCommissarySetup}
                    disabled={
                      isSavingSetup || isLoadingSetup || setupRows.length === 0
                    }
                    className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-3 py-1 text-xs font-bold text-white shadow-sm ${
                      isSavingSetup || isLoadingSetup || setupRows.length === 0
                        ? "cursor-not-allowed bg-gray-400 dark:bg-gray-700"
                        : "bg-blue-600 hover:bg-blue-700 dark:bg-blue-800 dark:hover:bg-blue-700"
                    }`}
                  >
                    <Save className="h-3.5 w-3.5" />
                    {isSavingSetup ? "Saving..." : "Save Setup"}
                  </button>
                </div>

                <div className="global-tran-table-main-div-ui block max-w-full overflow-x-auto">
                  <div className="global-tran-table-main-sub-div-ui relative isolate !max-h-[360px]">
                    <table className="w-full min-w-[620px] table-fixed border-separate border-spacing-0 text-xs [&_td]:!px-2 [&_td]:!py-1 [&_th]:!px-2 [&_th]:!py-1.5">
                      <thead className="global-tran-thead-ui">
                        <tr>
                          <th className="global-tran-th-ui w-[120px] text-left">
                            Category Code
                          </th>
                          <th className="global-tran-th-ui text-left">
                            Category Name
                          </th>
                          <th className="global-tran-th-ui w-[110px] text-center">
                            Lead Days
                          </th>
                          <th className="global-tran-th-ui w-[150px] text-center">
                            Cutoff Time
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {isLoadingSetup ? (
                          <tr>
                            <td
                              colSpan={4}
                              className="global-tran-td-ui !py-6 text-center text-slate-500"
                            >
                              Loading all FG categories...
                            </td>
                          </tr>
                        ) : filteredSetupRows.length === 0 ? (
                          <tr>
                            <td
                              colSpan={4}
                              className="global-tran-td-ui !py-6 text-center text-slate-500"
                            >
                              No matching FG category found.
                            </td>
                          </tr>
                        ) : (
                          filteredSetupRows.map((row) => (
                            <tr
                              key={row.categCode}
                              className="bg-white hover:bg-slate-50 dark:bg-black dark:hover:bg-gray-900/50"
                            >
                              <td className="global-tran-td-ui font-mono font-semibold text-blue-700 dark:text-blue-300">
                                {row.categCode}
                              </td>
                              <td className="global-tran-td-ui font-medium">
                                {row.categName}
                              </td>
                              <td className="global-tran-td-ui">
                                <input
                                  type="number"
                                  min="0"
                                  max="365"
                                  step="1"
                                  value={row.days}
                                  onChange={(event) =>
                                    updateSetupRow(
                                      row.categCode,
                                      "days",
                                      event.target.value,
                                    )
                                  }
                                  className="global-tran-textbox-ui !mx-auto !h-7 !w-20 !px-2 !py-0.5 text-center text-xs"
                                  aria-label={`${row.categName} delivery lead days`}
                                />
                              </td>
                              <td className="global-tran-td-ui">
                                <div className="flex items-center justify-center gap-1.5">
                                  <Clock3 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                  <input
                                    type="time"
                                    value={row.cutoffTime}
                                    onChange={(event) =>
                                      updateSetupRow(
                                        row.categCode,
                                        "cutoffTime",
                                        event.target.value,
                                      )
                                    }
                                    className="global-tran-textbox-ui !h-7 !w-28 !px-1 !py-0.5 text-center text-xs"
                                    aria-label={`${row.categName} confirmation cutoff time`}
                                  />
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeTab === "unconfirmedOrders" && (
            <section className="mt-4 overflow-hidden rounded-xl border border-amber-200 bg-white shadow-sm dark:border-amber-900 dark:bg-gray-950">
              <header className="border-b border-amber-100 bg-amber-50/70 px-4 py-3 dark:border-amber-900 dark:bg-amber-950/20 sm:px-6">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center gap-3">
                    <span className="rounded-lg bg-amber-500 p-2 text-white">
                      <AlertTriangle className="h-5 w-5" />
                    </span>
                    <div>
                      <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 sm:text-lg">
                        Unconfirmed Orders
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
                        Review Store Portal orders that missed the configured
                        confirmation cutoff.
                      </p>
                    </div>
                  </div>

                  <div className="w-full sm:w-[180px]">
                    <FloatingField
                      id="setup-unconfirmed-delivery-date"
                      label="Delivery Date"
                      type="date"
                      value={unconfirmedDeliveryDate}
                      onChange={setUnconfirmedDeliveryDate}
                    />
                  </div>
                </div>
              </header>

              <div className="p-3 sm:p-5">
                {unconfirmedError && (
                  <div className="mb-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{unconfirmedError}</span>
                  </div>
                )}

                {unconfirmedMessage && (
                  <div className="mb-3 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{unconfirmedMessage}</span>
                  </div>
                )}

                <div className="global-tran-table-main-div-ui block max-w-full overflow-x-auto">
                  <div className="global-tran-table-main-sub-div-ui relative isolate !max-h-[430px]">
                    <table className="min-w-[1380px] table-fixed border-separate border-spacing-0">
                      <thead className="global-tran-thead-ui">
                        <tr>
                          <th className="global-tran-th-ui w-[180px] text-left">
                            Store
                          </th>
                          <th className="global-tran-th-ui w-[130px] text-left">
                            Item Number
                          </th>
                          <th className="global-tran-th-ui w-[260px] text-left">
                            Description
                          </th>
                          <th className="global-tran-th-ui w-[130px] text-center">
                            Delivery Date
                          </th>
                          <th className="global-tran-th-ui w-[180px] text-center">
                            Confirmation Cutoff
                          </th>
                          <th className="global-tran-th-ui w-[90px] text-center">
                            UOM
                          </th>
                          <th className="global-tran-th-ui w-[100px] text-right">
                            Qty
                          </th>
                          <th className="global-tran-th-ui w-[120px] text-center">
                            Status
                          </th>
                          <th className="global-tran-th-ui w-[190px] text-center">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {isLoadingUnconfirmed ? (
                          <tr>
                            <td
                              colSpan={9}
                              className="global-tran-td-ui py-10 text-center text-slate-500"
                            >
                              Loading orders that missed the cutoff...
                            </td>
                          </tr>
                        ) : unconfirmedOrders.length === 0 ? (
                          <tr>
                            <td
                              colSpan={9}
                              className="global-tran-td-ui py-10 text-center text-slate-500"
                            >
                              No unconfirmed late orders found for this delivery
                              date.
                            </td>
                          </tr>
                        ) : (
                          groupedUnconfirmedOrders.map((group) => {
                            const isCollapsed =
                              collapsedUnconfirmedCategorySet.has(
                                group.categoryCode,
                              );

                            return (
                              <React.Fragment key={group.categoryCode}>
                                <tr className="bg-blue-50 dark:bg-blue-950/40">
                                  <td
                                    colSpan={9}
                                    className="global-tran-td-ui !p-0"
                                  >
                                    <button
                                      type="button"
                                      onClick={() =>
                                        toggleUnconfirmedCategory(
                                          group.categoryCode,
                                        )
                                      }
                                      aria-expanded={!isCollapsed}
                                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs font-bold uppercase text-blue-900 hover:bg-blue-100 dark:text-blue-100 dark:hover:bg-blue-900/60"
                                    >
                                      <span className="flex min-w-0 items-center gap-2">
                                        <ChevronDown
                                          className={`h-4 w-4 shrink-0 transition-transform ${
                                            isCollapsed ? "-rotate-90" : ""
                                          }`}
                                        />
                                        <span className="truncate">
                                          Category: {group.categoryDescription}
                                        </span>
                                      </span>
                                      <span className="shrink-0 text-[11px] font-semibold normal-case text-slate-600 dark:text-slate-300">
                                        {group.rows.length} item
                                        {group.rows.length === 1 ? "" : "s"}
                                      </span>
                                    </button>
                                  </td>
                                </tr>

                                {!isCollapsed &&
                                  group.rows.map((order) => {
                                    const rowKey =
                                      getUnconfirmedOrderKey(order);
                                    const isSavingDecision =
                                      decisionKey === rowKey;
                                    const status = String(
                                      order.decisionStatus || "PENDING",
                                    ).toUpperCase();

                                    return (
                                      <tr
                                        key={rowKey}
                                        className="bg-white hover:bg-slate-50 dark:bg-black dark:hover:bg-gray-900/50"
                                      >
                                        <td className="global-tran-td-ui font-semibold text-slate-800 dark:text-slate-200">
                                          {branchNamesByCode[order.storeCode] ||
                                            order.storeName ||
                                            order.storeCode ||
                                            "-"}
                                        </td>
                                        <td className="global-tran-td-ui">
                                          <div className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                                            {order.itemCode || "-"}
                                          </div>
                                        </td>
                                        <td
                                          className="global-tran-td-ui truncate"
                                          title={order.itemName || ""}
                                        >
                                          <div className="truncate text-slate-700 dark:text-slate-300">
                                            {order.itemName || "-"}
                                          </div>
                                        </td>
                                        <td className="global-tran-td-ui text-center font-medium">
                                          {formatDisplayDate(
                                            order.deliveryDate,
                                          )}
                                        </td>
                                        <td className="global-tran-td-ui text-center text-xs">
                                          {formatDisplayDate(
                                            order.cutoffDateTime,
                                            true,
                                          )}
                                        </td>
                                        <td className="global-tran-td-ui text-center font-medium">
                                          {order.uomCode || "-"}
                                        </td>
                                        <td className="global-tran-td-ui text-right">
                                          <input
                                            type="number"
                                            min="0"
                                            step="any"
                                            inputMode="decimal"
                                            value={order.editableQty ?? ""}
                                            onChange={(event) =>
                                              updateUnconfirmedQty(
                                                order,
                                                event.target.value,
                                              )
                                            }
                                            disabled={isSavingDecision}
                                            aria-label={`Qty for ${order.itemCode || "item"}`}
                                            className="w-24 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-right font-semibold tabular-nums text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-700 dark:bg-gray-950 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-900"
                                          />
                                        </td>
                                        <td className="global-tran-td-ui text-center">
                                          <span
                                            className={`inline-flex rounded-full px-2 py-1 text-[11px] font-bold ${
                                              status === "ACCEPTED"
                                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                                                : status === "REJECTED"
                                                  ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300"
                                                  : "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
                                            }`}
                                            title={order.decisionRemarks || ""}
                                          >
                                            {status}
                                          </span>
                                        </td>
                                        <td className="global-tran-td-ui">
                                          <div className="flex items-center justify-center gap-2">
                                            <button
                                              type="button"
                                              onClick={() =>
                                                handleUnconfirmedDecision(
                                                  order,
                                                  "ACCEPTED",
                                                )
                                              }
                                              disabled={isSavingDecision}
                                              className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                                            >
                                              <CheckCircle2 className="h-3.5 w-3.5" />
                                              Accept
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                handleUnconfirmedDecision(
                                                  order,
                                                  "REJECTED",
                                                )
                                              }
                                              disabled={isSavingDecision}
                                              className="inline-flex items-center gap-1 rounded-md bg-red-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                                            >
                                              <XCircle className="h-3.5 w-3.5" />
                                              Reject
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                              </React.Fragment>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="global-tran-main-div-ui !mt-0 min-w-0 overflow-x-hidden px-2 pb-20 pt-[136px] sm:pt-[112px] md:pt-[116px] lg:pt-[120px]">
      {isLoading && <LoadingSpinner />}

      {/* Floating Header */}
      <div className="fixed left-2 right-2 top-[54px] z-[20] flex max-w-[calc(100vw-1rem)] items-center justify-between gap-2 rounded-lg bg-gradient-to-r from-blue-200 to-blue-100 p-2 text-blue-900 shadow-xl dark:bg-blue-900 dark:text-white sm:left-4 sm:right-4 sm:top-[62px] sm:max-w-none md:left-6 md:right-6">
        <div className="min-w-0 text-center sm:text-left">
          <h1 className="break-words px-1 text-base font-semibold leading-tight sm:px-3 sm:text-xl lg:text-2xl">
            Commissary
          </h1>
        </div>
        {renderCommissarySetupButton()}
      </div>

      {/* Query Parameters */}
      <div className="global-tran-header-div-ui !mt-0 !p-3 sm:!p-4">
        <div className="global-tran-header-tab-div-ui">
          <button className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">
            Query Parameters
          </button>
        </div>

        <div
          className={`grid grid-cols-1 gap-1 sm:gap-2 ${
            activeTabConfig.detailed ? "md:grid-cols-5" : "md:grid-cols-4"
          }`}
        >
          <FloatingField
            id="startDate"
            label="From Delivery Date"
            type="date"
            value={startDate}
            onChange={setStartDate}
            disabled={isLoading}
          />
          <FloatingField
            id="endDate"
            label="To Delivery Date"
            type="date"
            value={endDate}
            onChange={setEndDate}
            disabled={isLoading}
          />
          <FloatingField
            id="category"
            label="Filter by Category"
            type="select"
            value={category}
            onChange={setCategory}
            disabled={isLoading}
          >
            <option value="All">All Categories</option>
            {categories.map((cat) => (
              <option
                key={cat.categCode || "__BLANK__"}
                value={cat.categCode || ""}
              >
                {categoryDescriptionsByCode[cat.categCode] ||
                  categoryDescriptionsByCode[
                    String(cat.categCode || "").toUpperCase()
                  ] ||
                  (cat.categName !== cat.categCode ? cat.categName : "") ||
                  cat.categCode ||
                  "Uncategorized"}
              </option>
            ))}
          </FloatingField>

          <FloatingField
            id="viewType"
            label="View Type"
            type="select"
            value={viewType}
            onChange={setViewType}
            disabled={isLoading}
          >
            <option value="forecast">Forecast</option>
            <option value="confirmed">Confirmed</option>
          </FloatingField>

          {activeTabConfig.detailed && (
            <FloatingField
              id="storeFilter"
              label="Filter by Store"
              type="select"
              value={storeFilter}
              onChange={setStoreFilter}
              disabled={isLoading || storeOptions.length === 0}
            >
              <option value="All">All Stores</option>
              {storeOptions.map((store) => (
                <option key={store.storeCode} value={store.storeCode}>
                  {store.storeName}
                </option>
              ))}
            </FloatingField>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {errorMessage}
        </div>
      )}

      {/* Main Tab Div */}
      <div className="global-tran-tab-div-ui !p-3 sm:!p-4 lg:!p-6 mt-4">
        <div className="global-tran-tab-nav-ui !items-stretch !gap-3 sm:!items-center">
          {renderTabButtons(true)}
        </div>

        {woSuccessMsg && (
          <div className="mt-3 rounded-md border border-emerald-300 bg-emerald-100 p-3 text-sm font-semibold text-emerald-900 dark:border-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-200">
            ✓ {woSuccessMsg}
          </div>
        )}

        {/* Data Table */}
        <div className="global-tran-table-main-div-ui mt-3 block max-w-full overflow-x-auto sm:mt-4">
          <div className="global-tran-table-main-sub-div-ui relative isolate !max-h-[56vh] sm:!max-h-[500px]">
            <table className="w-max min-w-full table-fixed border-separate border-spacing-0 [&_td]:border-b [&_td]:border-r [&_td]:border-slate-200 [&_th]:border-b [&_th]:border-r [&_th]:border-slate-200 [&_tr>td:first-child]:border-l">
              <thead className="global-tran-thead-div-ui sticky top-0 z-[220]">
                <tr>
                  {showsBranchColumn && (
                    <th className="global-tran-th-ui sticky top-0 z-[210] w-[180px] min-w-[180px] bg-blue-100 text-left dark:bg-blue-900">
                      {activeTabConfig.materialSummary ? "Branch" : "Store"}
                    </th>
                  )}
                  <th className="global-tran-th-ui sticky top-0 z-[210] w-[120px] min-w-[120px] bg-blue-100 text-left dark:bg-blue-900">
                    Item Code
                  </th>
                  <th className="global-tran-th-ui sticky top-0 z-[210] w-[260px] min-w-[260px] bg-blue-100 text-left dark:bg-blue-900">
                    Description
                  </th>
                  <th className="global-tran-th-ui sticky top-0 z-[210] w-[90px] min-w-[90px] bg-blue-100 text-left dark:bg-blue-900">
                    UOM
                  </th>

                  {showsIntegrationDetails && (
                    <th className="global-tran-th-ui sticky top-0 z-[210] w-[145px] min-w-[145px] bg-blue-100 text-left dark:bg-blue-900">
                      Integration Status
                    </th>
                  )}

                  {dates.map((date) => (
                    <th
                      key={date}
                      className={`global-tran-th-ui sticky top-0 z-[210] bg-blue-100 dark:bg-blue-900 ${
                        showsIntegrationDetails
                          ? "w-[160px] min-w-[160px] max-w-[160px] text-center"
                          : "w-[96px] min-w-[96px] max-w-[96px] text-right"
                      }`}
                    >
                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-300">
                        {dayLabel(date)}
                      </div>
                      <div>{shortDate(date)}</div>
                    </th>
                  ))}

                  <th className="global-tran-th-ui sticky top-0 z-[210] w-[100px] min-w-[100px] max-w-[100px] bg-blue-100 text-right font-bold text-blue-900 dark:bg-blue-900 dark:text-white">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={colSpan}
                      className="global-tran-td-ui py-10 text-center text-sm text-slate-500"
                    >
                      Loading {activeTabConfig.label.toLowerCase()}...
                    </td>
                  </tr>
                ) : currentData.length === 0 ? (
                  <tr>
                    <td
                      colSpan={colSpan}
                      className="global-tran-td-ui py-10 text-center text-sm text-slate-500"
                    >
                      <div className="flex flex-col items-center justify-center gap-2">
                        <PackageOpen className="h-8 w-8 text-slate-400" />
                        <span>{activeTabConfig.emptyText}</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  groupedCurrentData.map((group) => {
                    const isCollapsed = activeCollapsedCategorySet.has(
                      group.categoryName,
                    );
                    const categoryTotal = getCategoryTotal(group.rows);

                    return (
                      <React.Fragment
                        key={`${activeTab}-${group.categoryName}`}
                      >
                        <tr className="bg-blue-50 dark:bg-blue-950/40">
                          <td
                            colSpan={colSpan}
                            className="global-tran-td-ui !p-0"
                          >
                            <button
                              type="button"
                              onClick={() =>
                                toggleCategoryCollapse(group.categoryName)
                              }
                              aria-expanded={!isCollapsed}
                              className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs font-bold uppercase text-blue-900 hover:bg-blue-100 dark:text-blue-100 dark:hover:bg-blue-900/60"
                            >
                              <span className="flex min-w-0 items-center gap-2">
                                <ChevronDown
                                  className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
                                    isCollapsed ? "-rotate-90" : "rotate-0"
                                  }`}
                                />
                                <span className="truncate">
                                  Category: {group.categoryDescription}
                                </span>
                              </span>
                              <span className="shrink-0 text-right text-[11px] font-semibold normal-case text-slate-600 dark:text-slate-300">
                                {group.rows.length} item
                                {group.rows.length === 1 ? "" : "s"} • Total{" "}
                                {categoryTotal.toLocaleString()}
                              </span>
                            </button>
                          </td>
                        </tr>

                        {!isCollapsed && activeTabConfig.materialSummary ? (
                          <MaterialSummaryRows
                            materials={group.rows}
                            dates={dates}
                            expandedMaterials={activeExpandedMaterials}
                            onToggleMaterial={toggleMaterialExpansion}
                          />
                        ) : (
                          !isCollapsed &&
                          group.rows.map((row, idx) => (
                            <tr
                              key={`${group.categoryName}-${row.storeCode || "all"}-${row.itemCode}-${idx}`}
                              className="global-tran-tr-ui bg-white hover:bg-slate-50 dark:bg-black dark:hover:bg-gray-900/50"
                            >
                              {activeTabConfig.detailed && (
                                <td className="global-tran-td-ui w-[180px] min-w-[180px] text-left font-semibold text-slate-800 dark:text-slate-200">
                                  {row.store}
                                </td>
                              )}
                              <td className="global-tran-td-ui w-[120px] min-w-[120px] text-left font-mono text-sm text-slate-600 dark:text-slate-400">
                                {row.itemCode}
                              </td>
                              <td className="global-tran-td-ui w-[260px] min-w-[260px] text-left">
                                <span className="block truncate font-medium">
                                  {row.itemDesc}
                                </span>
                              </td>
                              <td className="global-tran-td-ui w-[90px] min-w-[90px] text-left font-semibold text-slate-600 dark:text-slate-300">
                                {row.uomCode || "-"}
                              </td>

                              {showsIntegrationDetails && (
                                <td className="global-tran-td-ui w-[145px] min-w-[145px] text-left text-xs">
                                  <span
                                    className={`inline-flex rounded-full px-2 py-1 font-bold ${
                                      row.integrationStatus === "Sent"
                                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200"
                                        : row.integrationStatus ===
                                            "Partially Sent"
                                          ? "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200"
                                          : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                    }`}
                                    title={
                                      row.integrationStatus === "Sent"
                                        ? `SO: ${row.soStatus || "Closed"}; DR: ${row.drStatus || "Open - For Picking"}`
                                        : row.integrationStatus
                                    }
                                  >
                                    {row.integrationStatus}
                                  </span>
                                </td>
                              )}

                              {dates.map((date) =>
                                showsIntegrationDetails ? (
                                  <IntegrationDateCell
                                    key={date}
                                    date={date}
                                    row={row}
                                  />
                                ) : (
                                  <td
                                    key={date}
                                    className="global-tran-td-ui w-[96px] min-w-[96px] max-w-[96px] text-right font-medium"
                                  >
                                    {row.dates[date]
                                      ? row.dates[date].toLocaleString()
                                      : "-"}
                                  </td>
                                ),
                              )}

                              <td className="global-tran-td-ui w-[100px] min-w-[100px] max-w-[100px] bg-slate-50 text-right text-xs font-bold text-blue-700 dark:bg-gray-900 dark:text-blue-300">
                                {row.total.toLocaleString()}
                              </td>
                            </tr>
                          ))
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Summary with Integrated Work Order Action Button */}
        {!isLoading && currentData.length > 0 && (
          <div className="global-tran-tab-footer-main-div-ui !mt-4 !justify-end !gap-3 flex flex-wrap items-center">
            {activeTab === "confirmedSummary" && (
              <button
                type="button"
                onClick={handleGenerateWorkOrders}
                disabled={
                  isGeneratingWO || isLoading || currentData.length === 0
                }
                className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-bold text-white shadow transition-all sm:text-sm ${
                  isGeneratingWO || currentData.length === 0 || isLoading
                    ? "cursor-not-allowed bg-gray-400 dark:bg-gray-700"
                    : "bg-emerald-600 hover:bg-emerald-700 active:scale-95 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                }`}
              >
                <Boxes className="h-4 w-4 shrink-0" />
                {isGeneratingWO
                  ? "Integrating Work Orders..."
                  : "Integrate to Work Order"}
              </button>
            )}

            {activeTab === "confirmedDetailed" && (
              <button
                type="button"
                onClick={() => {
                  setSelectedIntegrationRowIds([]);
                  setShowSODRModal(true);
                }}
                disabled={isLoading || currentData.length === 0}
                className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-bold text-white shadow transition-all sm:text-sm ${
                  isLoading || currentData.length === 0
                    ? "cursor-not-allowed bg-gray-400 dark:bg-gray-700"
                    : "bg-indigo-600 hover:bg-indigo-700 active:scale-95 dark:bg-indigo-600 dark:hover:bg-indigo-500"
                }`}
              >
                <ShoppingCart className="h-4 w-4 shrink-0" />
                Integrate to SO/DR
              </button>
            )}

            <div className="global-tran-tab-footer-total-main-div-ui w-full rounded-lg bg-blue-50/60 px-3 py-2 sm:w-auto dark:bg-gray-900/40">
              <div className="global-tran-tab-footer-total-div-ui">
                <label className="global-tran-tab-footer-total-label-ui">
                  {activeTabConfig.label} Total Quantity:
                </label>
                <label className="global-tran-tab-footer-total-value-ui">
                  {totalQueryQty.toLocaleString()}
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {showSODRModal && (
        <div
          className="fixed inset-0 z-[9998] flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-sm sm:p-6"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) handleCloseSODRModal();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="so-dr-modal-title"
            className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950"
          >
            <header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-4 text-white dark:border-slate-700 sm:px-6">
              <div>
                <h2
                  id="so-dr-modal-title"
                  className="text-lg font-bold sm:text-xl"
                >
                  Integrate Confirmed Orders to SO/DR
                </h2>
              </div>
              <button
                type="button"
                onClick={handleCloseSODRModal}
                className="rounded-lg p-2 text-white/90 transition hover:bg-white/15 hover:text-white"
                aria-label="Close SO/DR integration modal"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="grid grid-cols-2 gap-2 border-b border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-4 sm:p-4">
              <div className="rounded-lg bg-white p-3 shadow-sm dark:bg-slate-950">
                <div className="text-[10px] font-bold uppercase text-slate-400">
                  from Delivery Date
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {startDate}
                </div>
              </div>
              <div className="rounded-lg bg-white p-3 shadow-sm dark:bg-slate-950">
                <div className="text-[10px] font-bold uppercase text-slate-400">
                  To Derlivery Date
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {endDate}
                </div>
              </div>
              <div className="rounded-lg bg-white p-3 shadow-sm dark:bg-slate-950">
                <div className="text-[10px] font-bold uppercase text-slate-400">
                  Selected Records
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {selectedIntegrationRows.length.toLocaleString()} /{" "}
                  {integrationRows.length.toLocaleString()}
                </div>
              </div>
              <div className="rounded-lg bg-white p-3 shadow-sm dark:bg-slate-950">
                <div className="text-[10px] font-bold uppercase text-slate-400">
                  Selected Quantity
                </div>
                <div className="mt-1 text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                  {selectedIntegrationQuantity.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="grid gap-3 border-b border-slate-200 p-3 dark:border-slate-800 sm:grid-cols-2 sm:p-4 lg:grid-cols-4 lg:items-stretch">
              <div className="sm:col-span-2 lg:col-span-2">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
                    Customer Selection by Store
                  </label>
                  {isLoadingIntegrationCustomers && (
                    <span className="text-[10px] font-semibold text-indigo-600">
                      Loading...
                    </span>
                  )}
                </div>
                <div className="max-h-28 overflow-auto rounded-lg border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-950">
                  {selectedStoreCodes.length === 0 ? (
                    <div className="px-3 py-3 text-xs text-slate-500">
                      Select at least one item to load its store customer.
                    </div>
                  ) : (
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                        <tr>
                          <th className="px-3 py-2 text-left">Store</th>
                          <th className="px-3 py-2 text-left">Customer</th>
                          <th className="px-3 py-2 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedStoreCodes.map((storeCode) => {
                          const selectedCustomer =
                            selectedIntegrationCustomersByStore[storeCode];
                          const customerCount = integrationCustomers.filter(
                            (customer) =>
                              customer?.storeCode === storeCode &&
                              customer?.hasCustomer &&
                              customer?.customerCode,
                          ).length;
                          const hasCustomerOptions = customerCount > 0;

                          return (
                            <tr
                              key={storeCode}
                              className="border-t border-slate-100 dark:border-slate-800"
                            >
                              <td className="px-3 py-2 font-semibold">
                                {branchNamesByCode[storeCode] ||
                                  branchNamesByCode[storeCode.toUpperCase()] ||
                                  storeCode}
                                <span className="ml-1 font-mono text-[10px] text-slate-400">
                                  ({storeCode})
                                </span>
                              </td>
                              <td
                                className={`px-3 py-2 ${
                                  selectedCustomer
                                    ? "text-slate-700 dark:text-slate-200"
                                    : hasCustomerOptions
                                      ? "font-semibold text-amber-600"
                                      : "font-semibold text-red-600"
                                }`}
                              >
                                {isLoadingIntegrationCustomers
                                  ? "Loading customers..."
                                  : selectedCustomer
                                    ? `${selectedCustomer.customerCode} - ${selectedCustomer.customerName || ""}`
                                    : hasCustomerOptions
                                      ? "Auto-selecting customer..."
                                      : "No customer tagged under this branch"}
                              </td>
                              <td className="px-3 py-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => openCustomerLookup(storeCode)}
                                  disabled={
                                    isLoadingIntegrationCustomers ||
                                    !hasCustomerOptions
                                  }
                                  className={`inline-flex items-center justify-center gap-1 rounded-md border px-2.5 py-1.5 text-[11px] font-bold transition ${
                                    isLoadingIntegrationCustomers ||
                                    !hasCustomerOptions
                                      ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-800 dark:bg-slate-900"
                                      : "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300"
                                  }`}
                                  aria-label={`Search customer for ${storeCode}`}
                                >
                                  <Search className="h-3.5 w-3.5" />
                                  Search
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              <div>
                <label
                  htmlFor="soDrPoNumber"
                  className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300"
                >
                  PO Number
                </label>
                <input
                  id="soDrPoNumber"
                  type="text"
                  value={soDrForm.poNumber}
                  onChange={(event) =>
                    setSoDrForm((previous) => ({
                      ...previous,
                      poNumber: event.target.value,
                    }))
                  }
                  placeholder="Next SO Number"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-indigo-900/40"
                />
              </div>

              <div className="flex flex-col sm:col-span-2 lg:col-span-1">
                <label
                  htmlFor="soDrRemarks"
                  className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300"
                >
                  Remarks
                </label>
                <textarea
                  id="soDrRemarks"
                  rows={5}
                  value={soDrForm.remarks}
                  onChange={(event) =>
                    setSoDrForm((previous) => ({
                      ...previous,
                      remarks: event.target.value,
                    }))
                  }
                  placeholder="Enter remarks"
                  className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-indigo-900/40 lg:min-h-0 lg:flex-1 lg:resize-none"
                />
              </div>
            </div>

            <div className="relative isolate min-h-0 flex-1 overflow-auto overscroll-contain px-3 pb-3 pt-0 sm:px-4 sm:pb-4 sm:pt-0">
              <table className="w-full min-w-[760px] table-fixed border-collapse text-sm">
                <colgroup>
                  <col className="w-12" />
                  <col className="w-[15%]" />
                  <col className="w-[17%]" />
                  <col />
                  <col className="w-[11%]" />
                  <col className="w-[18%]" />
                  <col className="w-[13%]" />
                </colgroup>
                <thead>
                  <tr>
                    <th className="sticky top-0 z-30 border-b border-slate-300 bg-slate-100 px-3 py-2 text-center shadow-[0_1px_0_rgba(148,163,184,0.45)] dark:border-slate-700 dark:bg-slate-900">
                      <input
                        type="checkbox"
                        checked={allIntegrationRowsSelected}
                        onChange={toggleAllIntegrationRows}
                        aria-label="Select all items for SO/DR integration"
                        className="h-4 w-4 cursor-pointer rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </th>
                    <th className="sticky top-0 z-30 border-b border-slate-300 bg-slate-100 px-3 py-2 text-left shadow-[0_1px_0_rgba(148,163,184,0.45)] dark:border-slate-700 dark:bg-slate-900">
                      Branch
                    </th>
                    <th className="sticky top-0 z-30 border-b border-slate-300 bg-slate-100 px-3 py-2 text-left shadow-[0_1px_0_rgba(148,163,184,0.45)] dark:border-slate-700 dark:bg-slate-900">
                      Item Code
                    </th>
                    <th className="sticky top-0 z-30 border-b border-slate-300 bg-slate-100 px-3 py-2 text-left shadow-[0_1px_0_rgba(148,163,184,0.45)] dark:border-slate-700 dark:bg-slate-900">
                      Description
                    </th>
                    <th className="sticky top-0 z-30 border-b border-slate-300 bg-slate-100 px-3 py-2 text-left shadow-[0_1px_0_rgba(148,163,184,0.45)] dark:border-slate-700 dark:bg-slate-900">
                      UOM
                    </th>
                    <th className="sticky top-0 z-30 border-b border-slate-300 bg-slate-100 px-3 py-2 text-left shadow-[0_1px_0_rgba(148,163,184,0.45)] dark:border-slate-700 dark:bg-slate-900">
                      Unsent Delivery Date(s)
                    </th>
                    <th className="sticky top-0 z-30 border-b border-slate-300 bg-slate-100 px-3 py-2 text-right shadow-[0_1px_0_rgba(148,163,184,0.45)] dark:border-slate-700 dark:bg-slate-900">
                      Quantity
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {integrationRows.map((row) => {
                    const isSelected = selectedIntegrationRowIdSet.has(
                      row.integrationRowId,
                    );

                    return (
                      <tr
                        key={row.integrationRowId}
                        className={
                          isSelected
                            ? "bg-indigo-50/60 hover:bg-indigo-50 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/30"
                            : "hover:bg-slate-50 dark:hover:bg-slate-900/70"
                        }
                      >
                        <td className="border-b border-slate-100 px-3 py-2 text-center dark:border-slate-800">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() =>
                              toggleIntegrationRow(row.integrationRowId)
                            }
                            aria-label={`Select ${row.itemCode || "item"} for SO/DR integration`}
                            className="h-4 w-4 cursor-pointer rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </td>
                        <td
                          className="truncate border-b border-slate-100 px-3 py-2 font-medium dark:border-slate-800"
                          title={getStoreLabel(row)}
                        >
                          {getStoreLabel(row)}
                        </td>
                        <td
                          className="truncate border-b border-slate-100 px-3 py-2 font-mono dark:border-slate-800"
                          title={row.itemCode || "-"}
                        >
                          {row.itemCode || "-"}
                        </td>
                        <td
                          className="truncate border-b border-slate-100 px-3 py-2 dark:border-slate-800"
                          title={row.itemDesc || "-"}
                        >
                          {row.itemDesc || "-"}
                        </td>
                        <td
                          className="truncate border-b border-slate-100 px-3 py-2 dark:border-slate-800"
                          title={row.uomCode || "-"}
                        >
                          {row.uomCode || "-"}
                        </td>
                        <td
                          className="border-b border-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:text-slate-200"
                          title={row.unsentDeliveryDates.join(", ")}
                        >
                          {row.unsentDeliveryDates
                            .map((date) => shortDate(date))
                            .join(", ")}
                        </td>
                        <td className="border-b border-slate-100 px-3 py-2 text-right font-semibold dark:border-slate-800">
                          {Number(
                            row.unsentQty ?? row.total ?? 0,
                          ).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900 sm:px-6">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                {selectedIntegrationRows.length.toLocaleString()} item(s)
                selected
              </span>
              <button
                type="button"
                onClick={handleSendConfirmedToSODR}
                disabled={
                  isSendingToSODR ||
                  selectedIntegrationRows.length === 0 ||
                  isLoadingIntegrationCustomers ||
                  storesWithoutIntegrationCustomers.length > 0 ||
                  storesWithoutSelectedCustomer.length > 0
                }
                className={`rounded-lg px-5 py-2 text-sm font-bold text-white shadow transition ${
                  isSendingToSODR ||
                  selectedIntegrationRows.length === 0 ||
                  isLoadingIntegrationCustomers ||
                  storesWithoutIntegrationCustomers.length > 0 ||
                  storesWithoutSelectedCustomer.length > 0
                    ? "cursor-not-allowed bg-gray-400 dark:bg-gray-700"
                    : "bg-indigo-600 hover:bg-indigo-700 active:scale-95 dark:bg-indigo-600 dark:hover:bg-indigo-500"
                }`}
              >
                {isSendingToSODR ? "Sending..." : "Send"}
              </button>
            </footer>
          </section>

          {customerLookupStoreCode && (
            <div
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6"
              role="presentation"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) closeCustomerLookup();
              }}
            >
              <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="customer-lookup-title"
                className="flex max-h-[75vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950"
              >
                <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                  <div>
                    <h3
                      id="customer-lookup-title"
                      className="text-base font-bold text-slate-800 dark:text-slate-100"
                    >
                      Select Customer
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      Showing customers tagged under{" "}
                      <span className="font-semibold">
                        {branchNamesByCode[customerLookupStoreCode] ||
                          branchNamesByCode[
                            customerLookupStoreCode.toUpperCase()
                          ] ||
                          customerLookupStoreCode}
                      </span>{" "}
                      ({customerLookupStoreCode})
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeCustomerLookup}
                    className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                    aria-label="Close customer search"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </header>

                <div className="border-b border-slate-200 p-3 dark:border-slate-800 sm:p-4">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      autoFocus
                      value={customerLookupSearch}
                      onChange={(event) =>
                        setCustomerLookupSearch(event.target.value)
                      }
                      placeholder="Search customer code or name"
                      className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-indigo-900/40"
                    />
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-auto">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead className="sticky top-0 bg-slate-100 text-xs uppercase text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                      <tr>
                        <th className="px-4 py-2.5 text-left">Customer Code</th>
                        <th className="px-4 py-2.5 text-left">Customer Name</th>
                        <th className="w-24 px-4 py-2.5 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customerLookupOptions.length === 0 ? (
                        <tr>
                          <td
                            colSpan={3}
                            className="px-4 py-10 text-center text-sm text-slate-500"
                          >
                            No customer found under this branch.
                          </td>
                        </tr>
                      ) : (
                        customerLookupOptions.map((customer) => {
                          const isSelected =
                            selectedIntegrationCustomersByStore[
                              customerLookupStoreCode
                            ]?.customerCode === customer.customerCode;

                          return (
                            <tr
                              key={`${customer.storeCode}-${customer.customerCode}`}
                              className={`border-t border-slate-100 dark:border-slate-800 ${
                                isSelected
                                  ? "bg-indigo-50 dark:bg-indigo-950/30"
                                  : "hover:bg-slate-50 dark:hover:bg-slate-900/70"
                              }`}
                            >
                              <td className="px-4 py-3 font-mono font-semibold text-slate-700 dark:text-slate-200">
                                {customer.customerCode}
                              </td>
                              <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                                {customer.customerName || "-"}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  type="button"
                                  onClick={() =>
                                    selectIntegrationCustomer(customer)
                                  }
                                  className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${
                                    isSelected
                                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                                      : "bg-indigo-600 text-white hover:bg-indigo-700"
                                  }`}
                                >
                                  {isSelected ? "Selected" : "Select"}
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
