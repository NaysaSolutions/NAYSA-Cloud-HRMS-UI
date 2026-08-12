/* eslint-disable react/prop-types */
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  ChevronDown,
  Clock3,
  PackageOpen,
  RefreshCw,
  RotateCcw,
  Send,
  UserRound,
} from "lucide-react";

import { fetchData, postRequest } from "../../../Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

const formatDate = (date) => {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const getDateRange = (start, end) => {
  if (!start || !end) return [];

  const dates = [];
  const current = new Date(`${start}T00:00:00`);
  const last = new Date(`${end}T00:00:00`);

  if (Number.isNaN(current.getTime()) || Number.isNaN(last.getTime()) || current > last) {
    return [];
  }

  while (current <= last) {
    dates.push(formatDate(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
};

const tomorrowDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return formatDate(d);
};

const defaultForecastStartDate = () => formatDate(new Date());

const defaultForecastEndDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + 6);
  return formatDate(d);
};

const shortDate = (iso) => {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const dayLabel = (iso) => {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-US", { weekday: "long" });
};

const getRowValue = (row, keys, fallback = "") => {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && value !== "") {
      return String(value).trim();
    }
  }

  return fallback;
};

const getCurrentUserCode = (currentUserRow, user) =>
  getRowValue(
    currentUserRow,
    [
      "userCode",
      "USER_CODE",
      "user_code",
      "UserCode",
      "USERCODE",
      "usercode",
      "USERID",
      "userid",
      "userId",
      "UserID",
      "USER_ID",
      "user_id",
      "LOGIN_ID",
      "loginId",
      "ACTCODE",
      "actCode",
      "USERNAME",
      "username",
    ],
    getRowValue(
      user,
      [
        "USER_CODE",
        "userCode",
        "user_code",
        "UserCode",
        "USERCODE",
        "usercode",
        "USERID",
        "userid",
        "userId",
        "UserID",
        "USER_ID",
        "user_id",
        "LOGIN_ID",
        "loginId",
        "ACTCODE",
        "actCode",
        "USERNAME",
        "username",
        "name",
      ],
      "",
    ),
  );

const getCurrentUserName = (currentUserRow, user) =>
  getRowValue(
    currentUserRow,
    ["userName", "USER_NAME", "user_name", "UserName", "name", "fullName", "FULL_NAME"],
    getRowValue(user, ["USER_NAME", "name", "fullName"], ""),
  );

const getCurrentUserBranchCode = (currentUserRow) =>
  getRowValue(currentUserRow, [
    "branchCode",
    "BRANCH_CODE",
    "branch_code",
    "BranchCode",
    "branch",
    "BRANCH",
  ]);

const getCurrentUserBranchName = (currentUserRow) =>
  getRowValue(currentUserRow, [
    "branchName",
    "BRANCH_NAME",
    "branch_name",
    "BranchName",
    "branchDesc",
    "BRANCH_DESC",
  ]);


const unwrapDataArray = (response) => {
  const raw =
    response?.data ??
    response?.Data ??
    response?.result ??
    response?.RESULT ??
    [];

  if (Array.isArray(raw)) {
    const firstResult = raw?.[0]?.result ?? raw?.[0]?.RESULT;
    if (typeof firstResult === "string") {
      try {
        const parsed = JSON.parse(firstResult);
        return Array.isArray(parsed) ? parsed : raw;
      } catch {
        return raw;
      }
    }

    return raw;
  }

  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
};


const normalizeDate = (value) => {
  if (!value) return "";

  if (typeof value === "string") {
    const dateOnly = value.split("T")[0]?.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return dateOnly;
  }

  return formatDate(value);
};

const toNumber = (value) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toBoolean = (value) =>
  value === true ||
  value === 1 ||
  ["1", "true", "y", "yes"].includes(String(value ?? "").trim().toLowerCase());

const getCategoryLabel = (item = {}) => {
  const category = String(item?.categCode ?? "").trim();
  return category || "Uncategorized";
};

const getApiErrorMessage = (error, fallback = "Unable to complete request.") => {
  const data = error?.response?.data;

  if (typeof data?.message === "string" && data.message.trim()) {
    return data.message;
  }

  const errors = data?.errors;

  if (errors?.errorMessage) {
    return String(errors.errorMessage);
  }

  if (typeof errors === "string" && errors.trim()) {
    return errors;
  }

  if (Array.isArray(errors)) {
    const first = errors.flat().find(Boolean);
    if (first) return String(first);
  }

  if (errors && typeof errors === "object") {
    const first = Object.values(errors).flat().find(Boolean);
    if (first) return String(first);
  }

  return error?.message || fallback;
};

const normalizeItemRow = (row = {}) => ({
  ...row,
  itemCode: getRowValue(row, ["itemCode", "ITEM_CODE", "item_code", "ItemCode", "ITEM_NO", "itemNo"]),
  itemName: getRowValue(row, ["itemName", "ITEM_NAME", "item_name", "ItemName", "ITEM_DESC", "itemDesc"]),
  categCode: getRowValue(row, ["categCode", "CATEG_CODE", "categ_code", "CategCode", "CATEGORY_CODE", "categoryCode"], ""),
  uomCode: getRowValue(row, ["uomCode", "UOM_CODE", "uom_code", "UomCode", "UOM", "uom"]),
  storeItemTag: getRowValue(row, ["storeItemTag", "STORE_ITEM_TAG", "store_item_tag", "itemAvailability"], ""),
  storeType: getRowValue(row, ["storeType", "STORE_TYPE", "store_type", "branchStoreType"], ""),
});

const normalizeForecastRow = (row = {}) => ({
  ...row,
  forecastId: getRowValue(row, ["forecastId", "FORECAST_ID", "forecast_id", "ORDER_ID", "orderId"]),
  itemCode: getRowValue(row, ["itemCode", "ITEM_CODE", "item_code", "ItemCode", "ITEM_NO", "itemNo"]),
  itemName: getRowValue(row, ["itemName", "ITEM_NAME", "item_name", "ItemName", "ITEM_DESC", "itemDesc"]),
  categCode: getRowValue(row, ["categCode", "CATEG_CODE", "categ_code", "CategCode", "CATEGORY_CODE", "categoryCode"], ""),
  uomCode: getRowValue(row, ["uomCode", "UOM_CODE", "uom_code", "UomCode", "UOM", "uom"]),
  deliveryDate: normalizeDate(
    row.deliveryDate ??
      row.DELIVERY_DATE ??
      row.delivery_date ??
      row.DeliveryDate ??
      row.ORDER_DATE ??
      row.orderDate,
  ),
  orderQty: toNumber(row.orderQty ?? row.ORDER_QTY ?? row.order_qty ?? row.OrderQty ?? row.QTY ?? row.qty),
  confirmed: toBoolean(row.confirmed ?? row.CONFIRMED ?? row.isConfirmed ?? row.IS_CONFIRMED),
  confirmedBy: getRowValue(row, ["confirmedBy", "CONFIRMED_BY", "confirmed_by"], ""),
  confirmedDate: normalizeDate(row.confirmedDate ?? row.CONFIRMED_DATE ?? row.confirmed_date),
});

const normalizeConfirmationRow = (row = {}, fallbackDate = "") => {
  const normalized = normalizeForecastRow(row);

  return {
    ...normalized,
    deliveryDate: normalized.deliveryDate || fallbackDate,
    forecastQty: toNumber(row.forecastQty ?? row.FORECAST_QTY ?? row.forecast_qty ?? normalized.orderQty),
  };
};

const normalizeHistoryRow = (row = {}) => ({
  ...normalizeForecastRow(row),
  weeklyForecastNo: getRowValue(row, ["weeklyForecastNo", "WEEKLY_FORECAST_NO", "ORDER_NO", "orderNo"], ""),
  originalWeeklyQty: toNumber(
    row.originalWeeklyQty ??
      row.ORIGINAL_WEEKLY_QTY ??
      row.original_weekly_qty ??
      row.forecastQty ??
      row.FORECAST_QTY ??
      row.orderQty,
  ),
  confirmedOrderQty: toNumber(
    row.confirmedOrderQty ??
      row.CONFIRMED_ORDER_QTY ??
      row.confirmed_order_qty ??
      row.confirmedQty ??
      row.CONFIRMED_QTY,
  ),
  balanceQty: toNumber(row.balanceQty ?? row.BALANCE_QTY ?? row.balance_qty),
  displayQty: toNumber(row.displayQty ?? row.DISPLAY_QTY ?? row.display_qty ?? row.orderQty),
  status: getRowValue(row, ["status", "STATUS"], toBoolean(row.confirmed) ? "Confirmed" : "Forecast"),
});

const normalizeStoreContextRow = (row = {}) => ({
  storeCode: getRowValue(row, ["storeCode", "STORE_CODE", "branchCode", "BRANCH_CODE"], ""),
  storeType: getRowValue(row, ["storeType", "STORE_TYPE", "branchStoreType", "BRANCH_STORE_TYPE"], ""),
});


const mergeUniqueItems = (rows = []) => {
  const itemMap = new Map();

  rows.forEach((row) => {
    const item = normalizeItemRow(row);
    if (!item.itemCode) return;

    if (!itemMap.has(item.itemCode)) {
      itemMap.set(item.itemCode, item);
    }
  });

  return Array.from(itemMap.values());
};

const buildOrderMatrix = (loadedItems, savedForecastRows, forecastDates) => {
  const matrix = {};

  loadedItems.forEach((item) => {
    if (!item.itemCode) return;

    matrix[item.itemCode] = {};
    forecastDates.forEach((date) => {
      matrix[item.itemCode][date] = 0;
    });
  });

  savedForecastRows.forEach((row) => {
    if (!row.itemCode || !row.deliveryDate || !matrix[row.itemCode]) return;
    if (!forecastDates.includes(row.deliveryDate)) return;

    // Always display the saved Order Forecast qty, even when confirmed.
    // Example: Order Forecast 500 -> Daily Order Confirmed 300 -> Order Forecast cell shows 300 and is locked.
    matrix[row.itemCode][row.deliveryDate] = toNumber(row.orderQty);
  });

  return matrix;
};

const buildConfirmedMatrix = (loadedItems, savedForecastRows, forecastDates) => {
  const matrix = {};

  loadedItems.forEach((item) => {
    if (!item.itemCode) return;

    matrix[item.itemCode] = {};
    forecastDates.forEach((date) => {
      matrix[item.itemCode][date] = false;
    });
  });

  savedForecastRows.forEach((row) => {
    if (!row.itemCode || !row.deliveryDate || !matrix[row.itemCode]) return;
    if (!forecastDates.includes(row.deliveryDate)) return;

    matrix[row.itemCode][row.deliveryDate] = toBoolean(row.confirmed);
  });

  return matrix;
};

const cloneMatrix = (matrix = {}) =>
  Object.fromEntries(
    Object.entries(matrix).map(([itemCode, dateValues]) => [itemCode, { ...dateValues }]),
  );

const StatusPill = ({ children, variant = "default", className = "" }) => {
  const variantClass =
    variant === "success"
      ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-200 dark:border-green-800"
      : variant === "warning"
        ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800"
        : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800";

  return (
    <span className={`inline-flex max-w-full items-center justify-center rounded-md border px-2 py-1 text-center text-[10px] font-bold uppercase leading-tight tracking-wide sm:whitespace-nowrap ${variantClass} ${className}`}>
      {children}
    </span>
  );
};

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

const ActionButton = ({ children, icon: Icon, onClick, disabled = false, variant = "primary" }) => {
  const colorClass =
    variant === "success"
      ? "bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
      : "bg-blue-600 hover:bg-blue-700 dark:bg-blue-900 dark:hover:bg-blue-800";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-[38px] w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-white transition-colors sm:w-auto sm:px-4 sm:text-sm ${
        disabled ? "cursor-not-allowed bg-gray-400 hover:bg-gray-400 dark:bg-gray-700" : colorClass
      }`}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0" />}
      {children}
    </button>
  );
};

const focusNextQuantityInput = (event) => {
  if (event.key !== "Enter") return;

  event.preventDefault();

  const currentInput = event.currentTarget;
  const currentGroup = currentInput.dataset.qtyGroup;
  const currentCol = currentInput.dataset.qtyCol;
  const currentRow = Number(currentInput.dataset.qtyRow);

  const quantityInputs = Array.from(document.querySelectorAll('[data-store-portal-qty="true"]')).filter(
    (input) =>
      !input.disabled &&
      !input.readOnly &&
      (input.offsetWidth > 0 || input.offsetHeight > 0 || input.getClientRects().length > 0),
  );

  let nextInput = null;

  if (currentGroup && currentCol !== undefined && Number.isFinite(currentRow)) {
    nextInput = quantityInputs
      .filter(
        (input) =>
          input.dataset.qtyGroup === currentGroup &&
          input.dataset.qtyCol === currentCol &&
          Number(input.dataset.qtyRow) > currentRow,
      )
      .sort((a, b) => Number(a.dataset.qtyRow) - Number(b.dataset.qtyRow))[0];
  } else {
    const currentIndex = quantityInputs.indexOf(currentInput);
    nextInput = quantityInputs[currentIndex + 1];
  }

  if (nextInput) {
    nextInput.focus();
    nextInput.select?.();
  }
};

const formatQuantityWithSeparator = (value) => {
  if (value === null || value === undefined || value === "") return "";

  const stringValue = String(value).replace(/,/g, "");
  if (!/^\d*(\.\d*)?$/.test(stringValue)) return stringValue;

  const [wholePart = "", decimalPart] = stringValue.split(".");
  const normalizedWhole = wholePart.replace(/^0+(?=\d)/, "") || "0";
  const formattedWhole = normalizedWhole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  return decimalPart !== undefined ? `${formattedWhole}.${decimalPart}` : formattedWhole;
};

const QuantityInput = ({ value, onChange, tone = "blue", navGroup, navRow, navCol, disabled = false, max }) => {
  const displayValue = formatQuantityWithSeparator(value ?? 0);

  const valueClass =
    Number(value || 0) > 0
      ? tone === "green"
        ? "font-semibold text-green-700 dark:text-green-200"
        : "font-semibold text-slate-900 dark:text-white"
      : "text-slate-900 dark:text-white";

  const handleChange = (event) => {
    let sanitizedValue = event.target.value.replace(/[^0-9.]/g, "");

    const parts = sanitizedValue.split(".");
    if (parts.length > 2) {
      sanitizedValue = `${parts[0]}.${parts.slice(1).join("")}`;
    }

    // Allows decimals while typing, including temporary values like "1.".
    // Limit to 4 decimal places to match DECIMAL(18,4) in the stored procedure.
    if (/^\d*(\.\d{0,4})?$/.test(sanitizedValue)) {
      onChange(sanitizedValue);
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      max={max ?? undefined}
      data-store-portal-qty="true"
      data-qty-group={navGroup}
      data-qty-row={navRow}
      data-qty-col={navCol}
      value={displayValue}
      disabled={disabled}
      onChange={handleChange}
      onKeyDown={focusNextQuantityInput}
      className={`h-7 w-full border-0 bg-transparent px-1 text-right text-xs outline-none transition focus:outline-none focus:ring-0 ${disabled ? "cursor-not-allowed opacity-70" : ""} ${valueClass}`}
    />
  );
};

const DateInput = ({ value, onChange, disabled = false }) => (
  <input
    type="date"
    value={value || ""}
    disabled={disabled}
    onChange={(event) => onChange(event.target.value)}
    className={`h-7 w-full border-0 bg-transparent px-1 text-left text-xs text-slate-900 outline-none transition focus:outline-none focus:ring-0 dark:text-white ${disabled ? "cursor-not-allowed opacity-70" : ""}`}
  />
);

const Toast = ({ toast }) => {
  if (!toast) return null;

  const toneClass =
    toast.type === "error"
      ? "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/40 dark:text-red-100"
      : "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/40 dark:text-green-100";

  return (
    <div className={`fixed left-3 right-3 top-16 z-[9999] rounded-lg border px-4 py-3 text-sm font-medium shadow-xl sm:left-auto sm:right-4 sm:max-w-sm ${toneClass}`}>
      {toast.message}
    </div>
  );
};

export default function StorePortalOrder() {
  const { currentUserRow, refsLoading, user } = useAuth();

  const userCode = useMemo(() => getCurrentUserCode(currentUserRow, user), [currentUserRow, user]);
  const userName = useMemo(() => getCurrentUserName(currentUserRow, user), [currentUserRow, user]);
  const branchCode = useMemo(() => getCurrentUserBranchCode(currentUserRow), [currentUserRow]);
  const branchName = useMemo(() => getCurrentUserBranchName(currentUserRow), [currentUserRow]);
  const storeCode = branchCode;

  const [storeType, setStoreType] = useState("");
  const [forecastView, setForecastView] = useState("entry");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [collapsedCategories, setCollapsedCategories] = useState([]);
  const [startDate, setStartDate] = useState(defaultForecastStartDate);
  const [endDate, setEndDate] = useState(defaultForecastEndDate);

  const [items, setItems] = useState([]);
  const [orderMatrix, setOrderMatrix] = useState({});
  const [loadedOrderMatrix, setLoadedOrderMatrix] = useState({});
  const [confirmedMatrix, setConfirmedMatrix] = useState({});
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastSubmitting, setForecastSubmitting] = useState(false);

  const [deliveryDate, setDeliveryDate] = useState(tomorrowDate());
  const [confirmationCategoryFilter, setConfirmationCategoryFilter] = useState("");
  const [collapsedConfirmationCategories, setCollapsedConfirmationCategories] = useState([]);
  const [confirmationRows, setConfirmationRows] = useState([]);
  const [loadedConfirmationRows, setLoadedConfirmationRows] = useState([]);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmSubmitting, setConfirmSubmitting] = useState(false);

  const [historyCategoryFilter, setHistoryCategoryFilter] = useState("");
  const [collapsedHistoryCategories, setCollapsedHistoryCategories] = useState([]);
  const [historyRows, setHistoryRows] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [toast, setToast] = useState(null);

  const dates = useMemo(() => getDateRange(startDate, endDate), [startDate, endDate]);
  const hasTaggedBranch = Boolean(storeCode);
  const isBusy = refsLoading || forecastLoading || forecastSubmitting || confirmLoading || confirmSubmitting || historyLoading;
  const userDisplay = userName && userName !== userCode ? `${userCode} - ${userName}` : userCode;
  const branchDisplay = branchName ? `${branchCode} - ${branchName}` : branchCode;

  const categoryOptions = useMemo(() => {
    const categories = new Set();

    items.forEach((item) => {
      categories.add(getCategoryLabel(item));
    });

    return Array.from(categories).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const filteredItems = useMemo(() => {
    const rows = categoryFilter
      ? items.filter((item) => getCategoryLabel(item) === categoryFilter)
      : items;

    return [...rows].sort((a, b) => {
      const categoryCompare = getCategoryLabel(a).localeCompare(getCategoryLabel(b));
      if (categoryCompare !== 0) return categoryCompare;

      return String(a.itemName || a.itemCode || "").localeCompare(String(b.itemName || b.itemCode || ""));
    });
  }, [items, categoryFilter]);

  const groupedForecastItems = useMemo(() => {
    const groups = new Map();

    filteredItems.forEach((item, index) => {
      const category = getCategoryLabel(item);

      if (!groups.has(category)) {
        groups.set(category, []);
      }

      groups.get(category).push({ ...item, __displayIndex: index });
    });

    return Array.from(groups, ([category, categoryItems]) => ({ category, items: categoryItems }));
  }, [filteredItems]);

  const collapsedCategorySet = useMemo(() => new Set(collapsedCategories), [collapsedCategories]);

  const isCategoryCollapsed = useCallback(
    (category) => collapsedCategorySet.has(category),
    [collapsedCategorySet],
  );

  const toggleCategoryCollapse = useCallback((category) => {
    setCollapsedCategories((prev) =>
      prev.includes(category) ? prev.filter((value) => value !== category) : [...prev, category],
    );
  }, []);

  const visibleCollapsedCategoryCount = useMemo(
    () => groupedForecastItems.filter((group) => collapsedCategorySet.has(group.category)).length,
    [groupedForecastItems, collapsedCategorySet],
  );

  const handleToggleAllCategories = useCallback(() => {
    if (groupedForecastItems.length === 0) return;

    setCollapsedCategories((prev) => {
      const visibleCategories = groupedForecastItems.map((group) => group.category);
      const allVisibleCollapsed = visibleCategories.every((category) => prev.includes(category));

      if (allVisibleCollapsed) {
        return prev.filter((category) => !visibleCategories.includes(category));
      }

      return Array.from(new Set([...prev, ...visibleCategories]));
    });
  }, [groupedForecastItems]);

  const confirmationCategoryOptions = useMemo(() => {
    const categories = new Set();

    confirmationRows.forEach((row) => {
      categories.add(getCategoryLabel(row));
    });

    return Array.from(categories).sort((a, b) => a.localeCompare(b));
  }, [confirmationRows]);

  const filteredConfirmationRows = useMemo(() => {
    const rows = confirmationRows.map((row, index) => ({ ...row, __originalIndex: index }));
    const filteredRows = confirmationCategoryFilter
      ? rows.filter((row) => getCategoryLabel(row) === confirmationCategoryFilter)
      : rows;

    return [...filteredRows].sort((a, b) => {
      const categoryCompare = getCategoryLabel(a).localeCompare(getCategoryLabel(b));
      if (categoryCompare !== 0) return categoryCompare;

      return String(a.itemName || a.itemCode || "").localeCompare(String(b.itemName || b.itemCode || ""));
    });
  }, [confirmationRows, confirmationCategoryFilter]);

  const groupedConfirmationRows = useMemo(() => {
    const groups = new Map();

    filteredConfirmationRows.forEach((row, index) => {
      const category = getCategoryLabel(row);

      if (!groups.has(category)) {
        groups.set(category, []);
      }

      groups.get(category).push({ ...row, __displayIndex: index });
    });

    return Array.from(groups, ([category, rows]) => ({ category, rows }));
  }, [filteredConfirmationRows]);

  const collapsedConfirmationCategorySet = useMemo(
    () => new Set(collapsedConfirmationCategories),
    [collapsedConfirmationCategories],
  );

  const isConfirmationCategoryCollapsed = useCallback(
    (category) => collapsedConfirmationCategorySet.has(category),
    [collapsedConfirmationCategorySet],
  );

  const toggleConfirmationCategoryCollapse = useCallback((category) => {
    setCollapsedConfirmationCategories((prev) =>
      prev.includes(category) ? prev.filter((value) => value !== category) : [...prev, category],
    );
  }, []);

  const visibleCollapsedConfirmationCategoryCount = useMemo(
    () => groupedConfirmationRows.filter((group) => collapsedConfirmationCategorySet.has(group.category)).length,
    [groupedConfirmationRows, collapsedConfirmationCategorySet],
  );

  const handleToggleAllConfirmationCategories = useCallback(() => {
    if (groupedConfirmationRows.length === 0) return;

    setCollapsedConfirmationCategories((prev) => {
      const visibleCategories = groupedConfirmationRows.map((group) => group.category);
      const allVisibleCollapsed = visibleCategories.every((category) => prev.includes(category));

      if (allVisibleCollapsed) {
        return prev.filter((category) => !visibleCategories.includes(category));
      }

      return Array.from(new Set([...prev, ...visibleCategories]));
    });
  }, [groupedConfirmationRows]);

  const historyCategoryOptions = useMemo(() => {
    const categories = new Set();

    historyRows.forEach((row) => {
      categories.add(getCategoryLabel(row));
    });

    return Array.from(categories).sort((a, b) => a.localeCompare(b));
  }, [historyRows]);

  const filteredHistoryRows = useMemo(() => {
    const rows = historyRows.map((row, index) => ({ ...row, __originalIndex: index }));
    const filteredRows = historyCategoryFilter
      ? rows.filter((row) => getCategoryLabel(row) === historyCategoryFilter)
      : rows;

    return [...filteredRows].sort((a, b) => {
      const categoryCompare = getCategoryLabel(a).localeCompare(getCategoryLabel(b));
      if (categoryCompare !== 0) return categoryCompare;

      const dateCompare = String(a.deliveryDate || "").localeCompare(String(b.deliveryDate || ""));
      if (dateCompare !== 0) return dateCompare;

      return String(a.itemName || a.itemCode || "").localeCompare(String(b.itemName || b.itemCode || ""));
    });
  }, [historyRows, historyCategoryFilter]);

  const groupedHistoryRows = useMemo(() => {
    const groups = new Map();

    filteredHistoryRows.forEach((row, index) => {
      const category = getCategoryLabel(row);

      if (!groups.has(category)) {
        groups.set(category, []);
      }

      groups.get(category).push({ ...row, __displayIndex: index });
    });

    return Array.from(groups, ([category, rows]) => ({ category, rows }));
  }, [filteredHistoryRows]);

  const collapsedHistoryCategorySet = useMemo(
    () => new Set(collapsedHistoryCategories),
    [collapsedHistoryCategories],
  );

  const isHistoryCategoryCollapsed = useCallback(
    (category) => collapsedHistoryCategorySet.has(category),
    [collapsedHistoryCategorySet],
  );

  const toggleHistoryCategoryCollapse = useCallback((category) => {
    setCollapsedHistoryCategories((prev) =>
      prev.includes(category) ? prev.filter((value) => value !== category) : [...prev, category],
    );
  }, []);

  const visibleCollapsedHistoryCategoryCount = useMemo(
    () => groupedHistoryRows.filter((group) => collapsedHistoryCategorySet.has(group.category)).length,
    [groupedHistoryRows, collapsedHistoryCategorySet],
  );

  const handleToggleAllHistoryCategories = useCallback(() => {
    if (groupedHistoryRows.length === 0) return;

    setCollapsedHistoryCategories((prev) => {
      const visibleCategories = groupedHistoryRows.map((group) => group.category);
      const allVisibleCollapsed = visibleCategories.every((category) => prev.includes(category));

      if (allVisibleCollapsed) {
        return prev.filter((category) => !visibleCategories.includes(category));
      }

      return Array.from(new Set([...prev, ...visibleCategories]));
    });
  }, [groupedHistoryRows]);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3500);
  }, []);


  const loadStoreContext = useCallback(
    async ({ silent = false } = {}) => {
      if (!hasTaggedBranch) {
        setStoreType("");
        return;
      }

      try {
        const res = await fetchData("store-portal/store-context", {
          userCode,
          storeCode,
        });

        const contextRow = unwrapDataArray(res).map(normalizeStoreContextRow)[0];
        setStoreType(contextRow?.storeType || "");
      } catch (error) {
        console.error("Failed to load branch store type:", error);
        setStoreType("");
        if (!silent) showToast("Unable to load branch store type setup.", "error");
      }
    },
    [hasTaggedBranch, showToast, storeCode, userCode],
  );

  useEffect(() => {
    loadStoreContext({ silent: true });
  }, [loadStoreContext]);

  useEffect(() => {
    if (categoryFilter && !categoryOptions.includes(categoryFilter)) {
      setCategoryFilter("");
    }
  }, [categoryFilter, categoryOptions]);

  useEffect(() => {
    setCollapsedCategories((prev) => prev.filter((category) => categoryOptions.includes(category)));
  }, [categoryOptions]);

  useEffect(() => {
    if (confirmationCategoryFilter && !confirmationCategoryOptions.includes(confirmationCategoryFilter)) {
      setConfirmationCategoryFilter("");
    }
  }, [confirmationCategoryFilter, confirmationCategoryOptions]);

  useEffect(() => {
    setCollapsedConfirmationCategories((prev) =>
      prev.filter((category) => confirmationCategoryOptions.includes(category)),
    );
  }, [confirmationCategoryOptions]);

  useEffect(() => {
    if (historyCategoryFilter && !historyCategoryOptions.includes(historyCategoryFilter)) {
      setHistoryCategoryFilter("");
    }
  }, [historyCategoryFilter, historyCategoryOptions]);

  useEffect(() => {
    setCollapsedHistoryCategories((prev) =>
      prev.filter((category) => historyCategoryOptions.includes(category)),
    );
  }, [historyCategoryOptions]);

  const loadItems = useCallback(
    async ({ silent = false } = {}) => {
      if (!hasTaggedBranch) {
        setItems([]);
        setOrderMatrix({});
        setLoadedOrderMatrix({});
        setConfirmedMatrix({});
        if (!silent) showToast("No branch is tagged to the logged-in user account.", "error");
        return;
      }

      if (dates.length === 0) {
        setItems([]);
        setOrderMatrix({});
        setLoadedOrderMatrix({});
        setConfirmedMatrix({});
        if (!silent) showToast("Please select a valid forecast date range.", "error");
        return;
      }


      setForecastLoading(true);
      try {
        const itemResponse = await fetchData("store-portal/items", {
          userCode,
          storeCode,
        });

        const loadedItems = mergeUniqueItems(unwrapDataArray(itemResponse));
        const itemStoreType = loadedItems.find((item) => item.storeType)?.storeType;
        if (itemStoreType) setStoreType(itemStoreType);

        let savedForecastRows = [];

        try {
          const forecastResponse = await fetchData("store-portal/weekly-forecast", {
            userCode,
            storeCode,
            startDate,
            endDate,
            orderType: "WeeklyForecast",
          });

          savedForecastRows = unwrapDataArray(forecastResponse).map(normalizeForecastRow);
        } catch (forecastError) {
          console.warn("Items loaded, but existing Order Forecast quantities were not retrieved:", forecastError);
        }

        const nextOrderMatrix = buildOrderMatrix(loadedItems, savedForecastRows, dates);
        const nextConfirmedMatrix = buildConfirmedMatrix(loadedItems, savedForecastRows, dates);

        setItems(loadedItems);
        setOrderMatrix(nextOrderMatrix);
        setLoadedOrderMatrix(cloneMatrix(nextOrderMatrix));
        setConfirmedMatrix(nextConfirmedMatrix);

        if (!silent) {
          showToast(
            savedForecastRows.length > 0
              ? "Items loaded with existing Order Forecast quantities."
              : "Items loaded successfully.",
          );
        }
      } catch (error) {
        console.error("Failed to load store portal items:", error);
        setItems([]);
        setOrderMatrix({});
        setLoadedOrderMatrix({});
        setConfirmedMatrix({});
        if (!silent) showToast("Unable to load store items.", "error");
      } finally {
        setForecastLoading(false);
      }
    },
    [dates, endDate, hasTaggedBranch, showToast, startDate, storeCode, userCode],
  );

  const loadHistory = useCallback(
    async ({ silent = false } = {}) => {
      if (!hasTaggedBranch) {
        setHistoryRows([]);
        if (!silent) showToast("No branch is tagged to the logged-in user account.", "error");
        return;
      }

      if (!startDate || !endDate || new Date(`${startDate}T00:00:00`) > new Date(`${endDate}T00:00:00`)) {
        setHistoryRows([]);
        if (!silent) showToast("Please select a valid history date range.", "error");
        return;
      }

      setHistoryLoading(true);
      try {
        const historyResponse = await fetchData("store-portal/weekly-forecast-history", {
          userCode,
          storeCode,
          startDate,
          endDate,
        });

        const rows = unwrapDataArray(historyResponse)
          .map(normalizeHistoryRow)
          .filter(
            (row) =>
              row.itemCode &&
              (toNumber(row.originalWeeklyQty) > 0 || toNumber(row.confirmedOrderQty) > 0 || toBoolean(row.confirmed)),
          );

        setHistoryRows(rows);
        if (!silent) {
          showToast(rows.length > 0 ? "Order Forecast history loaded successfully." : "No Order Forecast history found.");
        }
      } catch (error) {
        console.error("Failed to load Order Forecast history:", error);
        setHistoryRows([]);
        if (!silent) showToast("Unable to load Order Forecast history.", "error");
      } finally {
        setHistoryLoading(false);
      }
    },
    [endDate, hasTaggedBranch, showToast, startDate, storeCode, userCode],
  );

  useEffect(() => {
    if (forecastView === "entry") {
      loadItems({ silent: true });
    }
  }, [forecastView, loadItems]);

  useEffect(() => {
    if (forecastView === "history") {
      loadHistory({ silent: true });
    }
  }, [forecastView, loadHistory]);

  useEffect(() => {
    setConfirmationRows([]);
    setLoadedConfirmationRows([]);
  }, [storeCode, deliveryDate]);

  const isForecastCellConfirmed = useCallback(
    (itemCode, date) => Boolean(confirmedMatrix[itemCode]?.[date]),
    [confirmedMatrix],
  );

  const resetWeeklyForecast = () => {
    setOrderMatrix(cloneMatrix(loadedOrderMatrix));
    showToast("Order Forecast reset to the last loaded values.");
  };

  const handleQtyChange = (itemCode, date, value) => {
    if (isForecastCellConfirmed(itemCode, date)) return;

    setOrderMatrix((prev) => ({
      ...prev,
      [itemCode]: {
        ...prev[itemCode],
        // Keep the raw decimal text while editing so values like "1.5" can be entered correctly.
        [date]: value,
      },
    }));
  };

  const submitWeeklyForecast = async () => {
    if (!hasTaggedBranch) {
      showToast("No branch is tagged to the logged-in user account.", "error");
      return;
    }

    if (!startDate || !endDate || dates.length === 0) {
      showToast("Please select a valid forecast date range.", "error");
      return;
    }

    if (items.length === 0) {
      showToast("Load items before submitting the forecast.", "error");
      return;
    }

    const safeUserCode = userCode || userName || "SYSTEM";
    const details = [];

    items.forEach((item) => {
      if (!item.itemCode) return;

      dates.forEach((date) => {
        const rawQty = orderMatrix[item.itemCode]?.[date];
        const orderQty = toNumber(rawQty);

        details.push({
          itemCode: item.itemCode,
          itemName: item.itemName || "",
          categCode: item.categCode || "",
          uomCode: item.uomCode || "",
          deliveryDate: date,
          orderQty,
        });
      });
    });

    if (details.length === 0) {
      showToast("No valid forecast details to submit.", "error");
      return;
    }

    const payload = {
      userCode: safeUserCode,
      storeCode,
      startDate,
      endDate,
      orderType: "WeeklyForecast",
      details,
    };

    setForecastSubmitting(true);
    try {
      const res = await postRequest("store-portal/weekly-forecast", payload);
      showToast(res?.message || "Order Forecast submitted successfully.");
      await loadItems({ silent: true });
    } catch (error) {
      console.error("Failed to submit Order Forecast:", error?.response?.data || error);
      showToast(getApiErrorMessage(error, "Unable to submit Order Forecast."), "error");
    } finally {
      setForecastSubmitting(false);
    }
  };

  const loadConfirmation = async () => {
    if (!hasTaggedBranch) {
      showToast("No branch is tagged to the logged-in user account.", "error");
      return;
    }

    setConfirmLoading(true);
    try {
      const res = await fetchData("store-portal/confirmation", {
        storeCode,
        deliveryDate,
      });

      const rows = unwrapDataArray(res)
        .map((row) => normalizeConfirmationRow(row, deliveryDate))
        // Keep confirmed rows even if the weekly qty returned as 0.
        // The saved/confirmed qty must still be retrievable for old forecast dates.
        .filter(
          (row) =>
            row.itemCode &&
            (toNumber(row.orderQty) > 0 || toNumber(row.forecastQty) > 0 || toBoolean(row.confirmed)),
        );

      setConfirmationRows(rows);
      setLoadedConfirmationRows(rows.map((row) => ({ ...row })));
    } catch (error) {
      console.error("Failed to load store portal confirmation:", error);
      setConfirmationRows([]);
      setLoadedConfirmationRows([]);
      showToast("Unable to load forecast confirmation.", "error");
    } finally {
      setConfirmLoading(false);
    }
  };

  const resetConfirmationRows = () => {
    setConfirmationRows(loadedConfirmationRows.map((row) => ({ ...row })));
    showToast("Daily order confirmation reset to the last loaded values.");
  };

  const handleConfirmQtyChange = (index, value) => {
    setConfirmationRows((prev) =>
      prev.map((row, i) => {
        if (i !== index || toBoolean(row.confirmed)) return row;

        // Confirm Qty may still be greater than the requested / Order Forecast
        // quantity, but it must be locked once the row is already confirmed.
        return { ...row, orderQty: value };
      }),
    );
  };

  const handleConfirmDateChange = (index, value) => {
    setConfirmationRows((prev) =>
      prev.map((row, i) => (i === index && !toBoolean(row.confirmed) ? { ...row, deliveryDate: value } : row)),
    );
  };

  const confirmOrder = async () => {
    if (!hasTaggedBranch) {
      showToast("No branch is tagged to the logged-in user account.", "error");
      return;
    }

    const details = filteredConfirmationRows
      .filter((row) => !toBoolean(row.confirmed) && toNumber(row.orderQty) > 0)
      .map((row) => ({
        forecastId: row.forecastId,
        itemCode: row.itemCode,
        itemName: row.itemName,
        categCode: row.categCode || "",
        uomCode: row.uomCode,
        deliveryDate: row.deliveryDate || deliveryDate,
        orderQty: Number(row.orderQty || 0),
      }));

    if (details.length === 0) {
      showToast("No unconfirmed quantity to submit.", "error");
      return;
    }

    const payloadDeliveryDate = details[0]?.deliveryDate || deliveryDate;

    const payload = {
      userCode,
      storeCode,
      deliveryDate: payloadDeliveryDate,
      orderType: "ConfirmedOrder",
      details,
    };

    setConfirmSubmitting(true);
    try {
      const res = await postRequest("store-portal/confirm-order", payload);
      showToast(res?.message || "Order confirmed successfully.");
      await loadItems({ silent: true });
      await loadConfirmation();
    } catch (error) {
      console.error("Failed to confirm store portal order:", error);
      showToast(getApiErrorMessage(error, "Unable to confirm order."), "error");
    } finally {
      setConfirmSubmitting(false);
    }
  };

  const totalForecastQty = useMemo(
    () =>
      filteredItems.reduce(
        (sum, item) =>
          sum + dates.reduce((dateSum, date) => dateSum + Number(orderMatrix[item.itemCode]?.[date] || 0), 0),
        0,
      ),
    [filteredItems, dates, orderMatrix],
  );

  const totalForecastPerDay = useMemo(
    () =>
      dates.reduce((totals, date) => {
        totals[date] = filteredItems.reduce((sum, item) => sum + Number(orderMatrix[item.itemCode]?.[date] || 0), 0);
        return totals;
      }, {}),
    [filteredItems, dates, orderMatrix],
  );

  const getItemForecastTotal = useCallback(
    (itemCode) => dates.reduce((sum, date) => sum + Number(orderMatrix[itemCode]?.[date] || 0), 0),
    [dates, orderMatrix],
  );

  const getCategoryForecastTotal = useCallback(
    (categoryItems = []) =>
      categoryItems.reduce((sum, item) => sum + getItemForecastTotal(item.itemCode), 0),
    [getItemForecastTotal],
  );

  const totalConfirmationOrderQty = useMemo(
    () => filteredConfirmationRows.reduce((sum, row) => sum + Number(row.forecastQty || 0), 0),
    [filteredConfirmationRows],
  );

  const totalConfirmedQty = useMemo(
    () => filteredConfirmationRows.reduce((sum, row) => sum + Number(row.orderQty || 0), 0),
    [filteredConfirmationRows],
  );

  const getConfirmationCategoryTotals = useCallback((rows = []) => {
    return rows.reduce(
      (totals, row) => ({
        orderQty: totals.orderQty + toNumber(row.forecastQty),
        confirmedQty: totals.confirmedQty + toNumber(row.orderQty),
      }),
      { orderQty: 0, confirmedQty: 0 },
    );
  }, []);

  const getHistoryCategoryTotals = useCallback((rows = []) => {
    return rows.reduce(
      (totals, row) => ({
        originalQty: totals.originalQty + toNumber(row.originalWeeklyQty),
        confirmedQty: totals.confirmedQty + toNumber(row.confirmedOrderQty),
        varianceQty: totals.varianceQty + toNumber(row.balanceQty),
      }),
      { originalQty: 0, confirmedQty: 0, varianceQty: 0 },
    );
  }, []);

  const totalHistoryOriginalQty = useMemo(
    () => filteredHistoryRows.reduce((sum, row) => sum + Number(row.originalWeeklyQty || 0), 0),
    [filteredHistoryRows],
  );

  const totalHistoryConfirmedQty = useMemo(
    () => filteredHistoryRows.reduce((sum, row) => sum + Number(row.confirmedOrderQty || 0), 0),
    [filteredHistoryRows],
  );

  return (
    <div className="global-tran-main-div-ui !mt-0 min-w-0 overflow-x-hidden px-2 pb-20 pt-[136px] sm:pt-[112px] md:pt-[116px] lg:pt-[120px]">
      {isBusy && <LoadingSpinner />}
      <Toast toast={toast} />

      <div className="fixed left-2 right-2 top-[54px] z-[20] flex max-w-[calc(100vw-1rem)] flex-col gap-2 rounded-lg bg-gradient-to-r from-blue-200 to-blue-100 p-2 text-blue-900 shadow-xl dark:bg-blue-900 dark:text-white sm:left-4 sm:right-4 sm:top-[62px] sm:max-w-none sm:flex-row sm:items-center sm:justify-between md:left-6 md:right-6">
        <div className="min-w-0 text-center sm:text-left">
          <h1 className="break-words px-1 text-base font-semibold leading-tight sm:px-3 sm:text-xl lg:text-2xl">
            Store Portal Ordering
          </h1>
        </div>

        <div className="grid w-full grid-cols-2 gap-2 text-center sm:w-auto sm:min-w-[260px] sm:gap-4">
          <div className="min-w-0">
            <p className="truncate text-[10px] font-semibold text-gray-600 dark:text-white sm:text-xs">
              User Account
            </p>
            <h1 className="truncate text-xs font-extrabold text-gray-800 dark:text-gray-200 sm:text-sm lg:text-base">
              {userCode || "Loading"}
            </h1>
          </div>
          <div className="min-w-0">
            <p className="truncate text-[10px] font-semibold text-gray-600 dark:text-white sm:text-xs">
              Tagged Branch
            </p>
            <h1 className={`truncate text-xs font-extrabold sm:text-sm lg:text-base ${hasTaggedBranch ? "global-tran-stat-text-finalized-ui" : "global-tran-stat-text-closed-ui"}`}>
              {branchCode || "Not Tagged"}
            </h1>
          </div>
        </div>
      </div>

      <div className="global-tran-header-div-ui !mt-0 !p-3 sm:!p-4">
        <div className="global-tran-header-tab-div-ui">
          <button className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">
            Basic Information
          </button>
        </div>

        <div className="grid grid-cols-1 gap-1 sm:gap-2 md:grid-cols-2 xl:grid-cols-4">
          <FloatingField id="userAccount" label="User Account" value={userDisplay || "Loading user..."} readOnly />
          <FloatingField id="branchTagged" label="Tagged Branch" value={branchDisplay || "No branch tagged"} readOnly />
          <FloatingField id="storeCode" label="Store Code" value={storeCode || ""} readOnly />
          <FloatingField id="storeType" label="Store Type" value={storeType || "Auto from Branch_ref"} readOnly />
        </div>

        {!hasTaggedBranch && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-100">
            This account has no branch tagged in the Users table. Store Portal ordering is disabled until a branch is assigned.
          </div>
        )}
      </div>

      <div className="global-tran-tab-div-ui !p-3 sm:!p-4 lg:!p-6">
        <div className="global-tran-tab-nav-ui !items-stretch !gap-3 sm:!items-center">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <button
              type="button"
              onClick={() => setForecastView("entry")}
              className={`global-tran-tab-padding-ui ${forecastView === "entry" ? "global-tran-tab-text_active-ui" : "rounded-lg bg-slate-100 text-slate-600 dark:bg-gray-800 dark:text-slate-300"}`}
            >
              Order Forecast
            </button>
            <button
              type="button"
              onClick={() => setForecastView("history")}
              className={`global-tran-tab-padding-ui ${forecastView === "history" ? "global-tran-tab-text_active-ui" : "rounded-lg bg-slate-100 text-slate-600 dark:bg-gray-800 dark:text-slate-300"}`}
            >
              History
            </button>
            {forecastView === "entry" && items.length > 0 && <StatusPill>{filteredItems.length} of {items.length} items</StatusPill>}
            {forecastView === "history" && historyRows.length > 0 && <StatusPill>{filteredHistoryRows.length} of {historyRows.length} history lines</StatusPill>}
          </div>

          <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center">
            {forecastView === "entry" ? (
              <>
                <StatusPill variant="warning" className="min-h-[34px]">
                  <Clock3 className="mr-1 h-3 w-3 shrink-0" />
                  <span className="sm:hidden">Cutoff 1:00 PM</span>
                  <span className="hidden sm:inline">All order confirmations must be completed on or before 1:00 PM.</span>
                </StatusPill>
                <ActionButton icon={RefreshCw} onClick={() => loadItems()} disabled={forecastLoading || !hasTaggedBranch}>
                  {forecastLoading ? "Loading..." : "Load Items"}
                </ActionButton>
                <ActionButton icon={RotateCcw} onClick={resetWeeklyForecast} disabled={forecastLoading || items.length === 0}>
                  Reset
                </ActionButton>
                <ActionButton
                  icon={ChevronDown}
                  onClick={handleToggleAllCategories}
                  disabled={forecastLoading || groupedForecastItems.length === 0}
                >
                  {visibleCollapsedCategoryCount === groupedForecastItems.length && groupedForecastItems.length > 0
                    ? "Show Categories"
                    : "Collapse Categories"}
                </ActionButton>
              </>
            ) : (
              <>
                <ActionButton icon={RefreshCw} onClick={() => loadHistory()} disabled={historyLoading || !hasTaggedBranch}>
                  {historyLoading ? "Loading..." : "Load History"}
                </ActionButton>
                <ActionButton
                  icon={ChevronDown}
                  onClick={handleToggleAllHistoryCategories}
                  disabled={historyLoading || groupedHistoryRows.length === 0}
                >
                  {visibleCollapsedHistoryCategoryCount === groupedHistoryRows.length && groupedHistoryRows.length > 0
                    ? "Show Categories"
                    : "Collapse Categories"}
                </ActionButton>
              </>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FloatingField id="forecastStartDate" label="Start Date" type="date" value={startDate} onChange={setStartDate} />
          <FloatingField id="forecastEndDate" label="End Date" type="date" value={endDate} onChange={setEndDate} />
          <FloatingField id="forecastDayCount" label={forecastView === "history" ? "History Days" : "Forecast Days"} value={dates.length ? String(dates.length) : "0"} readOnly />
          {forecastView === "entry" ? (
            <FloatingField
              id="categoryFilter"
              label="Category Filter"
              type="select"
              value={categoryFilter}
              onChange={setCategoryFilter}
              disabled={items.length === 0}
            >
              <option value="">All Categories</option>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </FloatingField>
          ) : (
            <FloatingField
              id="historyCategoryFilter"
              label="Category Filter"
              type="select"
              value={historyCategoryFilter}
              onChange={setHistoryCategoryFilter}
              disabled={historyRows.length === 0}
            >
              <option value="">All Categories</option>
              {historyCategoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </FloatingField>
          )}
        </div>

        {forecastView === "entry" ? (
          <>
        <div className="mt-3 space-y-3 md:hidden">
          {groupedForecastItems.map((group) => {
            const isCollapsed = isCategoryCollapsed(group.category);
            const categoryTotal = getCategoryForecastTotal(group.items);

            return (
              <div key={`${group.category}-weekly-group`} className="space-y-3">
                <button
                  type="button"
                  onClick={() => toggleCategoryCollapse(group.category)}
                  aria-expanded={!isCollapsed}
                  className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-xs font-bold uppercase shadow-sm transition-colors ${
                    isCollapsed
                      ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-gray-800 dark:text-slate-200"
                      : "border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-100"
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
                        isCollapsed ? "-rotate-90" : "rotate-0"
                      }`}
                    />
                    <span className="truncate">Category: {group.category}</span>
                  </span>
                  <span className="shrink-0 text-right font-semibold normal-case">
                    {group.items.length} item{group.items.length === 1 ? "" : "s"} • Total {categoryTotal.toLocaleString()}
                  </span>
                </button>

                {!isCollapsed &&
                  group.items.map((item) => (
                    <div
                      key={`${item.itemCode || item.__displayIndex}-weekly-card`}
                      className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-gray-800"
                    >
                      <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-blue-50 px-3 py-2 dark:border-slate-700 dark:bg-blue-900/30">
                        <div className="min-w-0">
                          <div className="font-mono text-[11px] font-bold text-slate-600 dark:text-slate-300">
                            {item.itemCode}
                          </div>
                          <div className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                            {item.itemName}
                          </div>
                          <div className="mt-1 truncate text-[10px] font-bold uppercase text-slate-500 dark:text-slate-300">
                            Category: {item.categCode || "-"}
                          </div>
                        </div>
                        <span className="shrink-0 rounded-md bg-white px-2 py-1 text-[10px] font-bold text-slate-700 shadow-sm dark:bg-gray-900 dark:text-slate-200">
                          {item.uomCode || "-"}
                        </span>
                      </div>

                      <div className="divide-y divide-slate-100 dark:divide-slate-700">
                        {dates.map((date, dateIndex) => {
                          const isConfirmed = isForecastCellConfirmed(item.itemCode, date);

                          return (
                            <div
                              key={`${item.itemCode}-${date}-weekly-card-row`}
                              className="flex items-center justify-between gap-3 px-3 py-2"
                            >
                              <div className="min-w-0">
                                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-300">
                                  {dayLabel(date)}
                                </div>
                                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                                  {shortDate(date)}
                                </div>
                                {isConfirmed && (
                                  <div className="text-[10px] font-bold uppercase text-green-600 dark:text-green-300">
                                    Confirmed
                                  </div>
                                )}
                              </div>

                              <div className="w-28 shrink-0 rounded-md border border-slate-200 bg-white dark:border-slate-700 dark:bg-gray-900">
                                <QuantityInput
                                  value={orderMatrix[item.itemCode]?.[date] ?? 0}
                                  onChange={(value) => handleQtyChange(item.itemCode, date, value)}
                                  disabled={isConfirmed}
                                  navGroup="weekly-mobile"
                                  navRow={(item.__displayIndex || 0) * dates.length + dateIndex}
                                  navCol={0}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex items-center justify-between bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 dark:bg-gray-900 dark:text-white">
                        <span>Total</span>
                        <span>{getItemForecastTotal(item.itemCode).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
              </div>
            );
          })}

          {filteredItems.length === 0 && (
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500 shadow-sm dark:border-slate-700 dark:bg-gray-800 dark:text-slate-300">
              <div className="flex flex-col items-center justify-center gap-2">
                <PackageOpen className="h-8 w-8 text-slate-400" />
                <span>{hasTaggedBranch ? (items.length > 0 ? "No items found for the selected category." : "No forecast items loaded.") : "Assign a branch to this user before ordering."}</span>
              </div>
            </div>
          )}
        </div>

        <div className="global-tran-table-main-div-ui mt-3 hidden max-w-full overflow-x-auto sm:mt-4 md:block">
          <div className="global-tran-table-main-sub-div-ui relative isolate !max-h-[56vh] sm:!max-h-[360px]">
            <table className="w-max min-w-full table-fixed border-separate border-spacing-0 [&_td]:border-b [&_td]:border-r [&_td]:border-slate-200 [&_th]:border-b [&_th]:border-r [&_th]:border-slate-200 [&_tr>td:first-child]:border-l">
              <thead className="global-tran-thead-div-ui sticky top-0 z-[220]">
                <tr>
                  <th className="global-tran-th-ui sticky left-0 top-0 z-[240] w-[96px] min-w-[96px] max-w-[96px] bg-blue-100 text-left dark:bg-blue-900">Code</th>
                  <th className="global-tran-th-ui sticky left-[96px] top-0 z-[240] w-[240px] min-w-[240px] max-w-[240px] bg-blue-100 text-left dark:bg-blue-900">Item Name</th>
                  <th className="global-tran-th-ui sticky left-[336px] top-0 z-[240] w-[100px] min-w-[100px] max-w-[100px] bg-blue-100 text-left dark:bg-blue-900">Category</th>
                  <th className="global-tran-th-ui sticky left-[436px] top-0 z-[240] w-[72px] min-w-[72px] max-w-[72px] bg-blue-100 text-center shadow-[2px_0_0_0_rgba(226,232,240,1)] dark:bg-blue-900">UOM</th>
                  {dates.map((date) => (
                    <th key={date} className="global-tran-th-ui sticky top-0 z-[210] w-[96px] min-w-[96px] max-w-[96px] bg-blue-100 dark:bg-blue-900">
                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-300">{dayLabel(date)}</div>
                      <div>{shortDate(date)}</div>
                    </th>
                  ))}
                  <th className="global-tran-th-ui sticky top-0 z-[210] w-[100px] min-w-[100px] max-w-[100px] bg-blue-100 text-right dark:bg-blue-900">Total</th>
                </tr>
              </thead>
              <tbody>
                {groupedForecastItems.map((group) => {
                  const isCollapsed = isCategoryCollapsed(group.category);
                  const categoryTotal = getCategoryForecastTotal(group.items);

                  return (
                    <Fragment key={`${group.category}-weekly-table-group`}>
                      <tr className={isCollapsed ? "bg-slate-50 dark:bg-slate-900/60" : "bg-blue-50/80 dark:bg-blue-900/30"}>
                        <td
                          className="global-tran-td-ui text-left text-xs font-bold uppercase tracking-wide text-blue-800 dark:text-blue-100"
                          colSpan={dates.length + 5 || 5}
                        >
                          <button
                            type="button"
                            onClick={() => toggleCategoryCollapse(group.category)}
                            aria-expanded={!isCollapsed}
                            className="flex w-full items-center justify-between gap-3 text-left"
                          >
                            <span className="flex min-w-0 items-center gap-2">
                              <span
                                className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded transition-colors ${
                                  isCollapsed
                                    ? "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                                    : "bg-blue-600 text-white shadow-inner"
                                }`}
                                title={isCollapsed ? "Show Category" : "Collapse Category"}
                              >
                                <ChevronDown
                                  className={`h-3.5 w-3.5 transition-transform duration-200 ${
                                    isCollapsed ? "-rotate-90" : "rotate-0"
                                  }`}
                                />
                              </span>
                              <span className="truncate">Category: {group.category}</span>
                              <span className="font-semibold normal-case text-slate-500 dark:text-slate-300">
                                ({group.items.length} item{group.items.length === 1 ? "" : "s"})
                              </span>
                            </span>
                            <span className="shrink-0 font-semibold normal-case text-slate-600 dark:text-slate-300">
                              Total: {categoryTotal.toLocaleString()}
                            </span>
                          </button>
                        </td>
                      </tr>

                      {!isCollapsed &&
                        group.items.map((item) => (
                          <tr key={item.itemCode || item.__displayIndex} className="global-tran-tr-ui">
                            <td className="global-tran-td-ui sticky left-0 z-[40] w-[96px] min-w-[96px] max-w-[96px] overflow-hidden text-ellipsis whitespace-nowrap bg-white font-mono font-semibold dark:bg-black">{item.itemCode}</td>
                            <td className="global-tran-td-ui sticky left-[96px] z-[40] w-[240px] min-w-[240px] max-w-[240px] bg-white font-medium dark:bg-black">
                              <span className="block truncate">{item.itemName}</span>
                            </td>
                            <td className="global-tran-td-ui sticky left-[336px] z-[40] w-[100px] min-w-[100px] max-w-[100px] overflow-hidden text-ellipsis whitespace-nowrap bg-white text-xs font-semibold text-slate-700 dark:bg-black dark:text-slate-200">{item.categCode || "-"}</td>
                            <td className="global-tran-td-ui sticky left-[436px] z-[40] w-[72px] min-w-[72px] max-w-[72px] bg-white text-center shadow-[2px_0_0_0_rgba(226,232,240,1)] dark:bg-black">
                              <span className="block w-full text-center text-xs font-medium text-slate-700 dark:text-slate-200">{item.uomCode || "-"}</span>
                            </td>
                            {dates.map((date, dateIndex) => (
                              <td key={`${item.itemCode}-${date}`} className="global-tran-td-ui w-[96px] min-w-[96px] max-w-[96px] text-center">
                                <QuantityInput
                                  value={orderMatrix[item.itemCode]?.[date] ?? 0}
                                  onChange={(value) => handleQtyChange(item.itemCode, date, value)}
                                  disabled={isForecastCellConfirmed(item.itemCode, date)}
                                  navGroup="weekly"
                                  navRow={item.__displayIndex || 0}
                                  navCol={dateIndex}
                                />
                              </td>
                            ))}
                            <td className="global-tran-td-ui w-[100px] min-w-[100px] max-w-[100px] bg-slate-50 text-right text-xs font-bold text-slate-800 dark:bg-gray-900 dark:text-white">
                              {getItemForecastTotal(item.itemCode).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                    </Fragment>
                  );
                })}

                {filteredItems.length > 0 && (
                  <tr className="bg-blue-50/80 font-bold dark:bg-blue-900/30">
                    <td className="global-tran-td-ui sticky left-0 z-[40] w-[508px] min-w-[508px] max-w-[508px] bg-blue-50 text-left text-xs font-bold text-slate-800 dark:bg-blue-900 dark:text-white" colSpan={4}>
                      Total Per Day
                    </td>
                    {dates.map((date) => (
                      <td key={`total-${date}`} className="global-tran-td-ui w-[96px] min-w-[96px] max-w-[96px] text-right text-xs font-bold text-slate-800 dark:text-white">
                        {(totalForecastPerDay[date] || 0).toLocaleString()}
                      </td>
                    ))}
                    <td className="global-tran-td-ui w-[100px] min-w-[100px] max-w-[100px] bg-blue-100 text-right text-xs font-bold text-slate-900 dark:bg-blue-900 dark:text-white">
                      {totalForecastQty.toLocaleString()}
                    </td>
                  </tr>
                )}

                {filteredItems.length === 0 && (
                  <tr>
                    <td colSpan={dates.length + 5 || 5} className="global-tran-td-ui py-10 text-center text-sm text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <PackageOpen className="h-8 w-8 text-slate-400" />
                        <span>{hasTaggedBranch ? (items.length > 0 ? "No items found for the selected category." : "No forecast items loaded.") : "Assign a branch to this user before ordering."}</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="global-tran-tab-footer-main-div-ui !mt-4 !gap-3">
          <div className="global-tran-tab-footer-button-div-ui w-full sm:w-auto">
            <ActionButton
              icon={Send}
              onClick={submitWeeklyForecast}
              disabled={!hasTaggedBranch || items.length === 0 || forecastSubmitting}
              variant="success"
            >
              {forecastSubmitting ? "Submitting..." : "Submit Order Forecast"}
            </ActionButton>
          </div>

          <div className="global-tran-tab-footer-total-main-div-ui w-full rounded-lg bg-blue-50/60 px-3 py-2 sm:w-auto dark:bg-gray-900/40">
            <div className="global-tran-tab-footer-total-div-ui">
              <label className="global-tran-tab-footer-total-label-ui">Total Forecast Qty:</label>
              <label className="global-tran-tab-footer-total-value-ui">{totalForecastQty.toLocaleString()}</label>
            </div>
          </div>
        </div>

          </>
        ) : (
          <>
            <div className="mt-3 space-y-3 md:hidden">
              {groupedHistoryRows.map((group) => {
                const isCollapsed = isHistoryCategoryCollapsed(group.category);
                const categoryTotals = getHistoryCategoryTotals(group.rows);

                return (
                  <div key={`${group.category}-history-group`} className="space-y-3">
                    <button
                      type="button"
                      onClick={() => toggleHistoryCategoryCollapse(group.category)}
                      aria-expanded={!isCollapsed}
                      className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-xs font-bold uppercase shadow-sm transition-colors ${
                        isCollapsed
                          ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-gray-800 dark:text-slate-200"
                          : "border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-100"
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <ChevronDown
                          className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
                            isCollapsed ? "-rotate-90" : "rotate-0"
                          }`}
                        />
                        <span className="truncate">Category: {group.category}</span>
                      </span>
                      <span className="shrink-0 text-right font-semibold normal-case">
                        {group.rows.length} line{group.rows.length === 1 ? "" : "s"} • Original {categoryTotals.originalQty.toLocaleString()} • Confirmed {categoryTotals.confirmedQty.toLocaleString()}
                      </span>
                    </button>

                    {!isCollapsed &&
                      group.rows.map((row) => (
                        <div
                          key={`${row.itemCode || "item"}-${row.deliveryDate || row.__displayIndex}-history-card`}
                          className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-gray-800"
                        >
                          <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-blue-50 px-3 py-2 dark:border-slate-700 dark:bg-blue-900/30">
                            <div className="min-w-0">
                              <div className="font-mono text-[11px] font-bold text-slate-600 dark:text-slate-300">
                                {row.itemCode}
                              </div>
                              <div className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                                {row.itemName}
                              </div>
                              <div className="mt-1 truncate text-[10px] font-bold uppercase text-slate-500 dark:text-slate-300">
                                Category: {row.categCode || "-"}
                              </div>
                            </div>
                            <span className="shrink-0 rounded-md bg-white px-2 py-1 text-[10px] font-bold text-slate-700 shadow-sm dark:bg-gray-900 dark:text-slate-200">
                              {row.uomCode || "-"}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-3 px-3 py-3 text-xs">
                            <div>
                              <div className="font-bold uppercase text-slate-500 dark:text-slate-300">Delivery Date</div>
                              <div className="font-semibold text-slate-900 dark:text-white">{row.deliveryDate}</div>
                            </div>
                            <div>
                              <div className="font-bold uppercase text-slate-500 dark:text-slate-300">Status</div>
                              <div className="font-semibold text-slate-900 dark:text-white">{row.status}</div>
                            </div>
                            <div>
                              <div className="font-bold uppercase text-slate-500 dark:text-slate-300">Original Qty</div>
                              <div className="font-semibold text-slate-900 dark:text-white">{toNumber(row.originalWeeklyQty).toLocaleString()}</div>
                            </div>
                            <div>
                              <div className="font-bold uppercase text-slate-500 dark:text-slate-300">Confirmed Order</div>
                              <div className="font-semibold text-green-700 dark:text-green-200">{toNumber(row.confirmedOrderQty).toLocaleString()}</div>
                            </div>
                            <div>
                              <div className="font-bold uppercase text-slate-500 dark:text-slate-300">Variance</div>
                              <div className="font-semibold text-slate-900 dark:text-white">{toNumber(row.balanceQty).toLocaleString()}</div>
                            </div>
                            <div>
                              <div className="font-bold uppercase text-slate-500 dark:text-slate-300">Confirmed By</div>
                              <div className="font-semibold text-slate-900 dark:text-white">{row.confirmedBy || "-"}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                );
              })}

              {filteredHistoryRows.length === 0 && (
                <div className="rounded-lg border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500 shadow-sm dark:border-slate-700 dark:bg-gray-800 dark:text-slate-300">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <PackageOpen className="h-8 w-8 text-slate-400" />
                    <span>{hasTaggedBranch ? (historyRows.length > 0 ? "No history lines found for the selected category." : "No Order Forecast history loaded.") : "Assign a branch to this user before ordering."}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="global-tran-table-main-div-ui mt-3 hidden max-w-full overflow-x-auto sm:mt-4 md:block">
              <div className="global-tran-table-main-sub-div-ui relative isolate !max-h-[56vh] sm:!max-h-[360px]">
                <table className="w-max min-w-full table-fixed border-separate border-spacing-0 [&_td]:border-b [&_td]:border-r [&_td]:border-slate-200 [&_th]:border-b [&_th]:border-r [&_th]:border-slate-200 [&_tr>td:first-child]:border-l">
                  <thead className="global-tran-thead-div-ui sticky top-0 z-[220]">
                    <tr>
                      <th className="global-tran-th-ui sticky left-0 top-0 z-[240] w-[96px] min-w-[96px] max-w-[96px] bg-blue-100 text-left dark:bg-blue-900">Code</th>
                      <th className="global-tran-th-ui sticky left-[96px] top-0 z-[240] w-[240px] min-w-[240px] max-w-[240px] bg-blue-100 text-left dark:bg-blue-900">Item Name</th>
                      <th className="global-tran-th-ui sticky left-[336px] top-0 z-[240] w-[100px] min-w-[100px] max-w-[100px] bg-blue-100 text-left dark:bg-blue-900">Category</th>
                      <th className="global-tran-th-ui sticky left-[436px] top-0 z-[240] w-[72px] min-w-[72px] max-w-[72px] bg-blue-100 text-center shadow-[2px_0_0_0_rgba(226,232,240,1)] dark:bg-blue-900">UOM</th>
                      <th className="global-tran-th-ui sticky top-0 z-[210] w-[120px] min-w-[120px] max-w-[120px] bg-blue-100 text-left dark:bg-blue-900">Delivery Date</th>
                      <th className="global-tran-th-ui sticky top-0 z-[210] w-[130px] min-w-[130px] max-w-[130px] bg-blue-100 text-right dark:bg-blue-900">Original Qty</th>
                      <th className="global-tran-th-ui sticky top-0 z-[210] w-[140px] min-w-[140px] max-w-[140px] bg-blue-100 text-right dark:bg-blue-900">Confirmed Order</th>
                      <th className="global-tran-th-ui sticky top-0 z-[210] w-[110px] min-w-[110px] max-w-[110px] bg-blue-100 text-right dark:bg-blue-900">Variance</th>
                      <th className="global-tran-th-ui sticky top-0 z-[210] w-[120px] min-w-[120px] max-w-[120px] bg-blue-100 text-left dark:bg-blue-900">Status</th>
                      <th className="global-tran-th-ui sticky top-0 z-[210] w-[130px] min-w-[130px] max-w-[130px] bg-blue-100 text-left dark:bg-blue-900">Confirmed By</th>
                      <th className="global-tran-th-ui sticky top-0 z-[210] w-[130px] min-w-[130px] max-w-[130px] bg-blue-100 text-left dark:bg-blue-900">Confirmed Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedHistoryRows.map((group) => {
                      const isCollapsed = isHistoryCategoryCollapsed(group.category);
                      const categoryTotals = getHistoryCategoryTotals(group.rows);

                      return (
                        <Fragment key={`${group.category}-history-table-group`}>
                          <tr className="bg-blue-50/80 dark:bg-blue-900/30">
                            <td colSpan={11} className="global-tran-td-ui !p-0">
                              <button
                                type="button"
                                onClick={() => toggleHistoryCategoryCollapse(group.category)}
                                aria-expanded={!isCollapsed}
                                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs font-bold uppercase text-blue-900 hover:bg-blue-100 dark:text-blue-100 dark:hover:bg-blue-800/40"
                              >
                                <span className="flex min-w-0 items-center gap-2">
                                  <ChevronDown
                                    className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
                                      isCollapsed ? "-rotate-90" : "rotate-0"
                                    }`}
                                  />
                                  <span className="truncate">Category: {group.category}</span>
                                </span>
                                <span className="shrink-0 text-right font-semibold normal-case">
                                  {group.rows.length} line{group.rows.length === 1 ? "" : "s"} • Original: {categoryTotals.originalQty.toLocaleString()} • Confirmed: {categoryTotals.confirmedQty.toLocaleString()} • Variance: {categoryTotals.varianceQty.toLocaleString()}
                                </span>
                              </button>
                            </td>
                          </tr>

                          {!isCollapsed &&
                            group.rows.map((row) => (
                              <tr key={`${row.itemCode || "item"}-${row.deliveryDate || row.__displayIndex}-history`} className="global-tran-tr-ui">
                                <td className="global-tran-td-ui sticky left-0 z-[40] w-[96px] min-w-[96px] max-w-[96px] overflow-hidden text-ellipsis whitespace-nowrap bg-white font-mono font-semibold dark:bg-black">{row.itemCode}</td>
                                <td className="global-tran-td-ui sticky left-[96px] z-[40] w-[240px] min-w-[240px] max-w-[240px] bg-white font-medium dark:bg-black">
                                  <span className="block truncate">{row.itemName}</span>
                                </td>
                                <td className="global-tran-td-ui sticky left-[336px] z-[40] w-[100px] min-w-[100px] max-w-[100px] overflow-hidden text-ellipsis whitespace-nowrap bg-white text-xs font-semibold text-slate-700 dark:bg-black dark:text-slate-200">{row.categCode || "-"}</td>
                                <td className="global-tran-td-ui sticky left-[436px] z-[40] w-[72px] min-w-[72px] max-w-[72px] bg-white text-center shadow-[2px_0_0_0_rgba(226,232,240,1)] dark:bg-black">{row.uomCode || "-"}</td>
                                <td className="global-tran-td-ui w-[120px] min-w-[120px] max-w-[120px] text-left">{row.deliveryDate}</td>
                                <td className="global-tran-td-ui w-[130px] min-w-[130px] max-w-[130px] text-right font-semibold">{toNumber(row.originalWeeklyQty).toLocaleString()}</td>
                                <td className="global-tran-td-ui w-[140px] min-w-[140px] max-w-[140px] text-right font-semibold text-green-700 dark:text-green-200">{toNumber(row.confirmedOrderQty).toLocaleString()}</td>
                                <td className="global-tran-td-ui w-[110px] min-w-[110px] max-w-[110px] text-right font-semibold">{toNumber(row.balanceQty).toLocaleString()}</td>
                                <td className="global-tran-td-ui w-[120px] min-w-[120px] max-w-[120px] text-left">{row.status}</td>
                                <td className="global-tran-td-ui w-[130px] min-w-[130px] max-w-[130px] text-left">{row.confirmedBy || "-"}</td>
                                <td className="global-tran-td-ui w-[130px] min-w-[130px] max-w-[130px] text-left">{row.confirmedDate || "-"}</td>
                              </tr>
                            ))}
                        </Fragment>
                      );
                    })}

                    {filteredHistoryRows.length === 0 && (
                      <tr>
                        <td colSpan={11} className="global-tran-td-ui py-10 text-center text-sm text-slate-500">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <PackageOpen className="h-8 w-8 text-slate-400" />
                            <span>{hasTaggedBranch ? (historyRows.length > 0 ? "No history lines found for the selected category." : "No Order Forecast history loaded.") : "Assign a branch to this user before ordering."}</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="global-tran-tab-footer-main-div-ui !mt-4 !justify-end !gap-3">
              <div className="global-tran-tab-footer-total-main-div-ui w-full rounded-lg bg-blue-50/60 px-3 py-2 sm:ml-auto sm:w-auto dark:bg-gray-900/40">
                <div className="global-tran-tab-footer-total-div-ui">
                  <label className="global-tran-tab-footer-total-label-ui">Total Original Qty:</label>
                  <label className="global-tran-tab-footer-total-value-ui">{totalHistoryOriginalQty.toLocaleString()}</label>
                </div>
              </div>
              <div className="global-tran-tab-footer-total-main-div-ui w-full rounded-lg bg-green-50/60 px-3 py-2 sm:w-auto dark:bg-gray-900/40">
                <div className="global-tran-tab-footer-total-div-ui">
                  <label className="global-tran-tab-footer-total-label-ui">Total Confirmed Order:</label>
                  <label className="global-tran-tab-footer-total-value-ui">{totalHistoryConfirmedQty.toLocaleString()}</label>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="global-tran-tab-div-ui !p-3 sm:!p-4 lg:!p-6">
        <div className="global-tran-tab-nav-ui !items-stretch !gap-3 sm:!items-center">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <button className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">
              Daily Order Confirmation
            </button>
            {confirmationRows.length > 0 && <StatusPill variant="success">{confirmationRows.length} lines</StatusPill>}
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <ActionButton icon={RefreshCw} onClick={loadConfirmation} disabled={confirmLoading || !hasTaggedBranch}>
              {confirmLoading ? "Loading..." : "Load Forecast"}
            </ActionButton>
            <ActionButton
              icon={RotateCcw}
              onClick={resetConfirmationRows}
              disabled={confirmLoading || loadedConfirmationRows.length === 0}
            >
              Reset
            </ActionButton>
            <ActionButton
              icon={ChevronDown}
              onClick={handleToggleAllConfirmationCategories}
              disabled={confirmLoading || groupedConfirmationRows.length === 0}
            >
              {visibleCollapsedConfirmationCategoryCount === groupedConfirmationRows.length && groupedConfirmationRows.length > 0
                ? "Show Categories"
                : "Collapse Categories"}
            </ActionButton>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
          <FloatingField id="deliveryDate" label="Forecast Date Order" type="date" value={deliveryDate} onChange={setDeliveryDate} />
          <FloatingField
            id="confirmationCategoryFilter"
            label="Category Filter"
            type="select"
            value={confirmationCategoryFilter}
            onChange={setConfirmationCategoryFilter}
            disabled={confirmationRows.length === 0}
          >
            <option value="">All Categories</option>
            {confirmationCategoryOptions.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </FloatingField>
        </div>

        <div className="mt-3 space-y-3 md:hidden">
          {groupedConfirmationRows.map((group) => {
            const isCollapsed = isConfirmationCategoryCollapsed(group.category);
            const categoryTotals = getConfirmationCategoryTotals(group.rows);

            return (
              <div key={`${group.category}-confirmation-group`} className="space-y-3">
                <button
                  type="button"
                  onClick={() => toggleConfirmationCategoryCollapse(group.category)}
                  aria-expanded={!isCollapsed}
                  className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-xs font-bold uppercase shadow-sm transition-colors ${
                    isCollapsed
                      ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-gray-800 dark:text-slate-200"
                      : "border-green-200 bg-green-50 text-green-800 hover:bg-green-100 dark:border-green-800 dark:bg-green-900/30 dark:text-green-100"
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
                        isCollapsed ? "-rotate-90" : "rotate-0"
                      }`}
                    />
                    <span className="truncate">Category: {group.category}</span>
                  </span>
                  <span className="shrink-0 text-right font-semibold normal-case">
                    {group.rows.length} line{group.rows.length === 1 ? "" : "s"} • Order {categoryTotals.orderQty.toLocaleString()} • Confirm {categoryTotals.confirmedQty.toLocaleString()}
                  </span>
                </button>

                {!isCollapsed &&
                  group.rows.map((row) => {
                    const isConfirmed = toBoolean(row.confirmed);
                    const originalIndex = row.__originalIndex;

                    return (
                      <div
                        key={`${row.itemCode || "item"}-${originalIndex}-confirmation-card`}
                        className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-gray-800"
                      >
                        <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-blue-50 px-3 py-2 dark:border-slate-700 dark:bg-blue-900/30">
                          <div className="min-w-0">
                            <div className="font-mono text-[11px] font-bold text-slate-600 dark:text-slate-300">
                              {row.itemCode}
                            </div>
                            <div className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                              {row.itemName}
                            </div>
                            <div className="mt-1 truncate text-[10px] font-bold uppercase text-slate-500 dark:text-slate-300">
                              Category: {row.categCode || "-"}
                            </div>
                          </div>
                          <span className="shrink-0 rounded-md bg-white px-2 py-1 text-[10px] font-bold text-slate-700 shadow-sm dark:bg-gray-900 dark:text-slate-200">
                            {row.uomCode || "-"}
                          </span>
                        </div>

                        <div className="space-y-3 px-3 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-300">
                                Order Qty
                              </div>
                              <div className="text-[10px] font-semibold uppercase text-slate-400 dark:text-slate-500">
                                Order Forecast
                              </div>
                            </div>
                            <div className="w-28 shrink-0 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-right text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-gray-900 dark:text-slate-200">
                              {toNumber(row.forecastQty).toLocaleString()}
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-300">
                                Confirm Qty
                              </div>
                              {isConfirmed && (
                                <div className="text-[10px] font-bold uppercase text-green-600 dark:text-green-300">
                                  Confirmed
                                </div>
                              )}
                            </div>
                            <div className="w-28 shrink-0 rounded-md border border-slate-200 bg-white dark:border-slate-700 dark:bg-gray-900">
                              <QuantityInput
                                value={row.orderQty ?? 0}
                                onChange={(value) => handleConfirmQtyChange(originalIndex, value)}
                                tone="green"
                                navGroup="confirmation-mobile"
                                navRow={row.__displayIndex}
                                navCol={0}
                                disabled={isConfirmed}
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-300">
                                Confirmation Date
                              </div>
                              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                                {shortDate(row.deliveryDate || deliveryDate)}
                              </div>
                            </div>
                            <div className="w-36 shrink-0 rounded-md border border-slate-200 bg-white dark:border-slate-700 dark:bg-gray-900">
                              <DateInput
                                value={row.deliveryDate || deliveryDate}
                                onChange={(value) => handleConfirmDateChange(originalIndex, value)}
                                disabled={isConfirmed}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            );
          })}

          {filteredConfirmationRows.length === 0 && (
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500 shadow-sm dark:border-slate-700 dark:bg-gray-800 dark:text-slate-300">
              <div className="flex flex-col items-center justify-center gap-2">
                <PackageOpen className="h-8 w-8 text-slate-400" />
                <span>{hasTaggedBranch ? "No forecast rows loaded for confirmation." : "Assign a branch to this user before ordering."}</span>
              </div>
            </div>
          )}
        </div>

        <div className="global-tran-table-main-div-ui mt-3 hidden max-w-full overflow-x-auto sm:mt-4 md:block">
          <div className="global-tran-table-main-sub-div-ui relative isolate !max-h-[56vh] sm:!max-h-[360px]">
            <table className="w-max min-w-full table-fixed border-separate border-spacing-0 [&_td]:border-b [&_td]:border-r [&_td]:border-slate-200 [&_th]:border-b [&_th]:border-r [&_th]:border-slate-200 [&_tr>td:first-child]:border-l">
              <thead className="global-tran-thead-div-ui sticky top-0 z-[220]">
                <tr>
                  <th className="global-tran-th-ui sticky left-0 top-0 z-[240] w-[96px] min-w-[96px] max-w-[96px] bg-blue-100 text-left dark:bg-blue-900">Code</th>
                  <th className="global-tran-th-ui sticky left-[96px] top-0 z-[240] w-[240px] min-w-[240px] max-w-[240px] bg-blue-100 text-left dark:bg-blue-900">Item Name</th>
                  <th className="global-tran-th-ui sticky left-[336px] top-0 z-[240] w-[100px] min-w-[100px] max-w-[100px] bg-blue-100 text-left dark:bg-blue-900">Category</th>
                  <th className="global-tran-th-ui sticky left-[436px] top-0 z-[240] w-[72px] min-w-[72px] max-w-[72px] bg-blue-100 text-center shadow-[2px_0_0_0_rgba(226,232,240,1)] dark:bg-blue-900">UOM</th>
                  <th className="global-tran-th-ui sticky top-0 z-[210] w-[120px] min-w-[120px] max-w-[120px] bg-blue-100 text-right dark:bg-blue-900">Order Qty</th>
                  <th className="global-tran-th-ui sticky top-0 z-[210] w-[120px] min-w-[120px] max-w-[120px] bg-blue-100 text-right dark:bg-blue-900">Confirm Qty</th>
                  <th className="global-tran-th-ui sticky top-0 z-[210] w-[150px] min-w-[150px] max-w-[150px] bg-blue-100 text-left dark:bg-blue-900">Confirmation Date</th>
                </tr>
              </thead>
              <tbody>
                {groupedConfirmationRows.map((group) => {
                  const isCollapsed = isConfirmationCategoryCollapsed(group.category);
                  const categoryTotals = getConfirmationCategoryTotals(group.rows);

                  return (
                    <Fragment key={`${group.category}-confirmation-table-group`}>
                      <tr className="bg-green-50/80 dark:bg-green-900/30">
                        <td colSpan={7} className="global-tran-td-ui px-0 py-0">
                          <button
                            type="button"
                            onClick={() => toggleConfirmationCategoryCollapse(group.category)}
                            aria-expanded={!isCollapsed}
                            className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs font-bold uppercase text-green-800 hover:bg-green-100 dark:text-green-100 dark:hover:bg-green-900/50"
                          >
                            <span className="flex min-w-0 items-center gap-2">
                              <ChevronDown
                                className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
                                  isCollapsed ? "-rotate-90" : "rotate-0"
                                }`}
                              />
                              <span className="truncate">Category: {group.category}</span>
                            </span>
                            <span className="shrink-0 text-right font-semibold normal-case text-slate-600 dark:text-slate-200">
                              {group.rows.length} line{group.rows.length === 1 ? "" : "s"} • Order {categoryTotals.orderQty.toLocaleString()} • Confirm {categoryTotals.confirmedQty.toLocaleString()}
                            </span>
                          </button>
                        </td>
                      </tr>

                      {!isCollapsed &&
                        group.rows.map((row) => {
                          const originalIndex = row.__originalIndex;

                          return (
                            <tr key={`${row.itemCode || "item"}-${originalIndex}`} className="global-tran-tr-ui">
                              <td className="global-tran-td-ui sticky left-0 z-[40] w-[96px] min-w-[96px] max-w-[96px] overflow-hidden text-ellipsis whitespace-nowrap bg-white font-mono font-semibold dark:bg-black">{row.itemCode}</td>
                              <td className="global-tran-td-ui sticky left-[96px] z-[40] w-[240px] min-w-[240px] max-w-[240px] bg-white font-medium dark:bg-black">
                                <span className="block truncate">{row.itemName}</span>
                              </td>
                              <td className="global-tran-td-ui sticky left-[336px] z-[40] w-[100px] min-w-[100px] max-w-[100px] overflow-hidden text-ellipsis whitespace-nowrap bg-white text-xs font-semibold text-slate-700 dark:bg-black dark:text-slate-200">{row.categCode || "-"}</td>
                              <td className="global-tran-td-ui sticky left-[436px] z-[40] w-[72px] min-w-[72px] max-w-[72px] bg-white text-center shadow-[2px_0_0_0_rgba(226,232,240,1)] dark:bg-black">
                                <span className="block w-full text-center text-xs font-medium text-slate-700 dark:text-slate-200">{row.uomCode || "-"}</span>
                              </td>
                              <td className="global-tran-td-ui w-[120px] min-w-[120px] max-w-[120px] bg-slate-50 text-right text-xs font-semibold text-slate-700 dark:bg-gray-900 dark:text-slate-200">
                                {toNumber(row.forecastQty).toLocaleString()}
                              </td>
                              <td className="global-tran-td-ui w-[120px] min-w-[120px] max-w-[120px] text-right">
                                <QuantityInput
                                  value={row.orderQty ?? 0}
                                  onChange={(value) => handleConfirmQtyChange(originalIndex, value)}
                                  tone="green"
                                  navGroup="confirmation"
                                  navRow={row.__displayIndex}
                                  navCol={0}
                                  disabled={toBoolean(row.confirmed)}
                                />
                              </td>
                              <td className="global-tran-td-ui w-[150px] min-w-[150px] max-w-[150px] text-left">
                                <DateInput
                                  value={row.deliveryDate || deliveryDate}
                                  onChange={(value) => handleConfirmDateChange(originalIndex, value)}
                                  disabled={toBoolean(row.confirmed)}
                                />
                              </td>
                            </tr>
                          );
                        })}
                    </Fragment>
                  );
                })}

                {filteredConfirmationRows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="global-tran-td-ui py-10 text-center text-sm text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <PackageOpen className="h-8 w-8 text-slate-400" />
                        <span>{hasTaggedBranch ? "No forecast rows loaded for confirmation." : "Assign a branch to this user before ordering."}</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="global-tran-tab-footer-main-div-ui !mt-4 !gap-3">
          <div className="global-tran-tab-footer-button-div-ui w-full sm:w-auto">
            <ActionButton
              icon={CheckCircle2}
              onClick={confirmOrder}
              disabled={
                !hasTaggedBranch ||
                filteredConfirmationRows.length === 0 ||
                confirmSubmitting ||
                !filteredConfirmationRows.some((row) => !toBoolean(row.confirmed) && toNumber(row.orderQty) > 0)
              }
              variant="success"
            >
              {confirmSubmitting ? "Confirming..." : "Confirm Order"}
            </ActionButton>
          </div>

          <div className="ml-auto flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <div className="global-tran-tab-footer-total-main-div-ui w-full rounded-lg bg-blue-50/60 px-3 py-2 sm:w-auto dark:bg-gray-900/40">
              <div className="global-tran-tab-footer-total-div-ui">
                <label className="global-tran-tab-footer-total-label-ui">Total Order Qty:</label>
                <label className="global-tran-tab-footer-total-value-ui">{totalConfirmationOrderQty.toLocaleString()}</label>
              </div>
            </div>

            <div className="global-tran-tab-footer-total-main-div-ui w-full rounded-lg bg-green-50/60 px-3 py-2 sm:w-auto dark:bg-gray-900/40">
              <div className="global-tran-tab-footer-total-div-ui">
                <label className="global-tran-tab-footer-total-label-ui">Total Confirmed Qty:</label>
                <label className="global-tran-tab-footer-total-value-ui">{totalConfirmedQty.toLocaleString()}</label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-4 right-4 hidden max-w-[calc(100vw-2rem)] gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-lg dark:border-slate-700 dark:bg-gray-800 dark:text-slate-200 md:flex md:max-w-[420px]">
        <UserRound className="h-4 w-4 text-blue-600" />
        <span className="truncate">{userCode || "User"}</span>
        <span className="text-slate-300">|</span>
        <Building2 className="h-4 w-4 text-blue-600" />
        <span className="truncate">{branchDisplay || "No branch tagged"}</span>
      </div>
    </div>
  );
}
