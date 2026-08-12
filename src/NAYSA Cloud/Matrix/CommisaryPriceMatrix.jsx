import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Pencil, Save, Search, Trash2, Undo2, Upload } from "lucide-react";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";

import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import RegistrationInfo from "@/NAYSA Cloud/Global/RegistrationInfo.jsx";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable.jsx";
import ItemMastLookupModal from "@/NAYSA Cloud/Lookup/SearchItemMast";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import {
  useSwalErrorAlert as showErrorAlert,
  useSwalSuccessAlert as showSuccessAlert,
  useSwalDeleteConfirm as confirmDelete,
} from "@/NAYSA Cloud/Global/behavior.jsx";

const DOC_TYPE = "CommisaryPriceMatrix";
const TABS = [
  { key: "category", label: "Price Category" },
  { key: "matrix", label: "Price Matrix" },
  { key: "history", label: "History" },
];

const EMPTY_CATEGORY = {
  code: "",
  description: "",
  registeredBy: "",
  registeredDate: "",
  lastUpdatedBy: "",
  lastUpdatedDate: "",
};

const EMPTY_MATRIX = {
  pmId: "",
  priceCategCode: "",
  priceCategName: "",
  effectivityDate: "",
  registeredBy: "",
  registeredDate: "",
  lastUpdatedBy: "",
  lastUpdatedDate: "",
};

const EMPTY_HISTORY = {
  priceCategCode: "",
  itemCode: "",
  itemName: "",
  startDate: "",
  endDate: "",
};

const safeJson = (value, fallback) => {
  if (value && typeof value === "object") return value;
  try {
    return JSON.parse(value || "");
  } catch {
    return fallback;
  }
};

const responseResult = (response, fallback = []) => {
  const result = response?.data?.data?.[0]?.result;
  return safeJson(result, fallback);
};

const firstProcedureValue = (response) => {
  const row = response?.data?.data?.[0];
  if (!row || typeof row !== "object") return undefined;
  return row.result ?? Object.values(row)[0];
};

const numberValue = (value) => {
  const parsed = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

const fieldValue = (valueOrEvent) =>
  valueOrEvent?.target?.value ?? valueOrEvent ?? "";

const formatPrice = (value, decimals) =>
  numberValue(value).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

const formatDateTimeCell = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();
  const hour24 = date.getHours();
  const hour12 = String(hour24 % 12 || 12).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");
  const period = hour24 >= 12 ? "PM" : "AM";

  return `${month}/${day}/${year}, ${hour12}:${minute}:${second} ${period}`;
};

export default function CommisaryPriceMatrix() {
  const { currentUserRow, companyInfo } = useAuth();
  const uploadRef = useRef(null);
  const priceInputRefs = useRef({});
  const [activeTab, setActiveTab] = useState("category");
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState(EMPTY_CATEGORY);
  const [matrix, setMatrix] = useState(EMPTY_MATRIX);
  const [matrixRows, setMatrixRows] = useState([]);
  const [historyFilter, setHistoryFilter] = useState(EMPTY_HISTORY);
  const [historyRows, setHistoryRows] = useState([]);
  const [showHistoryItemLookup, setShowHistoryItemLookup] = useState(false);

  const priceDecimals = Number(companyInfo?.item_decsellprice ?? 2);
  const userCode = currentUserRow?.userCode || "ADMIN";

  useEffect(() => {
    document.title = "Commissary Price Matrix";
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const response = await apiClient.get("/loadPriceCateg");
      const parsed = responseResult(response, []);
      setCategories(Array.isArray(parsed) ? parsed : []);
    } catch (error) {
      showErrorAlert(
        "Price Categories",
        error?.response?.data?.message || "Unable to load price categories."
      );
    }
  };

  const categoryOptions = useMemo(
    () =>
      categories.map((item) => ({
        value: item.code,
        label: `${item.code} - ${item.description}`,
      })),
    [categories]
  );

  const resetCategory = () => setCategory(EMPTY_CATEGORY);
  const resetMatrix = () => {
    setMatrix(EMPTY_MATRIX);
    setMatrixRows([]);
  };
  const resetHistory = () => {
    setHistoryFilter(EMPTY_HISTORY);
    setHistoryRows([]);
  };

  const selectCategory = (row) => setCategory({ ...EMPTY_CATEGORY, ...row });

  const saveCategory = async () => {
    if (!category.code.trim() || !category.description.trim()) {
      showErrorAlert("Required Fields", "Category Code and Description are required.");
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.post("/upsertPriceCateg", {
        json_data: JSON.stringify({
          json_data: {
            code: category.code.trim(),
            description: category.description.trim(),
            userCode,
          },
        }),
      });
      if (response?.data?.success === false) {
        throw new Error(response?.data?.errormsg || response?.data?.message);
      }
      showSuccessAlert("Saved", "Price category saved successfully.");
      await loadCategories();
      const fetched = await apiClient.get("/getPriceCateg", {
        params: { CATEG_CODE: category.code.trim() },
      });
      const row = responseResult(fetched, [])[0];
      if (row) selectCategory(row);
    } catch (error) {
      showErrorAlert(
        "Save Failed",
        error?.response?.data?.message || error?.message || "Unable to save category."
      );
    } finally {
      setLoading(false);
    }
  };

  const deleteCategory = async () => {
    if (!category.code) return;
    const answer = await Swal.fire({
      title: "Delete Price Category?",
      text: `${category.code} - ${category.description}`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
    });
    if (!answer.isConfirmed) return;

    setLoading(true);
    try {
      const inUse = await apiClient.post("/checkInUsedPriceCateg", {
        json_data: { code: category.code },
      });
      const usedResult = safeJson(firstProcedureValue(inUse), {});
      if (String(usedResult?.result) === "1") {
        throw new Error("This category is already used by a Commissary Price Matrix.");
      }
      await apiClient.post("/deletePriceCateg", {
        json_data: {
          code: category.code,
          description: category.description,
          userCode,
        },
      });
      resetCategory();
      await loadCategories();
      showSuccessAlert("Deleted", "Price category deleted successfully.");
    } catch (error) {
      showErrorAlert(
        "Delete Failed",
        error?.response?.data?.message || error?.message || "Unable to delete category."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleMatrixCategory = (eventOrValue) => {
    const code =
      typeof eventOrValue === "string"
        ? eventOrValue
        : eventOrValue?.target?.value || "";
    const selected = categories.find((item) => item.code === code);
    setMatrix((previous) => ({
      ...EMPTY_MATRIX,
      priceCategCode: code,
      priceCategName: selected?.description || "",
      effectivityDate: previous.effectivityDate,
    }));
    setMatrixRows([]);
  };

  const findMatrix = async () => {
    if (!matrix.priceCategCode || !matrix.effectivityDate) {
      showErrorAlert("Find", "Price Category and Effectivity Date are required.");
      return;
    }
    setLoading(true);
    try {
      const response = await apiClient.get("/getPriceComm", {
        params: {
          json_data: {
            pmId: matrix.pmId,
            priceCategCode: matrix.priceCategCode,
            effectivityDate: matrix.effectivityDate,
          },
        },
      });
      const result = responseResult(response, {});
      setMatrix((previous) => ({ ...previous, ...result }));
      setMatrixRows(
        (result?.dt1 || []).map((row) => ({
          ...row,
          id: row.itemCode,
          price: formatPrice(row.price, priceDecimals),
        }))
      );
    } catch (error) {
      showErrorAlert(
        "Find Failed",
        error?.response?.data?.message || error?.message || "Unable to load matrix."
      );
    } finally {
      setLoading(false);
    }
  };

  const saveMatrix = async () => {
    if (!matrix.priceCategCode || !matrix.effectivityDate || !matrixRows.length) {
      showErrorAlert(
        "Required Fields",
        "Select a Price Category and Effectivity Date, then load the item list."
      );
      return;
    }
    setLoading(true);
    try {
      const response = await apiClient.post("/upsertPriceComm", {
        json_data: {
          pmId: matrix.pmId,
          priceCategCode: matrix.priceCategCode,
          effectivityDate: matrix.effectivityDate,
          userCode,
          dt1: matrixRows.map((row) => ({
            itemCode: row.itemCode,
            price: numberValue(row.price),
          })),
        },
      });
      if (response?.data?.success === false) {
        throw new Error(response?.data?.message || "Unable to save matrix.");
      }
      showSuccessAlert("Saved", "Commissary price matrix saved successfully.");
      await findMatrix();
    } catch (error) {
      showErrorAlert(
        "Save Failed",
        error?.response?.data?.message || error?.message || "Unable to save matrix."
      );
    } finally {
      setLoading(false);
    }
  };

  const deleteMatrix = async () => {
    if (!matrix.pmId) return;
    const answer = await Swal.fire({
      title: "Delete Price Matrix?",
      text: "The selected matrix and all its item prices will be deleted.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
    });
    if (!answer.isConfirmed) return;

    setLoading(true);
    try {
      await apiClient.post("/deletePriceComm", {
        json_data: {
          pmId: matrix.pmId,
          priceCategCode: matrix.priceCategCode,
          effectivityDate: matrix.effectivityDate,
        },
      });
      resetMatrix();
      showSuccessAlert("Deleted", "Commissary price matrix deleted successfully.");
    } catch (error) {
      showErrorAlert(
        "Delete Failed",
        error?.response?.data?.message || error?.message || "Unable to delete matrix."
      );
    } finally {
      setLoading(false);
    }
  };

  const findHistory = async () => {
    if (
      historyFilter.startDate &&
      historyFilter.endDate &&
      historyFilter.startDate > historyFilter.endDate
    ) {
      showErrorAlert("Invalid Date Range", "Start Date must not be later than End Date.");
      return;
    }
    setLoading(true);
    try {
      const response = await apiClient.get("/historyPriceComm", {
        params: {
          json_data: {
            priceCategCode: historyFilter.priceCategCode,
            itemCode: historyFilter.itemCode,
            startDate: historyFilter.startDate,
            endDate: historyFilter.endDate,
          },
        },
      });
      const result = responseResult(response, []);
      setHistoryRows(
        (Array.isArray(result) ? result : []).map((row, index) => ({
          ...row,
          id: `${row.pmId}-${row.itemCode}-${index}`,
        }))
      );
    } catch (error) {
      showErrorAlert(
        "History Failed",
        error?.response?.data?.message || error?.message || "Unable to load history."
      );
    } finally {
      setLoading(false);
    }
  };

  const retrieveHistory = async (row) => {
    const selected = categories.find((item) => item.code === row.priceCategCode);
    setMatrix({
      ...EMPTY_MATRIX,
      pmId: row.pmId,
      priceCategCode: row.priceCategCode,
      priceCategName: selected?.description || row.priceCategName || "",
      effectivityDate: row.effectivityDate,
    });
    setActiveTab("matrix");
    setLoading(true);
    try {
      const response = await apiClient.get("/getPriceComm", {
        params: { json_data: { pmId: row.pmId } },
      });
      const result = responseResult(response, {});
      setMatrix((previous) => ({ ...previous, ...result }));
      setMatrixRows(
        (result?.dt1 || []).map((item) => ({
          ...item,
          id: item.itemCode,
          price: formatPrice(item.price, priceDecimals),
        }))
      );
    } finally {
      setLoading(false);
    }
  };

  const deleteHistoryRow = async (row) => {
    const categoryText = `${row.priceCategCode || ""}${
      row.priceCategName ? ` - ${row.priceCategName}` : ""
    }`;
    const confirm = await confirmDelete(
      "Delete Record?",
      `Are you sure you want to delete Commissary Price Matrix "${categoryText}"${
        row.effectivityDate
          ? ` with effectivity date "${row.effectivityDate}"`
          : ""
      }?`,
      "Yes, delete it"
    );
    if (!confirm?.isConfirmed) return;

    setLoading(true);
    try {
      const response = await apiClient.post("/deletePriceComm", {
        json_data: {
          pmId: row.pmId,
          priceCategCode: row.priceCategCode,
          effectivityDate: row.effectivityDate,
        },
      });
      if (response?.data?.success === false) {
        throw new Error(response?.data?.message || "Unable to delete matrix.");
      }
      setHistoryRows((previous) =>
        previous.filter((item) => item.pmId !== row.pmId)
      );
      showSuccessAlert("Deleted", "Commissary price matrix deleted successfully.");
    } catch (error) {
      showErrorAlert(
        "Delete Failed",
        error?.response?.data?.message || error?.message || "Unable to delete matrix."
      );
    } finally {
      setLoading(false);
    }
  };

  const updatePrice = (itemCode, value) => {
    const clean = String(value ?? "").replace(/,/g, "");
    if (clean !== "" && !/^\d*(\.\d*)?$/.test(clean)) return;
    setMatrixRows((previous) =>
      previous.map((row) => (row.itemCode === itemCode ? { ...row, price: clean } : row))
    );
  };

  const focusPrice = (itemCode) => {
    setMatrixRows((previous) =>
      previous.map((row) => {
        if (row.itemCode !== itemCode) return row;
        const raw = String(row.price ?? "").replace(/,/g, "").trim();
        return { ...row, price: numberValue(raw) === 0 ? "" : raw };
      })
    );
  };

  const blurPrice = (itemCode) => {
    setMatrixRows((previous) =>
      previous.map((row) =>
        row.itemCode === itemCode
          ? { ...row, price: formatPrice(row.price, priceDecimals) }
          : row
      )
    );
  };

  const handlePriceEnter = (event, row) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    blurPrice(row.itemCode);

    const currentIndex = matrixRows.findIndex(
      (item) => item.itemCode === row.itemCode
    );
    const nextRow = matrixRows[currentIndex + 1];
    if (!nextRow) return;

    setTimeout(() => {
      const nextInput = priceInputRefs.current[nextRow.itemCode];
      nextInput?.focus();
      nextInput?.select?.();
    }, 0);
  };

  const downloadMatrix = () => {
    if (!matrixRows.length) return;
    const sheet = XLSX.utils.json_to_sheet(
      matrixRows.map((row) => ({
        "Category Name": row.categName,
        "Item Code": row.itemCode,
        "Item Name": row.itemName,
        UOM: row.uomCode,
        Price: numberValue(row.price),
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Price Matrix");
    XLSX.writeFile(
      workbook,
      `Commissary_Price_Matrix_${matrix.priceCategCode}_${matrix.effectivityDate}.xlsx`
    );
  };

  const uploadMatrix = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const records = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {
        defval: "",
      });
      const byCode = new Map(
        records.map((row) => [String(row["Item Code"] || "").trim(), row])
      );
      setMatrixRows((previous) =>
        previous.map((row) => {
          const imported = byCode.get(row.itemCode);
          return imported
            ? { ...row, price: formatPrice(imported.Price, priceDecimals) }
            : row;
        })
      );
      showSuccessAlert("Imported", "Matching item prices were imported successfully.");
    } catch (error) {
      showErrorAlert("Import Failed", error?.message || "Unable to read the workbook.");
    }
  };

  const categoryColumns = [
    { key: "code", label: "Category Code", width: 160 },
    { key: "description", label: "Category Description", width: 280 },
    { key: "registeredBy", label: "Registered By", width: 150 },
    {
      key: "registeredDate",
      label: "Registered Date",
      width: 190,
      render: (row) => formatDateTimeCell(row.registeredDate),
    },
    { key: "lastUpdatedBy", label: "Updated By", width: 150 },
    {
      key: "lastUpdatedDate",
      label: "Updated Date",
      width: 190,
      render: (row) => formatDateTimeCell(row.lastUpdatedDate),
    },
  ];

  const matrixColumns = [
      { key: "categName", label: "Category Name", width: 180 },
      { key: "itemCode", label: "Item Code", width: 140 },
      { key: "itemName", label: "Item Name", width: 280 },
      { key: "uomCode", label: "UOM", width: 90 },
      {
        key: "price",
        label: "Price",
        width: 140,
        render: (row) => (
          <input
            ref={(element) => {
              if (element) priceInputRefs.current[row.itemCode] = element;
              else delete priceInputRefs.current[row.itemCode];
            }}
            className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-right text-xs outline-none focus:border-blue-500"
            value={row.price ?? ""}
            onChange={(event) => updatePrice(row.itemCode, event.target.value)}
            onFocus={() => focusPrice(row.itemCode)}
            onBlur={() => blurPrice(row.itemCode)}
            onKeyDown={(event) => handlePriceEnter(event, row)}
            onClick={(event) => event.stopPropagation()}
          />
        ),
      },
    ];

  const historyColumns = [
    {
      key: "__actions",
      label: "Action",
      sortable: false,
      filterable: false,
      width: 90,
      className: "text-left",
      render: (row) => (
        <div className="flex items-center justify-start gap-2">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              retrieveHistory(row);
            }}
            disabled={loading}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-blue-100 bg-blue-50 text-blue-600 transition-colors hover:border-blue-600 hover:bg-blue-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            title="Edit"
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              deleteHistoryRow(row);
            }}
            disabled={loading}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-red-100 bg-red-50 text-red-600 transition-colors hover:border-red-600 hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
    { key: "effectivityDate", label: "Effectivity Date", width: 140 },
    { key: "priceCategCode", label: "Category Code", width: 140 },
    { key: "priceCategName", label: "Category Name", width: 220 },
    { key: "itemCode", label: "Item Code", width: 140 },
    { key: "itemName", label: "Item Name", width: 260 },
    { key: "uomCode", label: "UOM", width: 90 },
    {
      key: "price",
      label: "Price",
      width: 120,
      render: (row) => <div className="text-right">{formatPrice(row.price, priceDecimals)}</div>,
    },
    { key: "registeredBy", label: "Registered By", width: 140 },
    {
      key: "registeredDate",
      label: "Registered Date",
      width: 190,
      render: (row) => formatDateTimeCell(row.registeredDate),
    },
    { key: "lastUpdatedBy", label: "Updated By", width: 140 },
    {
      key: "lastUpdatedDate",
      label: "Updated Date",
      width: 190,
      render: (row) => formatDateTimeCell(row.lastUpdatedDate),
    },
  ];

  const actionButton = (label, Icon, onClick, disabled = false) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      title={label}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-600 text-[11px] font-medium text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-3"
    >
      <Icon size={14} />
      <span className="ml-1 hidden sm:inline">{label}</span>
    </button>
  );

  const renderActions = () => {
    if (activeTab === "category") {
      return (
        <>
          {actionButton("Save", Save, saveCategory, !category.code || !category.description)}
          {actionButton("Delete", Trash2, deleteCategory, !category.code)}
          {actionButton("Reset", Undo2, resetCategory)}
        </>
      );
    }
    if (activeTab === "matrix") {
      return (
        <>
          {actionButton("Find", Search, findMatrix, !matrix.priceCategCode || !matrix.effectivityDate)}
          {actionButton("Save", Save, saveMatrix, !matrixRows.length)}
          {actionButton("Import", Upload, () => uploadRef.current?.click(), !matrixRows.length)}
          {actionButton("Export", Download, downloadMatrix, !matrixRows.length)}
          {actionButton("Delete", Trash2, deleteMatrix, !matrix.pmId)}
          {actionButton("Reset", Undo2, resetMatrix)}
        </>
      );
    }
    return (
      <>
        {actionButton("Find", Search, findHistory)}
        {actionButton("Reset", Undo2, resetHistory)}
      </>
    );
  };

  return (
    <div className="global-ref-main-div-ui">
      <input
        ref={uploadRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={uploadMatrix}
      />
      {loading && <LoadingSpinner />}

      <div className="global-ref-header-ui">
        <div className="flex w-full flex-col gap-3 md:grid md:grid-cols-3 md:items-center">
          <h1 className="global-ref-headertext-ui text-center md:text-left">
            Commissary Price Matrix
          </h1>
          <div className="flex w-full justify-center">
            <div className="w-full md:w-auto">
              <div className="no-scrollbar flex flex-nowrap overflow-x-auto border-b border-gray-200 dark:border-gray-700">
                {TABS.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-[12px] font-bold transition-all ${
                      activeTab === tab.key
                        ? "border-blue-600 bg-blue-50/50 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-blue-500"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-nowrap items-center justify-center gap-2 whitespace-nowrap text-xs md:justify-end">
            {renderActions()}
          </div>
        </div>
      </div>

      <div className="global-tran-tab-div-ui px-3 pb-4 pt-44 sm:px-4 sm:pt-32 md:mt-24 md:p-6">
        {activeTab === "category" && (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
              <div className="rounded-xl border bg-white p-4 shadow-sm md:col-span-9">
                <h3 className="mb-3 border-b pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Price Category Information
                </h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FieldRenderer
                    label="Category Code"
                    value={category.code}
                    onChange={(valueOrEvent) =>
                      setCategory((previous) => ({
                        ...previous,
                        code: String(fieldValue(valueOrEvent)).toUpperCase(),
                      }))
                    }
                    disabled={Boolean(category.registeredDate)}
                    required
                  />
                  <FieldRenderer
                    label="Category Description"
                    value={category.description}
                    onChange={(valueOrEvent) =>
                      setCategory((previous) => ({
                        ...previous,
                        description: fieldValue(valueOrEvent),
                      }))
                    }
                    required
                  />
                </div>
              </div>
              <div className="md:col-span-3">
                <RegistrationInfo data={category} layout="minimize" />
              </div>
            </div>
            <div className="global-tran-table-main-div-ui mt-4 overflow-x-auto rounded-xl border bg-white shadow-sm">
              <SearchGlobalReferenceTable
                docType={`${DOC_TYPE}Category`}
                columns={categoryColumns}
                data={categories}
                itemsPerPage={50}
                showFilters
                showGlobalSearch
                onRowClick={selectCategory}
                onRowDoubleClick={selectCategory}
              />
            </div>
          </>
        )}

        {activeTab === "matrix" && (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
              <div className="rounded-xl border bg-white p-4 shadow-sm md:col-span-9">
                <h3 className="mb-3 border-b pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Commissary Price Information
                </h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <FieldRenderer
                    label="Price Category"
                    type="select"
                    value={matrix.priceCategCode}
                    onChange={handleMatrixCategory}
                    options={categoryOptions}
                    required
                  />
                  <FieldRenderer
                    label="Category Description"
                    value={matrix.priceCategName}
                    readOnly
                    disabled
                  />
                  <FieldRenderer
                    label="Effectivity Date"
                    type="date"
                    value={matrix.effectivityDate}
                    onChange={(event) => {
                      const value = event?.target?.value ?? event;
                      setMatrix((previous) => ({
                        ...previous,
                        pmId: "",
                        effectivityDate: value,
                      }));
                      setMatrixRows([]);
                    }}
                    required
                  />
                </div>
              </div>
              <div className="md:col-span-3">
                <RegistrationInfo data={matrix} layout="minimize" />
              </div>
            </div>
            <div className="global-tran-table-main-div-ui mt-4 overflow-x-auto rounded-xl border bg-white shadow-sm">
              <SearchGlobalReferenceTable
                docType={`${DOC_TYPE}Details`}
                columns={matrixColumns}
                data={matrixRows}
                itemsPerPage={200}
                showFilters
                showGlobalSearch
                isLoading={loading}
              />
            </div>
          </>
        )}

        {activeTab === "history" && (
          <>
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <h3 className="mb-3 border-b pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Commissary Price Matrix History
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <FieldRenderer
                  label="Price Category"
                  type="select"
                  value={historyFilter.priceCategCode}
                  options={categoryOptions}
                  onChange={(eventOrValue) =>
                    setHistoryFilter((previous) => ({
                      ...previous,
                      priceCategCode:
                        typeof eventOrValue === "string"
                          ? eventOrValue
                          : eventOrValue?.target?.value || "",
                    }))
                  }
                />
                <FieldRenderer
                  label="Item Code - Item Name"
                  type="lookup"
                  value={
                    historyFilter.itemCode
                      ? `${historyFilter.itemCode}${
                          historyFilter.itemName
                            ? ` - ${historyFilter.itemName}`
                            : ""
                        }`
                      : ""
                  }
                  onLookup={() => setShowHistoryItemLookup(true)}
                  readOnly
                />
                <FieldRenderer
                  label="Start Date"
                  type="date"
                  value={historyFilter.startDate}
                  onChange={(event) =>
                    setHistoryFilter((previous) => ({
                      ...previous,
                      startDate: event?.target?.value ?? event,
                    }))
                  }
                />
                <FieldRenderer
                  label="End Date"
                  type="date"
                  value={historyFilter.endDate}
                  onChange={(event) =>
                    setHistoryFilter((previous) => ({
                      ...previous,
                      endDate: event?.target?.value ?? event,
                    }))
                  }
                />
              </div>
            </div>
            <div className="global-tran-table-main-div-ui mt-4 overflow-x-auto rounded-xl border bg-white shadow-sm">
              <SearchGlobalReferenceTable
                docType={`${DOC_TYPE}History`}
                columns={historyColumns}
                data={historyRows}
                itemsPerPage={50}
                showFilters
                showGlobalSearch
                showGroupBy
                onRowDoubleClick={retrieveHistory}
                isLoading={loading}
              />
            </div>
          </>
        )}
      </div>

      {showHistoryItemLookup && (
        <ItemMastLookupModal
          isOpen={showHistoryItemLookup}
          endpoint="getInvLookupFG"
          enableMultiSelect={false}
          docType="MATRIX"
          onClose={(selected) => {
            if (selected) {
              const records = Array.isArray(selected.records)
                ? selected.records
                : selected.records
                  ? [selected.records]
                  : [];
              const item = records[0] || selected;
              setHistoryFilter((previous) => ({
                ...previous,
                itemCode: item?.itemCode || item?.item_code || "",
                itemName: item?.itemName || item?.item_name || "",
              }));
              setHistoryRows([]);
            }
            setShowHistoryItemLookup(false);
          }}
        />
      )}
    </div>
  );
}
