import React, { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Copy,
  Pencil,
  Plus,
  Printer,
  RefreshCcw,
  Save,
  Settings,
  Trash2,
} from "lucide-react";
import Swal from "sweetalert2";

import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import {
  useSwalErrorAlert,
  useSwalSuccessAlert,
} from "@/NAYSA Cloud/Global/behavior.jsx";

const DOC_TYPE = "CheckTemplateSetup";

const ENDPOINTS = {
  loadTemplates: "/getCheckTemplates",
  getTemplate: "/getCheckTemplate",
  saveTemplate: "/upsertCheckTemplate",
  deleteTemplate: "/deleteCheckTemplate",
  loadBankMapping: "/loadBankCheckTemplateMapping",
  saveBankMapping: "/upsertBankCheckTemplateMapping",
  removeBankMapping: "/removeBankCheckTemplateMapping",
};

const TABS = [
  { key: "templateList", label: "Check Templates" },
  { key: "bankMapping", label: "Bank Mapping" },
  { key: "designer", label: "Template Designer" },
];

const FIELD_OPTIONS = [
  {
    fieldKey: "checkDate",
    fieldLabel: "Check Date",
    sampleValue: "05/12/2026",
    colorClass: "border-red-400 bg-red-50/70 text-red-700",
  },
  {
    fieldKey: "amountInWords",
    fieldLabel: "Amount in Words",
    sampleValue: "One Hundred Twenty Five Thousand Pesos Only",
    colorClass: "border-blue-400 bg-blue-50/70 text-blue-700",
  },
  {
    fieldKey: "payeeName",
    fieldLabel: "Payee Name",
    sampleValue: "ABC SUPPLIER INC.",
    colorClass: "border-green-400 bg-green-50/70 text-green-700",
  },
  {
    fieldKey: "checkAmount",
    fieldLabel: "Check Amount",
    sampleValue: "125,000.00",
    colorClass: "border-purple-400 bg-purple-50/70 text-purple-700",
  },
  {
    fieldKey: "forAccountOnly",
    fieldLabel: "For A/C Only",
    sampleValue: "For A/C Only",
    colorClass: "border-orange-400 bg-orange-50/70 text-orange-700",
  },
  {
    fieldKey: "cvNo",
    fieldLabel: "CV No",
    sampleValue: "CV-000001",
    colorClass: "border-cyan-400 bg-cyan-50/70 text-cyan-700",
  },
];

const DEFAULT_HEADER = {
  templateId: "",
  templateCode: "",
  templateName: "",
  description: "",
  paperWidth: 203.2,
  paperHeight: 88.9,
  unitCode: "mm",
  offsetX: 0,
  offsetY: 0,
  isActive: true,
};

const DEFAULT_TEMPLATE_FIELDS = [
  {
    fieldKey: "checkDate",
    fieldLabel: "Check Date",
    staticValue: "",
    sampleValue: "05/12/2026",
    xPosition: 152,
    yPosition: 13,
    fieldWidth: 35,
    fieldHeight: 8,
    fontName: "Arial Narrow",
    fontSize: 10,
    fontWeight: "700",
    fontStyle: "normal",
    textAlign: "center",
    rotationAngle: 0,
    isVisible: true,
    formatType: "MM/DD/YYYY",
    sortOrder: 1,
  },
  {
    fieldKey: "amountInWords",
    fieldLabel: "Amount in Words",
    staticValue: "",
    sampleValue: "One Hundred Twenty Five Thousand Pesos Only",
    xPosition: 38,
    yPosition: 43,
    fieldWidth: 90,
    fieldHeight: 8,
    fontName: "Arial Narrow",
    fontSize: 10,
    fontWeight: "600",
    fontStyle: "normal",
    textAlign: "left",
    rotationAngle: 0,
    isVisible: true,
    formatType: "Text",
    sortOrder: 2,
  },
  {
    fieldKey: "payeeName",
    fieldLabel: "Payee Name",
    staticValue: "",
    sampleValue: "ABC SUPPLIER INC.",
    xPosition: 45,
    yPosition: 29,
    fieldWidth: 88,
    fieldHeight: 8,
    fontName: "Arial Narrow",
    fontSize: 10,
    fontWeight: "700",
    fontStyle: "normal",
    textAlign: "center",
    rotationAngle: 0,
    isVisible: true,
    formatType: "Text",
    sortOrder: 3,
  },
  {
    fieldKey: "checkAmount",
    fieldLabel: "Check Amount",
    staticValue: "",
    sampleValue: "125,000.00",
    xPosition: 150,
    yPosition: 43,
    fieldWidth: 42,
    fieldHeight: 8,
    fontName: "Arial Narrow",
    fontSize: 10,
    fontWeight: "700",
    fontStyle: "normal",
    textAlign: "center",
    rotationAngle: 0,
    isVisible: true,
    formatType: "#,##0.00",
    sortOrder: 4,
  },
  {
    fieldKey: "forAccountOnly",
    fieldLabel: "For A/C Only",
    staticValue: "For A/C Only",
    sampleValue: "For A/C Only",
    xPosition: 18,
    yPosition: 66,
    fieldWidth: 36,
    fieldHeight: 8,
    fontName: "Arial Narrow",
    fontSize: 9,
    fontWeight: "700",
    fontStyle: "normal",
    textAlign: "center",
    rotationAngle: 0,
    isVisible: true,
    formatType: "Static Text",
    sortOrder: 5,
  },
  {
    fieldKey: "cvNo",
    fieldLabel: "CV No",
    staticValue: "",
    sampleValue: "CV-000001",
    xPosition: 155,
    yPosition: 66,
    fieldWidth: 34,
    fieldHeight: 8,
    fontName: "Arial Narrow",
    fontSize: 9,
    fontWeight: "700",
    fontStyle: "normal",
    textAlign: "center",
    rotationAngle: 0,
    isVisible: true,
    formatType: "Text",
    sortOrder: 6,
  },
];

const DATE_FORMAT_OPTIONS = [
  "MM/DD/YYYY",
  "DD/MM/YYYY",
  "YYYY-MM-DD",
  "MMM DD, YYYY",
  "MMMM DD, YYYY",
  "MM DD YYYY",
  "MM  DD   YYYY",
  "M M  D D   Y Y Y Y",
  "DD MMM YYYY",
];

const FONT_FAMILY_OPTIONS = [
  "Arial",
  "Arial Narrow",
  "Aptos",
  "Calibri",
  "Cambria",
  "Candara",
  "Century Gothic",
  "Consolas",
  "Courier New",
  "Georgia",
  "Helvetica",
  "Lucida Console",
  "Segoe UI",
  "Tahoma",
  "Times New Roman",
  "Trebuchet MS",
  "Verdana",
];

const pxPerMm = 4;
const SAMPLE_CHECK_DATE = new Date(2026, 4, 12);

const numberOrZero = (value) => {
  const num = Number(value);
  return Number.isNaN(num) ? 0 : num;
};

const boolValue = (value) => {
  if (typeof value === "boolean") return value;
  if (value === 1 || value === "1") return true;
  if (value === 0 || value === "0") return false;
  return Boolean(value);
};

const safeArray = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const safeObject = (value) => {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed
        : {};
    } catch {
      return {};
    }
  }
  return {};
};

const extractResultArray = (response) => {
  const raw =
    response?.data?.data?.[0]?.result ??
    response?.data?.result ??
    response?.data?.data ??
    [];

  if (Array.isArray(raw)) return raw;

  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw || "[]");
      return Array.isArray(parsed) ? parsed : parsed ? [parsed] : [];
    } catch {
      return [];
    }
  }

  return raw ? [raw] : [];
};

const extractResultObject = (response) => {
  const raw =
    response?.data?.data?.[0]?.result ??
    response?.data?.result ??
    response?.data?.data?.[0] ??
    response?.data ??
    {};

  if (typeof raw === "string") {
    try {
      return JSON.parse(raw || "{}");
    } catch {
      return {};
    }
  }

  return safeObject(raw);
};

const getDefaultTemplateFields = () =>
  DEFAULT_TEMPLATE_FIELDS.map((field) => ({ ...field }));

const normalizeTemplateRow = (item = {}) => ({
  templateId: item.templateId || item.template_id || "",
  templateCode: item.templateCode || item.template_code || "",
  templateName: item.templateName || item.template_name || "",
  description: item.description || "",
  checkSize: `${Number(item.paperWidth ?? item.paper_width ?? 203.2).toFixed(2)} x ${Number(
    item.paperHeight ?? item.paper_height ?? 88.9
  ).toFixed(2)}`,
  paperWidth: item.paperWidth ?? item.paper_width ?? 203.2,
  paperHeight: item.paperHeight ?? item.paper_height ?? 88.9,
  unitCode: item.unitCode || item.unit_code || "mm",
  offsetX: item.offsetX ?? item.offset_x ?? 0,
  offsetY: item.offsetY ?? item.offset_y ?? 0,
  isActive: boolValue(item.isActive ?? item.is_active ?? true),
  status: boolValue(item.isActive ?? item.is_active ?? true) ? "Active" : "Inactive",
  userCode: item.userCode || item.user_code || "",
  registeredDate: item.registeredDate || item.registered_date || "",
  lastUpdatedBy: item.lastUpdatedBy || item.last_updated_by || "",
  lastUpdatedDate: item.lastUpdatedDate || item.last_updated_date || "",
});

const normalizeFieldRow = (item = {}, index = 0) => {
  const defaultField =
    DEFAULT_TEMPLATE_FIELDS.find(
      (field) => field.fieldKey === (item.fieldKey || item.field_key)
    ) || DEFAULT_TEMPLATE_FIELDS[index] || DEFAULT_TEMPLATE_FIELDS[0];

  return {
    ...defaultField,
    rowId: item.rowId || item.row_id || "",
    fieldKey: item.fieldKey || item.field_key || defaultField.fieldKey,
    fieldLabel: item.fieldLabel || item.field_label || defaultField.fieldLabel,
    staticValue: item.staticValue ?? item.static_value ?? defaultField.staticValue ?? "",
    sampleValue: defaultField.sampleValue,
    xPosition: item.xPosition ?? item.x_position ?? defaultField.xPosition,
    yPosition: item.yPosition ?? item.y_position ?? defaultField.yPosition,
    fieldWidth: item.fieldWidth ?? item.field_width ?? defaultField.fieldWidth,
    fieldHeight: item.fieldHeight ?? item.field_height ?? defaultField.fieldHeight,
    fontName: item.fontName || item.font_name || item.fontFamily || defaultField.fontName,
    fontSize: item.fontSize ?? item.font_size ?? defaultField.fontSize,
    fontStyle: item.fontStyle || item.font_style || defaultField.fontStyle,
    fontWeight: item.fontWeight || item.font_weight || defaultField.fontWeight,
    textAlign: item.textAlign || item.text_align || defaultField.textAlign,
    formatType: item.formatType ?? item.format_type ?? defaultField.formatType,
    rotationAngle: item.rotationAngle ?? item.rotation_angle ?? defaultField.rotationAngle,
    isVisible: boolValue(item.isVisible ?? item.is_visible ?? defaultField.isVisible),
    sortOrder: item.sortOrder ?? item.sort_order ?? index + 1,
  };
};

const normalizeBankRow = (item = {}, index = 0) => {
  const isMapped = boolValue(item.isMapped ?? item.is_mapped ?? false);

  return {
    id: item.bankCode || item.bank_code || `BANK-${index}`,
    bankCode: item.bankCode || item.bank_code || "",
    bankName: item.bankName || item.bank_name || item.bankBranch || item.bank_branch || "",
    bankAcctNo: item.bankAcctNo || item.bankacct_no || "",
    bankBranch: item.bankBranch || item.bank_branch || "",
    currCode: item.currCode || item.curr_code || "",
    acctCode: item.acctCode || item.acct_code || "",
    templateId: isMapped ? item.templateId || item.template_id || "" : "",
    templateCode: isMapped ? item.templateCode || item.template_code || "" : "",
    templateName: isMapped ? item.templateName || item.template_name || "" : "",
    isMapped,
  };
};

const applyDigitTokens = (text, token, sourceDigits) => {
  let index = 0;
  return text.replace(new RegExp(token, "g"), () => {
    const value = sourceDigits[index] ?? sourceDigits[sourceDigits.length - 1] ?? "";
    index += 1;
    return value;
  });
};

const formatCheckDate = (formatType = "MM/DD/YYYY") => {
  const format = String(formatType || "MM/DD/YYYY");
  const month = String(SAMPLE_CHECK_DATE.getMonth() + 1).padStart(2, "0");
  const day = String(SAMPLE_CHECK_DATE.getDate()).padStart(2, "0");
  const year = String(SAMPLE_CHECK_DATE.getFullYear());
  const shortMonth = SAMPLE_CHECK_DATE.toLocaleString("en-US", { month: "short" });
  const longMonth = SAMPLE_CHECK_DATE.toLocaleString("en-US", { month: "long" });

  let output = format;
  output = output.replace(/MMMM/g, longMonth);
  output = output.replace(/MMM/g, shortMonth);
  output = output.replace(/YYYY/g, year);
  output = output.replace(/YY/g, year.slice(-2));
  output = output.replace(/MM/g, month);
  output = output.replace(/DD/g, day);
  output = applyDigitTokens(output, "M", month);
  output = applyDigitTokens(output, "D", day);
  output = applyDigitTokens(output, "Y", year);

  return output;
};

const getFieldPreviewValue = (field) => {
  if (!field) return "";
  if (field.fieldKey === "checkDate") return formatCheckDate(field.formatType);
  if (field.staticValue) return field.staticValue;
  return field.sampleValue || "";
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const formatDateTimeAmPm = (value) => {
  if (!value) return "";

  const normalized = String(value).trim();
  const parsed = new Date(normalized.includes("T") ? normalized : normalized.replace(" ", "T"));

  if (Number.isNaN(parsed.getTime())) return normalized;

  return parsed.toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

export default function CheckTemplateSetup() {
  const { currentUserRow } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("templateList");
  const [header, setHeader] = useState(DEFAULT_HEADER);
  const [fields, setFields] = useState(getDefaultTemplateFields());
  const [selectedFieldKey, setSelectedFieldKey] = useState("checkDate");
  const [selectedTemplateRow, setSelectedTemplateRow] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [dragState, setDragState] = useState(null);

  const canvasRef = useRef(null);

  const templatesQuery = useQuery({
    queryKey: ["checkTemplates"],
    queryFn: async () => {
      const response = await apiClient.get(ENDPOINTS.loadTemplates);
      return extractResultArray(response).map(normalizeTemplateRow);
    },
  });

  const bankMappingQuery = useQuery({
    queryKey: ["bankCheckTemplateMapping"],
    queryFn: async () => {
      const response = await apiClient.get(ENDPOINTS.loadBankMapping);
      return extractResultArray(response).map(normalizeBankRow);
    },
  });

  const templates = templatesQuery.data || [];
  const bankAccounts = bankMappingQuery.data || [];
  const isPageLoading =
    templatesQuery.isLoading ||
    templatesQuery.isFetching ||
    bankMappingQuery.isLoading ||
    bankMappingQuery.isFetching;

  const selectedField = useMemo(
    () => fields.find((field) => field.fieldKey === selectedFieldKey) || fields[0],
    [fields, selectedFieldKey]
  );

  const templateOptions = useMemo(
    () =>
      templates.map((item) => ({
        value: item.templateId,
        label: `${item.templateName} (${item.templateCode})`,
      })),
    [templates]
  );

  const getActiveUserCode = () =>
    currentUserRow?.userCode || currentUserRow?.user_code || "ADMIN";

  const setHeaderField = (key, value) => {
    setHeader((prev) => ({ ...prev, [key]: value }));
  };

  const updateSelectedField = (key, value) => {
    setFields((prev) =>
      prev.map((field) =>
        field.fieldKey === selectedFieldKey ? { ...field, [key]: value } : field
      )
    );
  };

  const updateFieldPosition = (fieldKey, xPosition, yPosition) => {
    const maxX = Math.max(numberOrZero(header.paperWidth), 0);
    const maxY = Math.max(numberOrZero(header.paperHeight), 0);

    setFields((prev) =>
      prev.map((field) => {
        if (field.fieldKey !== fieldKey) return field;

        const safeX = Math.min(
          Math.max(numberOrZero(xPosition), 0),
          Math.max(maxX - numberOrZero(field.fieldWidth), 0)
        );
        const safeY = Math.min(
          Math.max(numberOrZero(yPosition), 0),
          Math.max(maxY - numberOrZero(field.fieldHeight), 0)
        );

        return {
          ...field,
          xPosition: Number(safeX.toFixed(2)),
          yPosition: Number(safeY.toFixed(2)),
        };
      })
    );
  };

  const handleFieldMouseDown = (event, field) => {
    if (previewMode) return;

    event.preventDefault();
    event.stopPropagation();
    setSelectedFieldKey(field.fieldKey);

    const rect = event.currentTarget.getBoundingClientRect();
    setDragState({
      fieldKey: field.fieldKey,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    });
  };

  const handleCanvasMouseMove = (event) => {
    if (!dragState || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const xPosition =
      (event.clientX - rect.left - dragState.offsetX) / pxPerMm -
      numberOrZero(header.offsetX);
    const yPosition =
      (event.clientY - rect.top - dragState.offsetY) / pxPerMm -
      numberOrZero(header.offsetY);

    updateFieldPosition(dragState.fieldKey, xPosition, yPosition);
  };

  const handleCanvasMouseUp = () => {
    setDragState(null);
  };

  const loadTemplateToDesigner = async (row) => {
    if (!row?.templateId) return;

    try {
      const response = await apiClient.get(ENDPOINTS.getTemplate, {
        params: { TEMPLATE_ID: row.templateId },
      });

      const parsed = extractResultObject(response);
      const normalizedHeader = normalizeTemplateRow(parsed);
      const detailRows = safeArray(parsed.dt1).map(normalizeFieldRow);

      setSelectedTemplateRow(normalizedHeader);
      setHeader({
        templateId: normalizedHeader.templateId,
        templateCode: normalizedHeader.templateCode,
        templateName: normalizedHeader.templateName,
        description: normalizedHeader.description,
        paperWidth: normalizedHeader.paperWidth,
        paperHeight: normalizedHeader.paperHeight,
        unitCode: normalizedHeader.unitCode,
        offsetX: normalizedHeader.offsetX,
        offsetY: normalizedHeader.offsetY,
        isActive: normalizedHeader.isActive,
      });
      setFields(detailRows.length ? detailRows : getDefaultTemplateFields());
      setSelectedFieldKey("checkDate");
      setActiveTab("designer");
    } catch (error) {
      useSwalErrorAlert(
        "Retrieve Failed",
        error?.response?.data?.message ||
          error?.message ||
          "Failed to load selected check template."
      );
    }
  };

  const handleNewTemplate = () => {
    const nextNo = templates.length + 1;

    setSelectedTemplateRow(null);
    setHeader({
      ...DEFAULT_HEADER,
      templateCode: `NEW_CHK_${String(nextNo).padStart(3, "0")}`,
      templateName: "New Check Template",
      isActive: true,
    });
    setFields(getDefaultTemplateFields());
    setSelectedFieldKey("checkDate");
    setActiveTab("designer");
  };

  const handleDuplicateTemplate = () => {
    setSelectedTemplateRow(null);
    setHeader((prev) => ({
      ...prev,
      templateId: "",
      templateCode: prev.templateCode ? `${prev.templateCode}_COPY` : "COPY_CHK",
      templateName: prev.templateName ? `${prev.templateName} - Copy` : "Check Template - Copy",
      isActive: true,
    }));

    useSwalSuccessAlert(
      "Duplicated",
      "Template copied on screen. Review the Template Code, then click Save."
    );
  };

  const buildTemplatePayload = () => ({
    json_data: {
      templateId: header.templateId || "",
      templateCode: header.templateCode || "",
      templateName: header.templateName || "",
      description: header.description || "",
      paperWidth: numberOrZero(header.paperWidth) || 203.2,
      paperHeight: numberOrZero(header.paperHeight) || 88.9,
      unitCode: header.unitCode || "mm",
      offsetX: numberOrZero(header.offsetX),
      offsetY: numberOrZero(header.offsetY),
      isActive: header.isActive ? 1 : 0,
      userCode: getActiveUserCode(),
      dt1: fields.map((field, index) => ({
        fieldKey: field.fieldKey,
        fieldLabel: field.fieldLabel,
        staticValue: field.staticValue || "",
        xPosition: numberOrZero(field.xPosition),
        yPosition: numberOrZero(field.yPosition),
        fieldWidth: numberOrZero(field.fieldWidth),
        fieldHeight: numberOrZero(field.fieldHeight),
        fontName: field.fontName || "Arial Narrow",
        fontSize: numberOrZero(field.fontSize) || 10,
        fontStyle: field.fontStyle || "normal",
        fontWeight: String(field.fontWeight || "400"),
        textAlign: field.textAlign || "left",
        formatType: field.formatType || "",
        rotationAngle: numberOrZero(field.rotationAngle),
        isVisible: field.isVisible ? 1 : 0,
        sortOrder: field.sortOrder || index + 1,
      })),
    },
  });

  const saveTemplateMutation = useMutation({
    mutationFn: async () => {
      if (!header.templateCode || !header.templateName) {
        throw new Error("Template Code and Template Name are required.");
      }

      const payload = buildTemplatePayload();

      const response = await apiClient.post(ENDPOINTS.saveTemplate, {
        json_data: JSON.stringify(payload),
      });

      return response.data;
    },
    onSuccess: async (response) => {
      const firstRow = response?.data?.[0] || response?.data?.data?.[0] || {};
      const errorCount = Number(firstRow?.errorcount || 0);
      const errorMsg = firstRow?.errormsg || "";

      if (errorCount > 0) {
        useSwalErrorAlert("Save Failed", errorMsg || "Unable to save template.");
        return;
      }

      const savedArray = safeArray(firstRow?.result);
      const saved = normalizeTemplateRow(savedArray[0] || {});

      if (saved.templateId) {
        setHeader((prev) => ({ ...prev, templateId: saved.templateId }));
        setSelectedTemplateRow(saved);
      }

      useSwalSuccessAlert("Saved", "Check template saved successfully.");

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["checkTemplates"] }),
        queryClient.invalidateQueries({ queryKey: ["bankCheckTemplateMapping"] }),
      ]);
    },
    onError: (error) => {
      useSwalErrorAlert(
        "Save Failed",
        error?.response?.data?.message || error?.message || "Failed to save check template."
      );
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async ({ templateId }) => {
      const response = await apiClient.post(ENDPOINTS.deleteTemplate, {
        json_data: {
          templateId,
          userCode: getActiveUserCode(),
        },
      });

      return response.data;
    },
    onSuccess: async (response) => {
      const firstRow = response?.data?.[0] || response?.data?.data?.[0] || {};
      const errorCount = Number(firstRow?.errorcount || 0);
      const errorMsg = firstRow?.errormsg || "";

      if (errorCount > 0) {
        useSwalErrorAlert("Delete Failed", errorMsg || "Unable to delete template.");
        return;
      }

      useSwalSuccessAlert("Deleted", "Check template deleted successfully.");
      setSelectedTemplateRow(null);
      setHeader(DEFAULT_HEADER);
      setFields(getDefaultTemplateFields());
      setSelectedFieldKey("checkDate");

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["checkTemplates"] }),
        queryClient.invalidateQueries({ queryKey: ["bankCheckTemplateMapping"] }),
      ]);
    },
    onError: (error) => {
      useSwalErrorAlert(
        "Delete Failed",
        error?.response?.data?.message || error?.message || "Failed to delete check template."
      );
    },
  });

  const saveBankMappingMutation = useMutation({
    mutationFn: async ({ bankCode, templateId }) => {
      const response = await apiClient.post(ENDPOINTS.saveBankMapping, {
        json_data: {
          bankCode,
          templateId,
          userCode: getActiveUserCode(),
        },
      });

      return response.data;
    },
    onSuccess: async (response) => {
      const firstRow = response?.data?.[0] || response?.data?.data?.[0] || {};
      const errorCount = Number(firstRow?.errorcount || 0);
      const errorMsg = firstRow?.errormsg || "";

      if (errorCount > 0) {
        useSwalErrorAlert("Mapping Failed", errorMsg || "Unable to save mapping.");
        return;
      }

      useSwalSuccessAlert("Saved", "Bank check template mapping saved successfully.");
      await queryClient.invalidateQueries({ queryKey: ["bankCheckTemplateMapping"] });
    },
    onError: (error) => {
      useSwalErrorAlert(
        "Mapping Failed",
        error?.response?.data?.message || error?.message || "Failed to save bank mapping."
      );
    },
  });

  const removeBankMappingMutation = useMutation({
    mutationFn: async ({ bankCode }) => {
      const response = await apiClient.post(ENDPOINTS.removeBankMapping, {
        json_data: {
          bankCode,
          userCode: getActiveUserCode(),
        },
      });

      return response.data;
    },
    onSuccess: async () => {
      useSwalSuccessAlert("Removed", "Bank check template mapping removed successfully.");
      await queryClient.invalidateQueries({ queryKey: ["bankCheckTemplateMapping"] });
    },
    onError: (error) => {
      useSwalErrorAlert(
        "Remove Failed",
        error?.response?.data?.message || error?.message || "Failed to remove bank mapping."
      );
    },
  });

  const handleSave = () => {
    if (activeTab === "templateList") {
      setActiveTab("designer");
      return;
    }

    if (activeTab === "bankMapping") {
      useSwalSuccessAlert(
        "Bank Mapping",
        "Mapping is optional. Only banks with selected templates will be used for check printing."
      );
      return;
    }

    saveTemplateMutation.mutate();
  };

  const handleReset = async () => {
    const result = await Swal.fire({
      title: "Reset Template?",
      text: "This will reset the current template fields to the default sample positions.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, Reset",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#2563eb",
    });

    if (!result.isConfirmed) return;
    setFields(getDefaultTemplateFields());
    setSelectedFieldKey("checkDate");
  };

  const handleBankTemplateChange = (bankCode, templateId) => {
    if (!bankCode) return;

    if (!templateId) {
      removeBankMappingMutation.mutate({ bankCode });
      return;
    }

    saveBankMappingMutation.mutate({ bankCode, templateId });
  };

  const handleDeleteTemplate = async (row) => {
    const templateId = row?.templateId;
    if (!templateId) return;

    const usedMappings = bankAccounts.filter(
      (bank) => String(bank.templateId || "") === String(templateId)
    );

    if (usedMappings.length > 0) {
      useSwalErrorAlert(
        "Template In Use",
        `This template is assigned to ${usedMappings.length} bank mapping(s). Remove the mapping before deleting.`
      );
      return;
    }

    const result = await Swal.fire({
      title: "Delete Template?",
      text: `Delete ${row.templateName || row.templateCode || "this template"}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, Delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc2626",
    });

    if (!result.isConfirmed) return;
    deleteTemplateMutation.mutate({ templateId });
  };

  const handleTestPrint = () => {
    const paperWidth = numberOrZero(header.paperWidth) || 203.2;
    const paperHeight = numberOrZero(header.paperHeight) || 88.9;
    const offsetX = numberOrZero(header.offsetX);
    const offsetY = numberOrZero(header.offsetY);

    const printFields = fields
      .filter((field) => field.isVisible)
      .map((field) => {
        const value = escapeHtml(getFieldPreviewValue(field));
        const x = numberOrZero(field.xPosition) + offsetX;
        const y = numberOrZero(field.yPosition) + offsetY;
        const width = numberOrZero(field.fieldWidth);
        const height = numberOrZero(field.fieldHeight);
        const fontSize = numberOrZero(field.fontSize) || 10;
        const fontWeight = escapeHtml(field.fontWeight || "400");
        const fontStyle = escapeHtml(field.fontStyle || "normal");
        const fontFamily = escapeHtml(field.fontName || "Arial Narrow");
        const textAlign = escapeHtml(field.textAlign || "left");
        const rotationAngle = numberOrZero(field.rotationAngle);

        return `
          <div
            class="check-field"
            style="
              left: ${x}mm;
              top: ${y}mm;
              width: ${width}mm;
              height: ${height}mm;
              font-size: ${fontSize}pt;
              font-weight: ${fontWeight};
              font-style: ${fontStyle};
              font-family: '${fontFamily}', Arial, sans-serif;
              text-align: ${textAlign};
              transform: rotate(${rotationAngle}deg);
              transform-origin: left top;
            "
          >${value}</div>
        `;
      })
      .join("");

    const printWindow = window.open("", "_blank", "width=1000,height=600");

    if (!printWindow) {
      useSwalErrorAlert(
        "Popup Blocked",
        "Please allow popups to open the check print preview."
      );
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Check Test Print</title>
          <style>
            @page { margin: 0; size: ${paperWidth}mm ${paperHeight}mm; }
            html, body {
              margin: 0;
              padding: 0;
              width: ${paperWidth}mm;
              height: ${paperHeight}mm;
              background: white;
              overflow: hidden;
            }
            .check-print-area {
              position: relative;
              width: ${paperWidth}mm;
              height: ${paperHeight}mm;
              background: white;
              overflow: hidden;
            }
            .check-field {
              position: absolute;
              box-sizing: border-box;
              white-space: pre;
              line-height: 1.1;
              color: black;
              border: 0;
              background: transparent;
              overflow: hidden;
            }
          </style>
        </head>
        <body>
          <div id="check-print-area" class="check-print-area">
            ${printFields}
          </div>
          <script>
            window.onload = function () {
              window.focus();
              setTimeout(function () { window.print(); }, 250);
            };
          <\/script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  const templateColumns = useMemo(
    () => [
      {
        key: "__actions",
        label: "Action",
        width: 105,
        sortable: false,
        filterable: false,
        render: (row) => (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                loadTemplateToDesigner(row);
              }}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-blue-100 bg-blue-50 text-blue-600 hover:border-blue-600 hover:bg-blue-600 hover:text-white"
              title="Edit Template"
            >
              <Pencil size={14} />
            </button>

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                handleDeleteTemplate(row);
              }}
              disabled={deleteTemplateMutation.isPending}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-red-100 bg-red-50 text-red-600 hover:border-red-600 hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              title="Delete Template"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ),
      },
      { key: "templateCode", label: "Template Code", sortable: true, width: 140 },
      { key: "templateName", label: "Template Name", sortable: true, width: 220 },
      { key: "checkSize", label: "Check Size (mm)", sortable: true, width: 140 },
      { key: "unitCode", label: "Unit", sortable: true, width: 80 },
      {
        key: "status",
        label: "Status",
        sortable: true,
        width: 100,
        render: (row) => (
          <span
            className={`rounded-full px-2 py-1 text-[10px] font-bold ${
              row.status === "Active"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {row.status}
          </span>
        ),
      },
      {
        key: "lastUpdatedDate",
        label: "Last Updated Date",
        sortable: true,
        width: 190,
        render: (row) => formatDateTimeAmPm(row.lastUpdatedDate),
      },
    ],
    [bankAccounts, deleteTemplateMutation.isPending]
  );

  const bankMappingColumns = useMemo(
    () => [
      { key: "bankCode", label: "Bank Code", sortable: true, width: 130 },
      {
        key: "bankName",
        label: "Bank Branch / Name",
        sortable: true,
        width: 220,
        render: (row) => row.bankName || row.bankBranch || row.bankCode,
      },
      { key: "bankAcctNo", label: "Account No.", sortable: true, width: 160 },
      { key: "currCode", label: "Currency", sortable: true, width: 100 },
      {
        key: "templateId",
        label: "Check Template",
        sortable: true,
        width: 260,
        render: (row) => (
          <select
            value={row.isMapped ? row.templateId || "" : ""}
            onChange={(event) =>
              handleBankTemplateChange(row.bankCode, event.target.value)
            }
            disabled={saveBankMappingMutation.isPending || removeBankMappingMutation.isPending}
            className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-[12px] outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100"
          >
            <option value="">-- No Template Assigned --</option>
            {templateOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ),
      },
      {
        key: "isMapped",
        label: "Status",
        sortable: true,
        width: 110,
        render: (row) => (
          <span
            className={`rounded-full px-2 py-1 text-[10px] font-bold ${
              row.isMapped
                ? "bg-green-100 text-green-700"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {row.isMapped ? "Mapped" : "Optional"}
          </span>
        ),
      },
    ],
    [
      removeBankMappingMutation.isPending,
      saveBankMappingMutation.isPending,
      templateOptions,
    ]
  );

  const renderHeaderTabs = () => (
    <div className="flex w-full md:justify-center">
      <div className="w-full md:w-auto">
        <div className="no-scrollbar flex flex-nowrap overflow-x-auto border-b border-gray-200 whitespace-nowrap">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`shrink-0 border-b-2 px-3 py-2 text-[12px] font-bold transition-all ${
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
  );

  const renderActionButtons = () => (
    <div className="flex flex-nowrap items-center justify-end gap-2 text-xs whitespace-nowrap">
      {activeTab === "templateList" && (
        <button
          type="button"
          onClick={handleNewTemplate}
          disabled={isPageLoading}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-600 text-[11px] font-medium text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-3"
          title="New"
        >
          <Plus size={14} />
          <span className="hidden sm:inline">New</span>
        </button>
      )}

      {activeTab === "designer" && (
        <>
          <button
            type="button"
            onClick={handleDuplicateTemplate}
            disabled={saveTemplateMutation.isPending}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-600 text-[11px] font-medium text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-3"
            title="Duplicate"
          >
            <Copy size={14} />
            <span className="hidden sm:inline">Duplicate</span>
          </button>

          <button
            type="button"
            onClick={handleTestPrint}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-600 text-[11px] font-medium text-white transition-all hover:bg-blue-700 sm:w-auto sm:px-3"
            title="Test Print"
          >
            <Printer size={14} />
            <span className="hidden sm:inline">Test Print</span>
          </button>
        </>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={saveTemplateMutation.isPending || isPageLoading}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-600 text-[11px] font-medium text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-3"
        title="Save"
      >
        <Save size={14} />
        <span className="hidden sm:inline">Save</span>
      </button>

      <button
        type="button"
        onClick={handleReset}
        disabled={saveTemplateMutation.isPending}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-600 text-[11px] font-medium text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-3"
        title="Reset"
      >
        <RefreshCcw size={14} />
        <span className="hidden sm:inline">Reset</span>
      </button>
    </div>
  );

  const renderTemplateListTab = () => (
    <div className="global-tran-table-main-div-ui relative z-0 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <SearchGlobalReferenceTable
        docType={`${DOC_TYPE}TemplateList`}
        columns={templateColumns}
        data={templates}
        itemsPerPage={20}
        initialState={{ autoFillGrid: "True" }}
        showFilters
        showGroupBy={false}
        showGlobalSearch
        selectedRow={selectedTemplateRow}
        onRowClick={(row) => {
          setSelectedTemplateRow(row);
          loadTemplateToDesigner(row);
        }}
        isLoading={templatesQuery.isLoading}
        isFetching={templatesQuery.isFetching}
      />
    </div>
  );

  const renderBankMappingTab = () => (
    <div className="global-tran-table-main-div-ui relative z-0 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <SearchGlobalReferenceTable
        docType={`${DOC_TYPE}BankMapping`}
        columns={bankMappingColumns}
        data={bankAccounts}
        itemsPerPage={20}
        initialState={{ autoFillGrid: "True" }}
        showFilters
        showGroupBy={false}
        showGlobalSearch
        selectedRow={null}
        onRowClick={() => {}}
        isLoading={bankMappingQuery.isLoading}
        isFetching={bankMappingQuery.isFetching}
      />
    </div>
  );

  const renderDesignerCanvas = () => (
    <div className="overflow-auto rounded-xl border border-slate-200 bg-slate-100 p-4">
      <div
        ref={canvasRef}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseUp}
        id="check-print-area"
        className="check-print-area relative mx-auto border border-slate-400 bg-white shadow-sm print:shadow-none"
        style={{
          width: `${numberOrZero(header.paperWidth) * pxPerMm}px`,
          height: `${numberOrZero(header.paperHeight) * pxPerMm}px`,
          backgroundImage:
            "radial-gradient(circle, rgba(148,163,184,0.35) 1px, transparent 1px)",
          backgroundSize: "8px 8px",
        }}
      >
        {/* <div className="absolute left-[12px] top-[115px] text-[11px] font-bold text-slate-600">
          PAY TO THE
          <br />
          ORDER OF
        </div>
        <div className="absolute right-[42px] top-[88px] text-[10px] font-bold text-slate-600">
          DATE
        </div> */}
        {/* <div className="absolute bottom-[32px] left-[30px] text-[17px] tracking-[5px] text-slate-600">
          ❞1234567890❞ &nbsp;&nbsp; 0102034567❞ &nbsp;&nbsp; 1001
        </div> */}

        {fields
          .filter((field) => field.isVisible)
          .map((field) => {
            const x = (numberOrZero(field.xPosition) + numberOrZero(header.offsetX)) * pxPerMm;
            const y = (numberOrZero(field.yPosition) + numberOrZero(header.offsetY)) * pxPerMm;
            const width = numberOrZero(field.fieldWidth) * pxPerMm;
            const height = numberOrZero(field.fieldHeight) * pxPerMm;
            const meta = FIELD_OPTIONS.find((item) => item.fieldKey === field.fieldKey);

            return (
              <button
                key={field.fieldKey}
                type="button"
                onClick={() => setSelectedFieldKey(field.fieldKey)}
                onMouseDown={(event) => handleFieldMouseDown(event, field)}
                className={`check-field absolute flex cursor-move select-none items-center overflow-hidden border border-dashed px-2 transition-all ${
                  meta?.colorClass || "border-slate-400 bg-white text-slate-700"
                } ${selectedFieldKey === field.fieldKey ? "ring-2 ring-blue-500" : ""}`}
                style={{
                  left: x,
                  top: y,
                  width,
                  height,
                  fontSize: `${numberOrZero(field.fontSize)}pt`,
                  fontWeight: field.fontWeight,
                  fontStyle: field.fontStyle || "normal",
                  fontFamily: field.fontName || "Arial Narrow",
                  justifyContent:
                    field.textAlign === "center"
                      ? "center"
                      : field.textAlign === "right"
                        ? "flex-end"
                        : "flex-start",
                  whiteSpace: "pre",
                  transform: `rotate(${numberOrZero(field.rotationAngle)}deg)`,
                  transformOrigin: "left top",
                }}
                title={`${field.fieldLabel} (${field.xPosition}, ${field.yPosition})`}
              >
                {getFieldPreviewValue(field)}
              </button>
            );
          })}
      </div>
    </div>
  );

  const renderDesignerTab = () => (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[225px_minmax(0,1fr)_280px]">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 border-b border-slate-200 pb-2">
          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-600">
            Template Header
          </h3>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-slate-600">
              Template Code
            </label>
            <input
              value={header.templateCode}
              onChange={(event) => setHeaderField("templateCode", event.target.value)}
              className="h-8 w-full rounded-md border border-slate-300 px-2 text-[12px] outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-semibold text-slate-600">
              Template Name
            </label>
            <input
              value={header.templateName}
              onChange={(event) => setHeaderField("templateName", event.target.value)}
              className="h-8 w-full rounded-md border border-slate-300 px-2 text-[12px] outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-semibold text-slate-600">
              Description
            </label>
            <input
              value={header.description || ""}
              onChange={(event) => setHeaderField("description", event.target.value)}
              className="h-8 w-full rounded-md border border-slate-300 px-2 text-[12px] outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                Width (mm)
              </label>
              <input
                type="number"
                value={header.paperWidth}
                onChange={(event) => setHeaderField("paperWidth", event.target.value)}
                className="h-8 w-full rounded-md border border-slate-300 px-2 text-[12px] outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                Height (mm)
              </label>
              <input
                type="number"
                value={header.paperHeight}
                onChange={(event) => setHeaderField("paperHeight", event.target.value)}
                className="h-8 w-full rounded-md border border-slate-300 px-2 text-[12px] outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                Offset X
              </label>
              <input
                type="number"
                value={header.offsetX}
                onChange={(event) => setHeaderField("offsetX", event.target.value)}
                className="h-8 w-full rounded-md border border-slate-300 px-2 text-[12px] outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                Offset Y
              </label>
              <input
                type="number"
                value={header.offsetY}
                onChange={(event) => setHeaderField("offsetY", event.target.value)}
                className="h-8 w-full rounded-md border border-slate-300 px-2 text-[12px] outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={Boolean(header.isActive)}
              onChange={(event) => setHeaderField("isActive", event.target.checked)}
            />
            Active Template
          </label>
        </div>

        <div className="mt-4 border-t border-slate-200 pt-3">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-600">
            Printable Fields
          </h3>
          <div className="space-y-2">
            {fields.map((field, index) => {
              const meta = FIELD_OPTIONS.find((item) => item.fieldKey === field.fieldKey);
              return (
                <button
                  key={field.fieldKey}
                  type="button"
                  onClick={() => setSelectedFieldKey(field.fieldKey)}
                  className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-[12px] font-semibold ${
                    selectedFieldKey === field.fieldKey
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${meta?.colorClass}`}>
                      {index + 1}
                    </span>
                    {field.fieldLabel}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {field.isVisible ? "Visible" : "Hidden"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              Check Template Designer
            </h3>
            <p className="text-[11px] text-slate-500">
              Click or drag a field on the check, then fine-tune its X/Y position and rotation on the right panel.
            </p>
          </div>

          <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${header.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
            {header.isActive ? "Active" : "Inactive"}
          </span>
        </div>

        {renderDesignerCanvas()}

        <div className="mt-3 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-600 md:grid-cols-3">
          <div>
            <span className="font-bold">Template:</span> {header.templateName || "New Template"}
          </div>
          <div>
            <span className="font-bold">Check Size:</span> {header.paperWidth} x {header.paperHeight} mm
          </div>
          <div>
            <span className="font-bold">Selected Field:</span> {selectedField?.fieldLabel}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 border-b border-slate-200 pb-2">
          <Settings size={15} className="text-blue-600" />
          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-600">
            Field Properties
          </h3>
        </div>

        {selectedField && (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                Field
              </label>
              <input
                value={selectedField.fieldLabel}
                readOnly
                className="h-8 w-full rounded-md border border-blue-200 bg-blue-50 px-2 text-[12px] font-semibold text-blue-700 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                  X Position
                </label>
                <input
                  type="number"
                  value={selectedField.xPosition}
                  onChange={(event) => updateSelectedField("xPosition", event.target.value)}
                  className="h-8 w-full rounded-md border border-slate-300 px-2 text-[12px] outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                  Y Position
                </label>
                <input
                  type="number"
                  value={selectedField.yPosition}
                  onChange={(event) => updateSelectedField("yPosition", event.target.value)}
                  className="h-8 w-full rounded-md border border-slate-300 px-2 text-[12px] outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                  Width
                </label>
                <input
                  type="number"
                  value={selectedField.fieldWidth}
                  onChange={(event) => updateSelectedField("fieldWidth", event.target.value)}
                  className="h-8 w-full rounded-md border border-slate-300 px-2 text-[12px] outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                  Height
                </label>
                <input
                  type="number"
                  value={selectedField.fieldHeight}
                  onChange={(event) => updateSelectedField("fieldHeight", event.target.value)}
                  className="h-8 w-full rounded-md border border-slate-300 px-2 text-[12px] outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                Font
              </label>
              <select
                value={selectedField.fontName || "Arial Narrow"}
                onChange={(event) => updateSelectedField("fontName", event.target.value)}
                className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-[12px] outline-none focus:border-blue-500"
              >
                {FONT_FAMILY_OPTIONS.map((fontName) => (
                  <option key={fontName} value={fontName}>
                    {fontName}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-[64px_minmax(92px,1fr)_minmax(84px,0.9fr)] gap-2">
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                  Font Size
                </label>
                <input
                  type="number"
                  value={selectedField.fontSize}
                  onChange={(event) => updateSelectedField("fontSize", event.target.value)}
                  className="h-8 w-full rounded-md border border-slate-300 px-2 text-[12px] outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                  Font Weight
                </label>
                <select
                  value={selectedField.fontWeight}
                  onChange={(event) => updateSelectedField("fontWeight", event.target.value)}
                  className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-[12px] outline-none focus:border-blue-500"
                >
                  <option value="400">Normal</option>
                  <option value="500">Medium</option>
                  <option value="600">Semi Bold</option>
                  <option value="700">Bold</option>
                  <option value="800">Extra Bold</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                  Font Style
                </label>
                <select
                  value={selectedField.fontStyle || "normal"}
                  onChange={(event) => updateSelectedField("fontStyle", event.target.value)}
                  className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-[12px] outline-none focus:border-blue-500"
                >
                  <option value="normal">Regular</option>
                  <option value="italic">Italic</option>
                  <option value="oblique">Oblique</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                  Text Align
                </label>
                <select
                  value={selectedField.textAlign}
                  onChange={(event) => updateSelectedField("textAlign", event.target.value)}
                  className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-[12px] outline-none focus:border-blue-500"
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                  Rotate (deg)
                </label>
                <input
                  type="number"
                  value={selectedField.rotationAngle ?? 0}
                  onChange={(event) => updateSelectedField("rotationAngle", event.target.value)}
                  className="h-8 w-full rounded-md border border-slate-300 px-2 text-[12px] outline-none focus:border-blue-500"
                  placeholder="0"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                Format Type
              </label>

              {selectedField.fieldKey === "checkDate" ? (
                <>
                  <input
                    type="text"
                    list="check-date-format-options"
                    value={selectedField.formatType || ""}
                    onChange={(event) => updateSelectedField("formatType", event.target.value)}
                    placeholder="Example: MM/DD/YYYY or M M  D D   Y Y Y Y"
                    className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-[12px] outline-none focus:border-blue-500"
                  />
                  <datalist id="check-date-format-options">
                    {DATE_FORMAT_OPTIONS.map((format) => (
                      <option key={format} value={format} />
                    ))}
                  </datalist>
                  <div className="mt-1 rounded-md bg-slate-50 px-2 py-1 text-[10px] leading-4 text-slate-500">
                    Manual format is allowed. Multiple spaces are preserved in the check preview and print layout.
                  </div>
                </>
              ) : (
                <select
                  value={selectedField.formatType || "Text"}
                  onChange={(event) => updateSelectedField("formatType", event.target.value)}
                  className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-[12px] outline-none focus:border-blue-500"
                >
                  <option value="Text">Text</option>
                  <option value="Number">Number</option>
                  <option value="#,##0.00">#,##0.00</option>
                  <option value="Static Text">Static Text</option>
                </select>
              )}
            </div>

            {selectedField.fieldKey === "forAccountOnly" && (
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                  Static Value
                </label>
                <input
                  value={selectedField.staticValue || ""}
                  onChange={(event) => updateSelectedField("staticValue", event.target.value)}
                  className="h-8 w-full rounded-md border border-slate-300 px-2 text-[12px] outline-none focus:border-blue-500"
                />
              </div>
            )}

            <label className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={Boolean(selectedField.isVisible)}
                onChange={(event) => updateSelectedField("isVisible", event.target.checked)}
              />
              Visible on check print
            </label>

            <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-[11px] text-orange-700">
              Use small adjustments like 0.50 mm or 1.00 mm when aligning actual printed checks.
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderActiveTab = () => {
    if (activeTab === "templateList") return renderTemplateListTab();
    if (activeTab === "bankMapping") return renderBankMappingTab();
    if (activeTab === "designer") return renderDesignerTab();
    return null;
  };

  return (
    <div className="global-ref-main-div-ui bg-slate-50 print:bg-white print:p-0">
      <style>{`
        @media print {
          body { margin: 0 !important; }
          body * { visibility: hidden !important; }
          #check-print-area, #check-print-area * { visibility: visible !important; }
          #check-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background-image: none !important;
          }
          .no-print { display: none !important; }
          .check-field { white-space: pre !important; }
          @page { margin: 0; }
        }
      `}</style>

      {(saveTemplateMutation.isPending || deleteTemplateMutation.isPending || saveBankMappingMutation.isPending || removeBankMappingMutation.isPending) && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/50">
          <LoadingSpinner />
        </div>
      )}

      <div className="global-ref-header-ui no-print">
        <div className="flex w-full flex-col gap-3 md:grid md:grid-cols-3 md:items-center md:gap-0">
          <div className="flex w-full md:w-auto md:justify-start">
            <h1 className="global-ref-headertext-ui w-full truncate text-center md:w-auto md:text-left">
              Check Printing Template Setup
            </h1>
          </div>

          {renderHeaderTabs()}

          <div className="flex w-full md:w-auto md:justify-end">
            <div className="flex w-full flex-wrap items-center justify-center gap-2 md:w-auto md:justify-end">
              {renderActionButtons()}
            </div>
          </div>
        </div>
      </div>

      <div
        className="global-tran-tab-div-ui px-3 pb-4 pt-44 sm:px-4 sm:pb-5 sm:pt-32 md:mt-24 md:p-6 print:mt-0 print:p-0"
        style={{ minHeight: "calc(100vh - 150px)" }}
      >
        <div className="print:p-0">{renderActiveTab()}</div>
      </div>

      {previewMode && (
        <button
          type="button"
          onClick={() => setPreviewMode(false)}
          className="no-print fixed bottom-4 right-4 rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-lg hover:bg-slate-700"
        >
          Close Preview Mode
        </button>
      )}
    </div>
  );
}
