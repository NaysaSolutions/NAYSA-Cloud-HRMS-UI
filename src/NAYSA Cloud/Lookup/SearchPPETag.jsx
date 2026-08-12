import { useEffect, useMemo, useRef, useState } from "react";
import Barcode from "react-barcode";
import QRCode from "react-qr-code";
import { renderToStaticMarkup } from "react-dom/server";
import QRCodeImpl from "qr.js/lib/QRCode";
import ErrorCorrectLevel from "qr.js/lib/ErrorCorrectLevel";
import html2canvas from "html2canvas";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronDown,
  faCircleInfo,
  faCompress,
  faDownload,
  faExpand,
  faFloppyDisk,
  faFolderOpen,
  faHeading,
  faImage,
  faPrint,
  faRotateLeft,
  faRoute,
  faTag,
  faTimes,
  faUpload,
} from "@fortawesome/free-solid-svg-icons";
import { apiClient, postRequest } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";

const formatDisplayValue = (value, fallback = "-") => {
  const text = String(value ?? "").trim();
  return text || fallback;
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");


const qrErrorCorrectionLevelMap = {
  L: ErrorCorrectLevel.L,
  M: ErrorCorrectLevel.M,
  Q: ErrorCorrectLevel.Q,
  H: ErrorCorrectLevel.H,
};

const DottedQRCode = ({
  value,
  size = 112,
  bgColor = "#ffffff",
  fgColor = "#111827",
  level = "M",
  className = "",
  style = {},
}) => {
  const matrix = useMemo(() => {
    const qr = new QRCodeImpl(-1, qrErrorCorrectionLevelMap[level] || ErrorCorrectLevel.M);
    qr.addData(String(value || ""));
    qr.make();

    const count = qr.getModuleCount();

    return {
      count,
      modules: Array.from({ length: count }, (_, row) =>
        Array.from({ length: count }, (_, col) => qr.isDark(row, col))
      ),
    };
  }, [value, level]);

  const numericSize = Math.max(16, Number(size) || 112);
  const moduleSize = numericSize / matrix.count;
  const radius = Math.max(0.55, moduleSize * 0.38);

  return (
    <svg
      className={className}
      style={style}
      width={numericSize}
      height={numericSize}
      viewBox={`0 0 ${numericSize} ${numericSize}`}
      role="img"
      aria-label="Dotted QR code"
      shapeRendering="geometricPrecision"
    >
      <rect width={numericSize} height={numericSize} fill={bgColor} />
      {matrix.modules.map((row, rowIndex) =>
        row.map((isDark, colIndex) =>
          isDark ? (
            <circle
              key={`${rowIndex}-${colIndex}`}
              cx={(colIndex + 0.5) * moduleSize}
              cy={(rowIndex + 0.5) * moduleSize}
              r={radius}
              fill={fgColor}
            />
          ) : null
        )
      )}
    </svg>
  );
};

const normalizeTagRows = ({ serialRow = {}, serialRows = [] }) => {
  if (Array.isArray(serialRows) && serialRows.length > 0) {
    return serialRows;
  }

  return [serialRow].filter((row) => row && Object.keys(row).length > 0);
};

const normalizeApiRows = (response) => {
  const result =
    response?.data?.[0]?.result ??
    response?.data?.[0]?.RESULT ??
    response?.data?.result ??
    response?.data?.RESULT ??
    response?.result ??
    response?.RESULT ??
    response?.data ??
    response;

  if (!result) return [];

  if (typeof result === "string") {
    try {
      const parsed = JSON.parse(result);
      if (Array.isArray(parsed)) return parsed;
      if (Array.isArray(parsed?.data)) return parsed.data;
      return parsed && typeof parsed === "object" ? [parsed] : [];
    } catch {
      return [];
    }
  }

  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.data)) return result.data;
  return result && typeof result === "object" ? [result] : [];
};

const defaultDisplayFields = [
  { key: "propertyTagNo", label: "Property Tag No.", visible: true, emphasis: true },
  { key: "serialNo", label: "Serial No.", visible: true },
  { key: "location", label: "Location", visible: true },
  { key: "assignedTo", label: "Assigned To", visible: true },
  { key: "department", label: "Department", visible: true },
  { key: "acquiredOn", label: "Acquired On", visible: true },
  { key: "category", label: "Category", visible: false },
  { key: "subCategory", label: "Sub Category", visible: false },
  { key: "brandModel", label: "Brand / Model", visible: false },
  { key: "acqCost", label: "Acq Cost", visible: false },
];



const getDefaultFieldPositions = () =>
  defaultDisplayFields.reduce((acc, field) => {
    acc[field.key] = { x: 0, y: 0 };
    return acc;
  }, {});

const normalizeFieldPositions = (value = {}) => {
  const defaults = getDefaultFieldPositions();

  if (!value || typeof value !== "object") {
    return defaults;
  }

  Object.keys(value).forEach((key) => {
    defaults[key] = {
      x: Number(value[key]?.x) || 0,
      y: Number(value[key]?.y) || 0,
    };
  });

  return defaults;
};


const getDefaultFieldSizes = () =>
  defaultDisplayFields.reduce((acc, field) => {
    acc[field.key] = { width: 240, height: 22 };
    return acc;
  }, {});

const normalizeFieldSizes = (value = {}) => {
  const defaults = getDefaultFieldSizes();

  if (!value || typeof value !== "object") {
    return defaults;
  }

  Object.keys(value).forEach((key) => {
    defaults[key] = {
      width: Math.max(80, Number(value[key]?.width) || defaults[key]?.width || 240),
      height: Math.max(18, Number(value[key]?.height) || defaults[key]?.height || 22),
    };
  });

  return defaults;
};

const getDefaultSectionSizes = () => ({
  brand: { width: 300, height: 42 },
  company: { width: 300, height: 38 },
  asset: { width: 310, height: 46 },
});

const normalizeSectionSizes = (value = {}) => {
  const defaults = getDefaultSectionSizes();

  if (!value || typeof value !== "object") {
    return defaults;
  }

  Object.keys(defaults).forEach((key) => {
    defaults[key] = {
      width: Math.max(90, Number(value[key]?.width) || defaults[key].width),
      height: Math.max(22, Number(value[key]?.height) || defaults[key].height),
    };
  });

  return defaults;
};

const fontFamilyOptions = [
  "Aptos",
  "Arial",
  "Arial Narrow",
  "Calibri",
  "Cambria",
  "Tahoma",
  "Times New Roman",
  "Verdana",
  "Segoe UI",
  "Georgia",
  "Courier New",
];

const fontWeightOptions = [
  { value: "400", label: "Regular" },
  { value: "600", label: "Semi Bold" },
  { value: "700", label: "Bold" },
  { value: "800", label: "Extra Bold" },
  { value: "900", label: "Black" },
];

const fontColorPresets = [
  { label: "Slate", value: "#0f172a" },
  { label: "Gray", value: "#374151" },
  { label: "Blue", value: "#1d4ed8" },
  { label: "Navy", value: "#1e3a8a" },
  { label: "Red", value: "#b91c1c" },
  { label: "Green", value: "#15803d" },
  { label: "Amber", value: "#b45309" },
  { label: "Purple", value: "#7e22ce" },
  { label: "Black", value: "#000000" },
  { label: "White", value: "#ffffff" },
];

const getDefaultTextStyle = () => ({
  fontFamily: "Aptos",
  fontSize: 12,
  fontWeight: "700",
  fontStyle: "normal",
  fontColor: "#0f172a",
  wrapText: false,
  maxLines: 1,
});

const getDefaultTextStyles = () => ({
  section: {
    brand: { fontFamily: "Aptos", fontSize: 28, fontWeight: "900", fontStyle: "normal", fontColor: "#1d4ed8", wrapText: false, maxLines: 1 },
    company: { fontFamily: "Aptos", fontSize: 14, fontWeight: "800", fontStyle: "normal", fontColor: "#0f172a", wrapText: false, maxLines: 1 },
    asset: { fontFamily: "Aptos", fontSize: 15, fontWeight: "800", fontStyle: "normal", fontColor: "#0f172a", wrapText: true, maxLines: 2 },
  },
  field: defaultDisplayFields.reduce((acc, field) => {
    acc[field.key] = {
      fontFamily: "Aptos",
      fontSize: field.emphasis ? 14 : 12,
      fontWeight: field.emphasis ? "900" : "700",
      fontStyle: "normal",
      fontColor: field.emphasis ? "#b91c1c" : "#0f172a",
      wrapText: false,
      maxLines: 1,
    };
    return acc;
  }, {}),
});

const normalizeTextStyle = (value = {}, fallback = getDefaultTextStyle()) => ({
  fontFamily: fontFamilyOptions.includes(value?.fontFamily) ? value.fontFamily : fallback.fontFamily,
  fontSize: Math.max(6, Math.min(72, Number(value?.fontSize) || fallback.fontSize || 12)),
  fontWeight: String(value?.fontWeight || fallback.fontWeight || "700"),
  fontStyle: value?.fontStyle === "italic" ? "italic" : "normal",
  fontColor: String(value?.fontColor ?? fallback.fontColor ?? "#0f172a"),
  wrapText: Boolean(value?.wrapText ?? fallback.wrapText ?? false),
  maxLines: Math.max(1, Math.min(10, Number(value?.maxLines) || fallback.maxLines || 1)),
});

const normalizeTextStyles = (value = {}) => {
  const defaults = getDefaultTextStyles();

  if (!value || typeof value !== "object") {
    return defaults;
  }

  Object.keys(defaults.section).forEach((key) => {
    defaults.section[key] = normalizeTextStyle(value?.section?.[key], defaults.section[key]);
  });

  Object.keys(defaults.field).forEach((key) => {
    defaults.field[key] = normalizeTextStyle(value?.field?.[key], defaults.field[key]);
  });

  return defaults;
};

const getDefaultCodeLayout = () => ({
  qr: { x: 0, y: 0, width: 144, height: 144 },
  barcode: { x: 0, y: 0, width: 168, height: 51 },
});

const getDefaultLogoLayout = () => ({ x: 18, y: 18, width: 96, height: 34 });

const normalizeLogoLayout = (value = {}) => ({
  x: Number(value?.x) || 18,
  y: Number(value?.y) || 18,
  width: Math.max(24, Number(value?.width) || 96),
  height: Math.max(18, Number(value?.height) || 34),
});

const normalizeCodeLayout = (value = {}) => {
  const defaults = getDefaultCodeLayout();

  if (!value || typeof value !== "object") {
    return defaults;
  }

  Object.keys(defaults).forEach((key) => {
    defaults[key] = {
      x: Number(value[key]?.x) || 0,
      y: Number(value[key]?.y) || 0,
      width: Math.max(24, Number(value[key]?.width) || defaults[key].width),
      height: Math.max(18, Number(value[key]?.height) || defaults[key].height),
    };
  });

  return defaults;
};

const paperPresets = [
  { label: "Custom", width: "", height: "" },
  { label: "90mm x 50mm", width: "90", height: "50" },
  { label: "80mm x 40mm", width: "80", height: "40" },
  { label: "70mm x 35mm", width: "70", height: "35" },
  { label: "50mm x 30mm", width: "50", height: "30" },
];



const sheetPaperPresets = [
  { key: "letter", label: "Letter (8.5 x 11)", width: 215.9, height: 279.4 },
  { key: "legal", label: "Legal (8.5 x 14)", width: 215.9, height: 355.6 },
  { key: "a4", label: "A4", width: 210, height: 297 },
  { key: "folio", label: "8.5 x 13", width: 215.9, height: 330.2 },
];

const sheetTagCountOptions = [
  { value: "4", label: "x4 / 4 tags per sheet", columns: 2, rows: 2 },
  { value: "6", label: "x6 / 6 tags per sheet", columns: 2, rows: 3 },
  { value: "8", label: "x8 / 8 tags per sheet", columns: 2, rows: 4 },
  { value: "10", label: "x10 / 10 tags per sheet", columns: 2, rows: 5 },
  { value: "12", label: "x12 / 12 tags per sheet", columns: 2, rows: 6 },
];

const getSheetPaperPreset = (key) =>
  sheetPaperPresets.find((item) => item.key === key) || sheetPaperPresets[0];

const getSheetTagCountOption = (value) =>
  sheetTagCountOptions.find((item) => item.value === String(value)) || sheetTagCountOptions[0];

const TEMPLATE_LAYOUT_API = "/template-layouts/ppe-tag";
const DEFAULT_LAYOUT_NAME = "default";
const SETTINGS_FILE_VERSION = 1;

const safeJsonParse = (value, fallback = null) => {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const sanitizeLayoutName = (value, fallback = DEFAULT_LAYOUT_NAME) => {
  const clean = String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9 _.-]/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 60);

  return clean || fallback;
};

const downloadJsonFile = (fileName, payload) => {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const getQzConnectOptions = () => {
  const usingSecure = typeof window !== "undefined" && window.location.protocol === "https:";

  return {
    host: "localhost",
    port: usingSecure ? { secure: [8181] } : { insecure: [8182] },
    usingSecure,
    retries: 0,
    delay: 0,
  };
};

const getQzEndpointLabel = () => {
  const usingSecure = typeof window !== "undefined" && window.location.protocol === "https:";
  return usingSecure ? "localhost:8181" : "localhost:8182";
};

const SearchPPETag = ({
  isOpen,
  onClose,
  companyInfo: companyInfoProp = {},
  documentInfo = {},
  detailRow = {},
  serialRow = {},
  serialRows = [],
  viewMode = false,
}) => {
  const { companyInfo: authCompanyInfo = {} } = useAuth();
  const companyInfo = Object.keys(companyInfoProp || {}).length > 0 ? companyInfoProp : authCompanyInfo;

  const [paperWidth, setPaperWidth] = useState("90");
  const [paperHeight, setPaperHeight] = useState("50");
  const [paperPreset, setPaperPreset] = useState("90mm x 50mm");
  const [orientation, setOrientation] = useState("landscape");
  const [showBorder, setShowBorder] = useState(true);
  const [isMaximized, setIsMaximized] = useState(false);
  const [designZoom, setDesignZoom] = useState(140);
  const [labelPreviewZoom, setLabelPreviewZoom] = useState(140);
  const [sheetPreviewZoom, setSheetPreviewZoom] = useState(220);
  const [titleText, setTitleText] = useState("NAYSA");
  const [subtitleText, setSubtitleText] = useState("PROPERTY TAG");
  const previewViewportRef = useRef(null);
  const [, setPreviewViewportSize] = useState({ width: 0, height: 0 });
  const [displayFields, setDisplayFields] = useState(defaultDisplayFields);
  const [showDisplayFields, setShowDisplayFields] = useState(false);
  const [showTitleSettings, setShowTitleSettings] = useState(false);
  const [showLogoSettings, setShowLogoSettings] = useState(false);
  const [showFontSettings, setShowFontSettings] = useState(false);
  const [showPrintOutputSettings, setShowPrintOutputSettings] = useState(false);
  const [showLayoutFileSettings, setShowLayoutFileSettings] = useState(false);
  const [showTagRangeSettings, setShowTagRangeSettings] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [printOutputMode, setPrintOutputMode] = useState("label"); // label | sheet
  const [sheetPaperSize, setSheetPaperSize] = useState("letter");
  const [sheetTagCount, setSheetTagCount] = useState("4");
  const [sheetMarginMm, setSheetMarginMm] = useState("8");
  const [sheetGapMm, setSheetGapMm] = useState("4");
  const [pdfQualityDpi, setPdfQualityDpi] = useState("200"); // 200 = faster, 300 = sharper
  const [isCapturingPrint, setIsCapturingPrint] = useState(false);
  const [isInitialPreviewLoading, setIsInitialPreviewLoading] = useState(false);
  const [outputProgress, setOutputProgress] = useState(0);
  const [outputAction, setOutputAction] = useState("");
  const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false);
  const [startingTagNo, setStartingTagNo] = useState("");
  const [endingTagNo, setEndingTagNo] = useState("");
  const [loadedTagRows, setLoadedTagRows] = useState([]);
  const [isTagRangeLoading, setIsTagRangeLoading] = useState(false);
  const [tagRangeStatus, setTagRangeStatus] = useState("");
  const [showTagFeatureInfo, setShowTagFeatureInfo] = useState(false);
  const [showTagWorkflowInfo, setShowTagWorkflowInfo] = useState(false);
  const tagPreviewRefs = useRef({});
  const sheetPreviewRefs = useRef({});
  const qzRef = useRef(null);
  const [qzPrinters, setQzPrinters] = useState([]);
  const [selectedQzPrinter, setSelectedQzPrinter] = useState("");
  const [qzPrintType, setQzPrintType] = useState("image"); // image | html | zpl
  const [qzDpi, setQzDpi] = useState("203");
  const [isQzBusy, setIsQzBusy] = useState(false);
  const [qzStatus, setQzStatus] = useState("QZ Tray not connected.");
  const layoutImportRef = useRef(null);
  const logoImportRef = useRef(null);
  const autoLoadedServerLayoutRef = useRef(false);
  const [layoutSettingsTab, setLayoutSettingsTab] = useState("formats"); // formats | setup
  const [layoutName, setLayoutName] = useState(DEFAULT_LAYOUT_NAME);
  const [serverLayouts, setServerLayouts] = useState([]);
  const [selectedServerLayout, setSelectedServerLayout] = useState(DEFAULT_LAYOUT_NAME);
  const [layoutStatus, setLayoutStatus] = useState("Layout settings are not loaded yet.");
  const [isLayoutBusy, setIsLayoutBusy] = useState(false);
  const [showLogo, setShowLogo] = useState(false);
  const [showQrCode, setShowQrCode] = useState(true);
  const [showBarcode, setShowBarcode] = useState(true);
  const [qrType, setQrType] = useState("dotted");
  const [logoDataUrl, setLogoDataUrl] = useState("");
  const [logoLayout, setLogoLayout] = useState(getDefaultLogoLayout);
  const dragFieldRef = useRef(null);
  const dragCodeRef = useRef(null);
  const dragSectionRef = useRef(null);
  const dragLogoRef = useRef(null);
  const [alignmentGuideX, setAlignmentGuideX] = useState(null);
  const [fieldPositions, setFieldPositions] = useState(getDefaultFieldPositions);
  const [fieldSizes, setFieldSizes] = useState(getDefaultFieldSizes);
  const [selectedTextTarget, setSelectedTextTarget] = useState({ type: "section", key: "brand" });
  const [fontSizeDraft, setFontSizeDraft] = useState(null);
  const [maxLinesDraft, setMaxLinesDraft] = useState(null);
  const [textStyles, setTextStyles] = useState(getDefaultTextStyles);
  const [codeLayout, setCodeLayout] = useState(getDefaultCodeLayout);
  const [sectionSizes, setSectionSizes] = useState(getDefaultSectionSizes);
  const [sectionPositions, setSectionPositions] = useState({
    brand: { x: 0, y: 0 },
    company: { x: 0, y: 0 },
    asset: { x: 0, y: 0 },
    fields: { x: 0, y: 0 },
    code: { x: 0, y: 0 },
  });

  const buildLayoutSettings = () => ({
    version: SETTINGS_FILE_VERSION,
    layoutName: sanitizeLayoutName(layoutName),
    savedAt: new Date().toISOString(),
    paperWidth,
    paperHeight,
    paperPreset,
    orientation,
    showBorder,
    showLogo,
    showQrCode,
    showBarcode,
    qrType,
    logoDataUrl,
    logoLayout,
    designZoom,
    labelPreviewZoom,
    sheetPreviewZoom,
    titleText,
    subtitleText,
    titleTextBlank: titleText === "",
    subtitleTextBlank: subtitleText === "",
    titleSettings: {
      mainTitle: titleText ?? "",
      subTitle: subtitleText ?? "",
    },
    displayFields,
    fieldPositions,
    fieldSizes,
    textStyles,
    codeLayout,
    sectionSizes,
    printOutputMode,
    sheetPaperSize,
    sheetTagCount,
    sheetMarginMm,
    sheetGapMm,
    pdfQualityDpi,
    sectionPositions,
    qzPrintType,
    qzDpi,
    selectedQzPrinter,
  });

  const applyLayoutSettings = (settings = {}) => {
    if (!settings || typeof settings !== "object") return;

    setLayoutName(sanitizeLayoutName(settings.layoutName || layoutName));
    setSelectedServerLayout(sanitizeLayoutName(settings.layoutName || selectedServerLayout));
    setPaperWidth(String(settings.paperWidth || "90"));
    setPaperHeight(String(settings.paperHeight || "50"));
    setPaperPreset(settings.paperPreset || "Custom");
    setOrientation(settings.orientation || "landscape");
    setShowBorder(settings.showBorder !== false);
    setShowLogo(Boolean(settings.showLogo && settings.logoDataUrl));
    setShowQrCode(settings.showQrCode !== false);
    setShowBarcode(settings.showBarcode !== false);
    setQrType(settings.qrType === "standard" ? "standard" : "dotted");
    setLogoDataUrl(settings.logoDataUrl || "");
    setLogoLayout(normalizeLogoLayout(settings.logoLayout));
    setDesignZoom(String(settings.designZoom || settings.previewZoom || 140));
    setLabelPreviewZoom(String(settings.labelPreviewZoom || settings.previewZoom || 140));
    setSheetPreviewZoom(String(settings.sheetPreviewZoom || 220));

    const hasSavedMainTitle = Object.prototype.hasOwnProperty.call(settings, "titleText");
    const hasSavedSubTitle = Object.prototype.hasOwnProperty.call(settings, "subtitleText");
    const savedMainTitle = settings.titleTextBlank
      ? ""
      : hasSavedMainTitle
        ? settings.titleText
        : settings.titleSettings?.mainTitle;
    const savedSubTitle = settings.subtitleTextBlank
      ? ""
      : hasSavedSubTitle
        ? settings.subtitleText
        : settings.titleSettings?.subTitle;

    setTitleText(savedMainTitle === undefined || savedMainTitle === null ? "NAYSA" : String(savedMainTitle));
    setSubtitleText(savedSubTitle === undefined || savedSubTitle === null ? "PROPERTY TAG" : String(savedSubTitle));
    setDisplayFields(Array.isArray(settings.displayFields) ? settings.displayFields : defaultDisplayFields);
    setFieldPositions(normalizeFieldPositions(settings.fieldPositions));
    setFieldSizes(normalizeFieldSizes(settings.fieldSizes));
    setTextStyles(normalizeTextStyles(settings.textStyles));
    setCodeLayout(normalizeCodeLayout(settings.codeLayout));
    setSectionSizes(normalizeSectionSizes(settings.sectionSizes));
    setPrintOutputMode(settings.printOutputMode || "label");
    setSheetPaperSize(settings.sheetPaperSize || "letter");
    setSheetTagCount(String(settings.sheetTagCount || "4"));
    setSheetMarginMm(String(settings.sheetMarginMm ?? "8"));
    setSheetGapMm(String(settings.sheetGapMm ?? "4"));
    setPdfQualityDpi(String(settings.pdfQualityDpi || "200"));
    setSectionPositions(settings.sectionPositions || {
      brand: { x: 0, y: 0 },
      company: { x: 0, y: 0 },
      asset: { x: 0, y: 0 },
      fields: { x: 0, y: 0 },
      code: { x: 0, y: 0 },
    });
    setQzPrintType(settings.qzPrintType || "image");
    setQzDpi(String(settings.qzDpi || "203"));
    setSelectedQzPrinter(settings.selectedQzPrinter || "");
  };

  const handleSaveLayoutToBrowser = () => {
    const settings = buildLayoutSettings();
    localStorage.setItem("naysa:ppeg-tag-layout", JSON.stringify(settings));
    setLayoutStatus(`Layout "${settings.layoutName}" saved to this browser.`);
  };

  const handleLoadLayoutFromBrowser = () => {
    const settings = safeJsonParse(localStorage.getItem("naysa:ppeg-tag-layout"));

    if (!settings) {
      setLayoutStatus("No saved layout found in this browser.");
      return;
    }

    applyLayoutSettings(settings);
    setLayoutStatus(`Layout "${settings.layoutName || DEFAULT_LAYOUT_NAME}" loaded from this browser.`);
  };

  const handleDownloadLayoutFile = () => {
    const settings = buildLayoutSettings();
    const cleanName = sanitizeLayoutName(settings.layoutName).replace(/\s+/g, "_");
    downloadJsonFile(`ppe-tag-layout-${cleanName}.json`, settings);
    setLayoutStatus(`Layout "${settings.layoutName}" downloaded as JSON file.`);
  };

  const handleImportLayoutFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    try {
      const text = await file.text();
      const settings = safeJsonParse(text);

      if (!settings || typeof settings !== "object") {
        throw new Error("Invalid PPE tag layout JSON file.");
      }

      applyLayoutSettings(settings);
      setLayoutStatus(`Layout "${settings.layoutName || DEFAULT_LAYOUT_NAME}" imported from file.`);
    } catch (error) {
      setLayoutStatus(error?.message || "Unable to import layout file.");
    }
  };

  const loadServerLayoutByName = async (name, { silent = false, setBusy = true } = {}) => {
    const cleanName = sanitizeLayoutName(name || DEFAULT_LAYOUT_NAME);

    if (!cleanName) return false;
    if (setBusy) setIsLayoutBusy(true);

    try {
      const response = await apiClient.get(`${TEMPLATE_LAYOUT_API}/${encodeURIComponent(cleanName)}`);
      const payload = response?.data || {};
      const settings = payload?.data?.settings || payload?.settings || payload?.data;

      if (!settings || typeof settings !== "object") {
        throw new Error("Server layout file has invalid settings content.");
      }

      applyLayoutSettings(settings);
      setSelectedServerLayout(cleanName);
      if (!silent) setLayoutStatus(`Layout "${cleanName}" loaded from server file.`);
      return true;
    } catch (error) {
      if (!silent) setLayoutStatus(error?.message || "Unable to load layout from server.");
      return false;
    } finally {
      if (setBusy) setIsLayoutBusy(false);
    }
  };

  const handleLoadServerLayouts = async ({ autoLoadFirst = false } = {}) => {
    setIsLayoutBusy(true);

    try {
      const response = await apiClient.get(TEMPLATE_LAYOUT_API);
      const payload = response?.data || {};
      const rows = Array.isArray(payload?.data) ? payload.data : [];
      setServerLayouts(rows);

      if (rows.length > 0) {
        const firstLayoutName = rows[0].layoutName || DEFAULT_LAYOUT_NAME;
        setSelectedServerLayout((prev) => prev || firstLayoutName);

        if (autoLoadFirst && !autoLoadedServerLayoutRef.current) {
          autoLoadedServerLayoutRef.current = true;
          await loadServerLayoutByName(firstLayoutName, { silent: true, setBusy: false });
          setLayoutStatus(`Default layout "${firstLayoutName}" loaded automatically.`);
        } else {
          setLayoutStatus(`${rows.length} server layout(s) loaded.`);
        }
      } else {
        setLayoutStatus("No layout file found on server. Use Setup tab to save a new format.");
      }
    } catch (error) {
      setLayoutStatus(error?.message || "Unable to load server layouts.");
    } finally {
      setIsLayoutBusy(false);
    }
  };

  const handleSaveLayoutToServer = async () => {
    setIsLayoutBusy(true);

    try {
      const settings = buildLayoutSettings();
      await apiClient.post(TEMPLATE_LAYOUT_API, {
        layoutName: settings.layoutName,
        settings,
      });

      setSelectedServerLayout(settings.layoutName);
      setLayoutSettingsTab("formats");
      setLayoutStatus(`Layout "${settings.layoutName}" saved to server file.`);
      await handleLoadServerLayouts();
    } catch (error) {
      setLayoutStatus(error?.message || "Unable to save layout file to server.");
    } finally {
      setIsLayoutBusy(false);
    }
  };

  const handleLoadLayoutFromServer = async () => {
    const name = sanitizeLayoutName(selectedServerLayout || layoutName);
    await loadServerLayoutByName(name);
  };

  const handleResetLayoutSettings = () => {
    setPaperWidth("90");
    setPaperHeight("50");
    setPaperPreset("90mm x 50mm");
    setOrientation("landscape");
    setShowBorder(true);
    setDesignZoom(140);
    setLabelPreviewZoom(140);
    setSheetPreviewZoom(220);
    setTitleText("NAYSA");
    setSubtitleText("PROPERTY TAG");
    setDisplayFields(defaultDisplayFields);
    setFieldPositions(getDefaultFieldPositions());
    setFieldSizes(getDefaultFieldSizes());
    setTextStyles(getDefaultTextStyles());
    setSelectedTextTarget({ type: "section", key: "brand" });
    setCodeLayout(getDefaultCodeLayout());
    setSectionSizes(getDefaultSectionSizes());
    setPrintOutputMode("label");
    setSheetPaperSize("letter");
    setSheetTagCount("4");
    setSheetMarginMm("8");
    setSheetGapMm("4");
    setSectionPositions({
      brand: { x: 0, y: 0 },
      company: { x: 0, y: 0 },
      asset: { x: 0, y: 0 },
      fields: { x: 0, y: 0 },
      code: { x: 0, y: 0 },
    });
    setQzPrintType("image");
    setQzDpi("203");
    setLayoutStatus("Layout settings reset to default values.");
  };

  useEffect(() => {
    if (!viewMode) return;

    setIsEditMode(false);
    setPrintOutputMode("label");
    setIsMaximized(false);
  }, [viewMode, isOpen, printOutputMode]);

  useEffect(() => {
    if (!isOpen) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !previewViewportRef.current) return;

    const element = previewViewportRef.current;
    const updateSize = () => {
      const rect = element.getBoundingClientRect();
      setPreviewViewportSize({
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      });
    };

    updateSize();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(updateSize);
      observer.observe(element);
      return () => observer.disconnect();
    }

    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, [isOpen, isMaximized, printOutputMode, isEditMode]);

  useEffect(() => {
    if (!isOpen) {
      autoLoadedServerLayoutRef.current = false;
      setIsInitialPreviewLoading(false);
      setLoadedTagRows([]);
      setTagRangeStatus("");
      return;
    }

    let isMounted = true;

    const loadInitialLayoutAndPreview = async () => {
      setIsInitialPreviewLoading(true);

      try {
        await handleLoadServerLayouts({ autoLoadFirst: true });

        // Wait for fonts and React/browser paint after applying an existing saved layout.
        // This prevents the spinner from closing while the modal is still visually changing.
        await document.fonts?.ready;
        await new Promise((resolve) => window.requestAnimationFrame(() => resolve()));
        await new Promise((resolve) => window.requestAnimationFrame(() => resolve()));
        await new Promise((resolve) => window.setTimeout(resolve, 250));
      } finally {
        if (isMounted) setIsInitialPreviewLoading(false);
      }
    };

    loadInitialLayoutAndPreview();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const buildFaLookupParams = () => ({
    sTagNo: startingTagNo,
    eTagNo: endingTagNo,
    filter: "TagPrintingByTagNo",
  });

  const handleLoadTagRange = async () => {
    const cleanStartingTagNo = String(startingTagNo || "").trim();
    const cleanEndingTagNo = String(endingTagNo || "").trim();

    if (!cleanStartingTagNo || !cleanEndingTagNo) {
      setTagRangeStatus("Please enter both Starting Property Tag No. and Ending Property Tag No.");
      return;
    }

    setIsTagRangeLoading(true);
    setTagRangeStatus("");

    try {
      const response = await postRequest("lookupFAMast", {
        PARAMS: JSON.stringify({
          json_data: {
            ...buildFaLookupParams(),
            sTagNo: cleanStartingTagNo,
            eTagNo: cleanEndingTagNo,
          },
        }),
      });

      const rows = normalizeApiRows(response);
      const normalizedRows = rows.map((row, index) => ({
        ...row,
        assetTag: row?.tagNo ||"",
        serialNo: row?.serialNo || "",
        location: row?.flocName|| "",
        assignedTo: row?.empName || "",
        rcCode: row?.rcName  || "",
        brandModel: row?.modelNo|| "",
        rowKey: row?.faCode || row?.tagNo || String(index + 1),
      }));

      setLoadedTagRows(normalizedRows);
      setTagRangeStatus(
        normalizedRows.length > 0
          ? `Loaded ${normalizedRows.length} property tag${normalizedRows.length === 1 ? "" : "s"}.`
          : "No property tags found for the selected range."
      );
    } catch (error) {
      console.error("Property tag range lookup error:", error);
      setLoadedTagRows([]);
      setTagRangeStatus(error?.message || "Unable to load property tags for the selected range.");
    } finally {
      setIsTagRangeLoading(false);
    }
  };

  const tagInfos = useMemo(() => {
    const rows = loadedTagRows.length > 0 ? loadedTagRows : normalizeTagRows({ serialRow, serialRows });

    return rows.map((row, index) => {
      const propertyTagNo = formatDisplayValue(row.assetTag || row.tagNo, "System-Generated");
      const serialNo = formatDisplayValue(row.serialNo, "-");
      const assetDescription = formatDisplayValue(row.faName || row.assetDescription || detailRow.assetDescription, "-");
      const category = formatDisplayValue(row.categName || detailRow.categName || detailRow.assetCategory, "-");
      const subCategory = formatDisplayValue(row.className || detailRow.className || detailRow.assetSubCategory, "-");
      const location = formatDisplayValue(row.location || detailRow.location, "-");
      const assignedTo = formatDisplayValue(row.assignedTo || row.empName, "-");
      const department = formatDisplayValue(row.rcCode || detailRow.rcCode, "-");
      const acquiredOn = formatDisplayValue(row.acqDate || documentInfo.documentDate, "-");
      const brandModel = formatDisplayValue(row.brandModel || detailRow.brandModel, "-");
      const acqCost = formatDisplayValue(row.acqCost || detailRow.acqCost, "-");
      const companyName = formatDisplayValue(companyInfo.compName);
      const branchName = formatDisplayValue(row.branchName || companyInfo.branchName);

      return {
        rowKey: `${propertyTagNo}-${serialNo}-${index}`,
        propertyTagNo,
        serialNo,
        assetDescription,
        category,
        subCategory,
        location,
        assignedTo,
        department,
        acquiredOn,
        brandModel,
        acqCost,
        companyName,
        branchName,
      };
    });
  }, [companyInfo, detailRow, documentInfo, loadedTagRows, serialRow, serialRows]);

  if (!isOpen) return null;

  const isMultipleTags = tagInfos.length > 1;
  const visibleDisplayFields = displayFields.filter((field) => field.visible);
  const designTagInfo = tagInfos[0];
  const finalWidth = orientation === "landscape" ? paperWidth : paperHeight;
  const finalHeight = orientation === "landscape" ? paperHeight : paperWidth;
  const numericFinalWidth = Number(finalWidth) || 90;
  const numericFinalHeight = Number(finalHeight) || 50;
  const sheetPaper = getSheetPaperPreset(sheetPaperSize);
  const sheetLayout = getSheetTagCountOption(sheetTagCount);
  const numericSheetMarginMm = Math.max(0, Number(sheetMarginMm) || 0);
  const numericSheetGapMm = Math.max(0, Number(sheetGapMm) || 0);
  const sheetTagsPerPage = sheetLayout.columns * sheetLayout.rows;
  const sheetPreviewPages = [];

  for (let i = 0; i < tagInfos.length; i += sheetTagsPerPage) {
    sheetPreviewPages.push(tagInfos.slice(i, i + sheetTagsPerPage));
  }

  const scaleFactor = 1;
  const previewScale = isMultipleTags ? 3.25 : (numericFinalWidth >= 120 ? 3.25 : 5);
  const previewPixelWidth = numericFinalWidth * previewScale;
  const previewPixelHeight = numericFinalHeight * previewScale;
  const capturePixelWidth = numericFinalWidth * 6;
  const capturePixelHeight = numericFinalHeight * 6;

  const previewStyle = {
    width: `${previewPixelWidth}px`,
    minWidth: `${previewPixelWidth}px`,
    height: `${previewPixelHeight}px`,
    minHeight: `${previewPixelHeight}px`,
    maxWidth: "none",
    flex: "0 0 auto",
  };

  const sheetPreviewScale = isMaximized ? 1.9 : 1.35;
  const sheetPreviewPaperWidthPx = sheetPaper.width * sheetPreviewScale;
  const sheetPreviewPaperHeightPx = sheetPaper.height * sheetPreviewScale;
  const sheetPreviewMarginPx = numericSheetMarginMm * sheetPreviewScale;
  const sheetPreviewGapPx = numericSheetGapMm * sheetPreviewScale;
  const sheetPreviewCellWidthPx =
    (sheetPreviewPaperWidthPx - (sheetPreviewMarginPx * 2) - (sheetPreviewGapPx * (sheetLayout.columns - 1))) / sheetLayout.columns;
  const sheetPreviewCellHeightPx =
    (sheetPreviewPaperHeightPx - (sheetPreviewMarginPx * 2) - (sheetPreviewGapPx * (sheetLayout.rows - 1))) / sheetLayout.rows;
  const sheetPreviewTagFitScale = Math.max(0.05, Math.min(1, sheetPreviewCellWidthPx / previewPixelWidth, sheetPreviewCellHeightPx / previewPixelHeight));
  const PRINT_DPI = Math.max(150, Math.min(300, Number(pdfQualityDpi) || 200));
  const PRINT_PX_PER_MM = PRINT_DPI / 25.4;
  const HIGH_RES_TAG_CAPTURE_SCALE = PRINT_DPI >= 300 ? 2.75 : 2;

  const singleTagModalSizeClass = "max-w-[min(98vw,1320px)]";
  const viewModeModalSizeClass = "max-w-[min(96vw,560px)]";
  const modalSizeClass = viewMode ? viewModeModalSizeClass : isMultipleTags ? "max-w-[99vw]" : singleTagModalSizeClass;

  const modalClassName = isMaximized
    ? "h-[100dvh] w-[100vw] max-h-none max-w-none overflow-hidden rounded-none"
    : `${viewMode ? "max-h-[82vh]" : "max-h-[97vh]"} w-full ${modalSizeClass} overflow-hidden rounded-2xl`;
  const activeZoomLabel = isEditMode
    ? "Design Zoom"
    : printOutputMode === "sheet"
      ? "Sheet Preview Zoom"
      : "Label Preview Zoom";
  const resolvedPreviewZoom = isEditMode
    ? Math.max(40, Math.min(300, Number(designZoom) || 140))
    : printOutputMode === "sheet"
      ? Math.max(40, Math.min(300, Number(sheetPreviewZoom) || 220))
      : Math.max(40, Math.min(300, Number(labelPreviewZoom) || 140));
  const updateActiveZoom = (value) => {
    const nextZoom = Math.max(40, Math.min(300, Number(value) || 100));

    if (isEditMode) {
      setDesignZoom(nextZoom);
      return;
    }

    if (printOutputMode === "sheet") {
      setSheetPreviewZoom(nextZoom);
      return;
    }

    setLabelPreviewZoom(nextZoom);
  };
  const previewZoomFactor = resolvedPreviewZoom / 100;
  const previewZoomWrapperStyle = {
    transform: `scale(${previewZoomFactor})`,
    transformOrigin: "top center",
  };

  const previewGridClass = isMultipleTags
    ? "grid grid-cols-1 justify-items-center gap-4 xl:grid-cols-2"
    : "flex h-full items-center justify-center";

  const getCodeMarkup = (tagInfo) => {
    const tagNoValue = tagInfo.propertyTagNo;
    const qrValue = tagNoValue;
    const printQrSize = 112;
    const printQrElement =
      qrType === "standard" ? (
        <QRCode value={qrValue} size={printQrSize} bgColor="#ffffff" fgColor="#111827" level="M" />
      ) : (
        <DottedQRCode value={qrValue} size={printQrSize} bgColor="#ffffff" fgColor="#111827" level="M" />
      );

    return {
      qrValue,
      tagNoValue,
      printQrMarkup: renderToStaticMarkup(printQrElement),
      printBarcodeMarkup: renderToStaticMarkup(
        <Barcode
          value={tagNoValue}
          format="CODE128"
          height={38}
          width={1.45}
          margin={0}
          displayValue={false}
          background="#ffffff"
          lineColor="#111827"
        />
      ),
    };
  };

  const handlePaperPresetChange = (value) => {
    setPaperPreset(value);
    const preset = paperPresets.find((item) => item.label === value);

    if (preset?.width && preset?.height) {
      setPaperWidth(preset.width);
      setPaperHeight(preset.height);
    }
  };

  const handleFieldVisibleChange = (key, checked) => {
    setDisplayFields((prev) =>
      prev.map((field) => (field.key === key ? { ...field, visible: checked } : field))
    );
  };

  const moveDisplayField = (index, direction) => {
    setDisplayFields((prev) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= prev.length) return prev;

      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.splice(nextIndex, 0, item);
      return next;
    });
  };

  const updateSectionPosition = (sectionKey, axis, value) => {
    const cleanValue = value.replace(/[^0-9.-]/g, "");
    setSectionPositions((prev) => ({
      ...prev,
      [sectionKey]: {
        ...prev[sectionKey],
        [axis]: cleanValue,
      },
    }));
  };

  const resetSectionPositions = () => {
    setSectionPositions({
      brand: { x: 0, y: 0 },
      company: { x: 0, y: 0 },
      asset: { x: 0, y: 0 },
      fields: { x: 0, y: 0 },
      code: { x: 0, y: 0 },
    });
  };

  const resetFieldPositions = () => {
    setFieldPositions(getDefaultFieldPositions());
    setFieldSizes(getDefaultFieldSizes());
  };

  const getFieldSize = (key) => fieldSizes[key] || getDefaultFieldSizes()[key] || { width: 240, height: 22 };

  const getSectionSize = (sectionKey) => sectionSizes[sectionKey] || getDefaultSectionSizes()[sectionKey] || { width: 240, height: 32 };

  const getMovableElementPositions = (activeKey = "") => {
    const fieldItems = Object.entries(fieldPositions || {}).map(([key, pos]) => ({
      key: `field:${key}`,
      x: Number(pos?.x) || 0,
    }));

    const sectionItems = Object.entries(sectionPositions || {})
      .filter(([key]) => ["brand", "company", "asset"].includes(key))
      .map(([key, pos]) => ({
        key: `section:${key}`,
        x: Number(pos?.x) || 0,
      }));

    const codeItems = Object.entries(codeLayout || {}).map(([key, item]) => ({
      key: `code:${key}`,
      x: Number(item?.x) || 0,
    }));

    return [...fieldItems, ...sectionItems, ...codeItems].filter((item) => item.key !== activeKey);
  };

  const snapToVerticalGuide = (activeKey, nextX) => {
    const threshold = 6;
    const match = getMovableElementPositions(activeKey).find((item) => Math.abs((Number(item.x) || 0) - nextX) <= threshold);

    if (match) {
      setAlignmentGuideX(Number(match.x) || 0);
      return Number(match.x) || 0;
    }

    setAlignmentGuideX(null);
    return nextX;
  };

  const getTextStyle = (target = selectedTextTarget) => {
    const defaults = getDefaultTextStyles();
    if (!target?.type || !target?.key) return getDefaultTextStyle();

    return target.type === "section"
      ? normalizeTextStyle(textStyles?.section?.[target.key], defaults.section[target.key] || getDefaultTextStyle())
      : normalizeTextStyle(textStyles?.field?.[target.key], defaults.field[target.key] || getDefaultTextStyle());
  };

  const getTextWrapCss = (target) => {
    const style = getTextStyle(target);
    const fontSize = Math.max(6, Number(style.fontSize) || 12);
    const lineHeight = style.fontStyle === "italic" ? 1.42 : 1.32;
    const verticalPadding = style.fontStyle === "italic" ? 8 : 4;

    if (!style.wrapText) {
      return {
        whiteSpace: "nowrap",
        overflow: "visible",
        textOverflow: "unset",
        lineHeight,
        paddingTop: style.fontStyle === "italic" ? "3px" : "1px",
        paddingBottom: style.fontStyle === "italic" ? "5px" : "2px",
      };
    }

    return {
      whiteSpace: "normal",
      overflow: "hidden",
      textOverflow: "clip",
      wordBreak: "break-word",
      overflowWrap: "anywhere",
      display: "block",
      lineHeight,
      maxHeight: `${Math.ceil(fontSize * lineHeight * Math.max(1, Number(style.maxLines) || 1) + verticalPadding)}px`,
      paddingTop: style.fontStyle === "italic" ? "3px" : "1px",
      paddingBottom: style.fontStyle === "italic" ? "5px" : "2px",
    };
  };

  const getTextStyleCss = (target) => {
    const style = getTextStyle(target);
    return {
      fontFamily: `${style.fontFamily}, Arial, sans-serif`,
      fontSize: `${Number(style.fontSize) || 12}px`,
      fontWeight: String(style.fontWeight || "700"),
      fontStyle: style.fontStyle || "normal",
      color: /^#[0-9a-fA-F]{6}$/.test(String(style.fontColor || "")) ? style.fontColor : "#0f172a",
      paddingLeft: style.fontStyle === "italic" ? "2px" : undefined,
      paddingRight: style.fontStyle === "italic" ? "3px" : undefined,
      ...getTextWrapCss(target),
    };
  };

  const getTextMinimumHeight = (target) => {
    const style = getTextStyle(target);
    const fontSize = Math.max(6, Number(style.fontSize) || 12);
    const lineHeight = style.fontStyle === "italic" ? 1.42 : 1.32;
    const maxLines = style.wrapText ? Math.max(1, Number(style.maxLines) || 1) : 1;
    const padding = style.fontStyle === "italic" ? 12 : 6;

    return Math.ceil(fontSize * lineHeight * maxLines + padding);
  };

  const getTextStyleInlineCss = (target) => {
    const style = getTextStyle(target);
    const fontSize = Math.max(6, Number(style.fontSize) || 12);
    const lineHeight = style.fontStyle === "italic" ? 1.42 : 1.32;
    const verticalPadding = style.fontStyle === "italic" ? 8 : 4;
    const wrapCss = style.wrapText
      ? `white-space:normal;overflow:hidden;text-overflow:clip;word-break:break-word;overflow-wrap:anywhere;display:block;line-height:${lineHeight};max-height:${Math.ceil(fontSize * lineHeight * Math.max(1, Number(style.maxLines) || 1) + verticalPadding)}px;padding-top:${style.fontStyle === "italic" ? 3 : 1}px;padding-bottom:${style.fontStyle === "italic" ? 5 : 2}px;`
      : `white-space:nowrap;overflow:visible;text-overflow:unset;line-height:${lineHeight};padding-top:${style.fontStyle === "italic" ? 3 : 1}px;padding-bottom:${style.fontStyle === "italic" ? 5 : 2}px;`;

    const colorValue = /^#[0-9a-fA-F]{6}$/.test(String(style.fontColor || "")) ? style.fontColor : "#0f172a";
    const italicPadding = style.fontStyle === "italic" ? "padding-left:4px;padding-right:6px;" : "";
    return `font-family:${style.fontFamily}, Arial, sans-serif;font-size:${style.fontSize}px;font-weight:${style.fontWeight};font-style:${style.fontStyle};color:${colorValue};${italicPadding}${wrapCss}`;
  };

  const getSelectedTextTargetLabel = () => {
    if (selectedTextTarget?.type === "section") {
      const labels = {
        brand: "Tag Title",
        company: "Company Information",
        asset: "Asset Description",
      };
      return labels[selectedTextTarget.key] || "Tag Section";
    }

    const field = displayFields.find((item) => item.key === selectedTextTarget?.key);
    return field?.label || "Selected Field";
  };

  const handleSelectTextTarget = (type, key) => {
    if (!isEditMode) return;
    setSelectedTextTarget({ type, key });
    setFontSizeDraft(null);
    setMaxLinesDraft(null);
    setShowFontSettings(true);
  };

  const updateSelectedTextStyle = (field, value) => {
    const target = selectedTextTarget || { type: "section", key: "brand" };

    setTextStyles((prev) => {
      const normalizedPrev = normalizeTextStyles(prev);
      const current = getTextStyle(target);
      const nextStyle = normalizeTextStyle({ ...current, [field]: value }, current);

      if (target.type === "section") {
        return {
          ...normalizedPrev,
          section: {
            ...normalizedPrev.section,
            [target.key]: nextStyle,
          },
        };
      }

      return {
        ...normalizedPrev,
        field: {
          ...normalizedPrev.field,
          [target.key]: nextStyle,
        },
      };
    });
  };

  const adjustSelectedFontSize = (direction) => {
    const current = Number(fontSizeDraft ?? getTextStyle().fontSize) || 12;
    const next = Math.max(6, Math.min(72, current + direction));

    setFontSizeDraft(String(next));
    updateSelectedTextStyle("fontSize", next);
  };

  const adjustSelectedMaxLines = (direction) => {
    const current = Number(maxLinesDraft ?? getTextStyle().maxLines) || 1;
    const next = Math.max(1, Math.min(10, current + direction));

    setMaxLinesDraft(String(next));
    updateSelectedTextStyle("maxLines", next);
  };


  const getFieldPosition = (key) => fieldPositions[key] || { x: 0, y: 0 };

  const getFieldTransformStyle = (key, { draggable = false } = {}) => {
    const position = getFieldPosition(key);
    const size = getFieldSize(key);
    const hasOffset = Boolean(Number(position.x) || Number(position.y));

    return {
      transform: `translate(${Number(position.x) || 0}px, ${Number(position.y) || 0}px)`,
      width: `${Math.max(80, Number(size.width) || 240)}px`,
      minHeight: `${Math.max(18, Number(size.height) || 22)}px`,
      position: "relative",
      zIndex: hasOffset ? 8 : 1,
      cursor: draggable ? "grab" : undefined,
      touchAction: draggable ? "none" : undefined,
      userSelect: draggable ? "none" : undefined,
    };
  };

  const updateFieldPosition = (fieldKey, axis, value) => {
    const cleanValue = String(value ?? "").replace(/[^0-9.-]/g, "");

    setFieldPositions((prev) => ({
      ...prev,
      [fieldKey]: {
        ...getFieldPosition(fieldKey),
        [axis]: cleanValue === "" || cleanValue === "-" ? cleanValue : Number(cleanValue) || 0,
      },
    }));
  };

  const handleFieldDragStart = (event, fieldKey) => {
    if (event.button !== undefined && event.button !== 0) return;

    handleSelectTextTarget("field", fieldKey);
    const position = getFieldPosition(fieldKey);
    dragFieldRef.current = {
      fieldKey,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: Number(position.x) || 0,
      originY: Number(position.y) || 0,
    };

    event.currentTarget.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  };

  const handleFieldDragMove = (event) => {
    const drag = dragFieldRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    if (drag.mode === "resize") {
      setFieldSizes((prev) => ({
        ...prev,
        [drag.fieldKey]: {
          width: Math.max(80, Math.round(drag.originWidth + event.clientX - drag.startX)),
          height: Math.max(18, Math.round(drag.originHeight + event.clientY - drag.startY)),
        },
      }));
      return;
    }

    setFieldPositions((prev) => ({
      ...prev,
      [drag.fieldKey]: {
        x: snapToVerticalGuide(`field:${drag.fieldKey}`, Math.round(drag.originX + event.clientX - drag.startX)),
        y: Math.round(drag.originY + event.clientY - drag.startY),
      },
    }));
  };

  const handleFieldDragEnd = (event) => {
    const drag = dragFieldRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    event.currentTarget.releasePointerCapture?.(event.pointerId);
    dragFieldRef.current = null;
    setAlignmentGuideX(null);
  };



  const handleFieldResizeStart = (event, fieldKey) => {
    if (event.button !== undefined && event.button !== 0) return;

    const size = getFieldSize(fieldKey);
    dragFieldRef.current = {
      mode: "resize",
      fieldKey,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originWidth: Number(size.width) || 240,
      originHeight: Number(size.height) || 22,
    };

    event.currentTarget.setPointerCapture?.(event.pointerId);
    event.stopPropagation();
    event.preventDefault();
  };

  const getCodeItem = (itemKey) => codeLayout[itemKey] || getDefaultCodeLayout()[itemKey];

  const getCodeItemStyle = (itemKey, { draggable = false } = {}) => {
    const item = getCodeItem(itemKey);
    return {
      position: "absolute",
      left: `${Number(item.x) || 0}px`,
      top: `${Number(item.y) || 0}px`,
      width: `${Math.max(24, Number(item.width) || 24)}px`,
      height: `${Math.max(18, Number(item.height) || 18)}px`,
      cursor: draggable ? "move" : undefined,
      touchAction: draggable ? "none" : undefined,
      userSelect: draggable ? "none" : undefined,
      zIndex: itemKey === "qr" ? 5 : 4,
    };
  };

  const updateCodeLayoutValue = (itemKey, field, value) => {
    const cleanValue = String(value ?? "").replace(/[^0-9.-]/g, "");

    setCodeLayout((prev) => {
      const current = prev[itemKey] || getDefaultCodeLayout()[itemKey];
      const parsed = cleanValue === "" || cleanValue === "-" ? cleanValue : Number(cleanValue) || 0;

      return {
        ...prev,
        [itemKey]: {
          ...current,
          [field]: ["width", "height"].includes(field) ? Math.max(1, Number(parsed) || 1) : parsed,
        },
      };
    });
  };

  const resetCodeLayout = () => {
    setCodeLayout(getDefaultCodeLayout());
  };

  const handleImportLogoFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;
    if (!file.type?.startsWith("image/")) {
      window.alert("Please select a valid image file for the logo.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setLogoDataUrl(String(reader.result || ""));
      setShowLogo(true);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setShowLogo(false);
    setLogoDataUrl("");
    setLogoLayout(getDefaultLogoLayout());
  };

  const getLogoStyle = ({ draggable = false } = {}) => ({
    position: "absolute",
    left: `${Number(logoLayout.x) || 0}px`,
    top: `${Number(logoLayout.y) || 0}px`,
    width: `${Math.max(24, Number(logoLayout.width) || 96)}px`,
    height: `${Math.max(18, Number(logoLayout.height) || 34)}px`,
    cursor: draggable ? "move" : undefined,
    touchAction: draggable ? "none" : undefined,
    userSelect: draggable ? "none" : undefined,
    zIndex: 15,
  });

  const handleLogoDragStart = (event) => {
    if (!isEditMode) return;
    if (event.button !== undefined && event.button !== 0) return;

    dragLogoRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: Number(logoLayout.x) || 0,
      originY: Number(logoLayout.y) || 0,
    };

    event.currentTarget.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  };

  const handleLogoDragMove = (event) => {
    const drag = dragLogoRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    setLogoLayout((prev) => {
      if (drag.mode === "resize") {
        return {
          ...prev,
          width: Math.max(24, Math.round(drag.originWidth + event.clientX - drag.startX)),
          height: Math.max(18, Math.round(drag.originHeight + event.clientY - drag.startY)),
        };
      }

      return {
        ...prev,
        x: Math.round(drag.originX + event.clientX - drag.startX),
        y: Math.round(drag.originY + event.clientY - drag.startY),
      };
    });
  };

  const handleLogoDragEnd = (event) => {
    const drag = dragLogoRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    event.currentTarget.releasePointerCapture?.(event.pointerId);
    dragLogoRef.current = null;
  };

  const handleLogoResizeStart = (event) => {
    if (!isEditMode) return;
    if (event.button !== undefined && event.button !== 0) return;

    dragLogoRef.current = {
      mode: "resize",
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originWidth: Number(logoLayout.width) || 96,
      originHeight: Number(logoLayout.height) || 34,
    };

    event.currentTarget.setPointerCapture?.(event.pointerId);
    event.stopPropagation();
    event.preventDefault();
  };

  const handleCodeDragStart = (event, itemKey) => {
    if (event.button !== undefined && event.button !== 0) return;

    const item = getCodeItem(itemKey);
    dragCodeRef.current = {
      itemKey,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: Number(item.x) || 0,
      originY: Number(item.y) || 0,
    };

    event.currentTarget.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  };

  const handleCodeDragMove = (event) => {
    const drag = dragCodeRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    setCodeLayout((prev) => {
      const current = prev[drag.itemKey] || getDefaultCodeLayout()[drag.itemKey];

      if (drag.mode === "resize") {
        const nextWidth = Math.max(24, Math.round(drag.originWidth + event.clientX - drag.startX));
        const nextHeightRaw = Math.max(18, Math.round(drag.originHeight + event.clientY - drag.startY));

        if (drag.itemKey === "qr") {
          const nextSize = Math.max(32, Math.max(nextWidth, nextHeightRaw));
          return {
            ...prev,
            [drag.itemKey]: {
              ...current,
              width: nextSize,
              height: nextSize,
            },
          };
        }

        return {
          ...prev,
          [drag.itemKey]: {
            ...current,
            width: nextWidth,
            height: nextHeightRaw,
          },
        };
      }

      return {
        ...prev,
        [drag.itemKey]: {
          ...current,
          x: Math.round(drag.originX + event.clientX - drag.startX),
          y: Math.round(drag.originY + event.clientY - drag.startY),
        },
      };
    });
  };

  const handleCodeDragEnd = (event) => {
    const drag = dragCodeRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    event.currentTarget.releasePointerCapture?.(event.pointerId);
    dragCodeRef.current = null;
    setAlignmentGuideX(null);
  };

  const handleCodeResizeStart = (event, itemKey) => {
    if (event.button !== undefined && event.button !== 0) return;

    const item = getCodeItem(itemKey);
    dragCodeRef.current = {
      mode: "resize",
      itemKey,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originWidth: Number(item.width) || getDefaultCodeLayout()[itemKey].width,
      originHeight: Number(item.height) || getDefaultCodeLayout()[itemKey].height,
    };

    event.currentTarget.setPointerCapture?.(event.pointerId);
    event.stopPropagation();
    event.preventDefault();
  };

  const getPreviewFieldTransform = (fieldKey) => {
    const position = getFieldPosition(fieldKey);
    return `translate(${Number(position.x) || 0}px, ${Number(position.y) || 0}px)`;
  };


  const getSectionDesignStyle = (sectionKey, { draggable = false } = {}) => {
    const position = sectionPositions[sectionKey] || { x: 0, y: 0 };
    const size = getSectionSize(sectionKey);

    return {
      transform: `translate(${Number(position.x) || 0}px, ${Number(position.y) || 0}px)`,
      width: `${Math.max(90, Number(size.width) || 240)}px`,
      minHeight: `${Math.max(22, Number(size.height) || 32)}px`,
      position: "relative",
      zIndex: Boolean(Number(position.x) || Number(position.y)) ? 8 : 1,
      cursor: draggable ? "grab" : undefined,
      touchAction: draggable ? "none" : undefined,
      userSelect: draggable ? "none" : undefined,
    };
  };

  const handleSectionDragStart = (event, sectionKey) => {
    if (!isEditMode) return;
    if (event.button !== undefined && event.button !== 0) return;

    if (["brand", "company", "asset"].includes(sectionKey)) {
      handleSelectTextTarget("section", sectionKey);
    }

    const position = sectionPositions[sectionKey] || { x: 0, y: 0 };
    dragSectionRef.current = {
      sectionKey,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: Number(position.x) || 0,
      originY: Number(position.y) || 0,
    };

    event.currentTarget.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  };

  const handleSectionDragMove = (event) => {
    const drag = dragSectionRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    if (drag.mode === "resize") {
      setSectionSizes((prev) => {
        const current = prev[drag.sectionKey] || getDefaultSectionSizes()[drag.sectionKey];
        return {
          ...prev,
          [drag.sectionKey]: {
            ...current,
            width: Math.max(90, Math.round(drag.originWidth + event.clientX - drag.startX)),
            height: Math.max(22, Math.round(drag.originHeight + event.clientY - drag.startY)),
          },
        };
      });
      return;
    }

    setSectionPositions((prev) => ({
      ...prev,
      [drag.sectionKey]: {
        ...(prev[drag.sectionKey] || { x: 0, y: 0 }),
        x: snapToVerticalGuide(`section:${drag.sectionKey}`, Math.round(drag.originX + event.clientX - drag.startX)),
        y: Math.round(drag.originY + event.clientY - drag.startY),
      },
    }));
  };

  const handleSectionDragEnd = (event) => {
    const drag = dragSectionRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    event.currentTarget.releasePointerCapture?.(event.pointerId);
    dragSectionRef.current = null;
    setAlignmentGuideX(null);
  };

  const handleSectionResizeStart = (event, sectionKey) => {
    if (!isEditMode) return;
    if (event.button !== undefined && event.button !== 0) return;

    const size = getSectionSize(sectionKey);
    dragSectionRef.current = {
      mode: "resize",
      sectionKey,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originWidth: Number(size.width) || getDefaultSectionSizes()[sectionKey]?.width || 240,
      originHeight: Number(size.height) || getDefaultSectionSizes()[sectionKey]?.height || 32,
    };

    event.currentTarget.setPointerCapture?.(event.pointerId);
    event.stopPropagation();
    event.preventDefault();
  };

  const getSectionTransformStyle = (sectionKey) => {
    const position = sectionPositions[sectionKey] || { x: 0, y: 0 };
    return {
      transform: `translate(${Number(position.x) || 0}px, ${Number(position.y) || 0}px)`,
    };
  };

  const getPrintTransform = (sectionKey) => {
    const position = sectionPositions[sectionKey] || { x: 0, y: 0 };
    const x = Number(position.x) || 0;
    const y = Number(position.y) || 0;
    return `translate(${x * 0.264583}mm, ${y * 0.264583}mm)`;
  };

  const sectionPositionList = [
    { key: "brand", label: "Header / Brand" },
    { key: "company", label: "Company / Branch" },
    { key: "asset", label: "Asset Description" },
    { key: "fields", label: "Tag Information" },
    { key: "code", label: "QR / Barcode" },
  ];

  const getTagFieldsHtml = (tagInfo) =>
    visibleDisplayFields
      .map((field) => {
        const safeLabel = escapeHtml(field.label);
        const safeValue = escapeHtml(tagInfo[field.key]);
        const emphasisClass = field.emphasis ? "emphasis" : "";

        return `<div class="${emphasisClass}" style="${getTextStyleInlineCss({ type: "field", key: field.key })}"><b>${safeLabel}</b><span>${safeValue}</span></div>`;
      })
      .join("");

  const getTagHtml = (tagInfo) => {
    const safeTagInfo = Object.fromEntries(Object.entries(tagInfo).map(([key, value]) => [key, escapeHtml(value)]));
    const { printQrMarkup, printBarcodeMarkup } = getCodeMarkup(tagInfo);

    return `
      <div class="ppe-tag ${showBorder ? "with-border" : ""}">
        ${showLogo && logoDataUrl ? `<img class="tag-logo" src="${logoDataUrl}" alt="Logo" />` : ""}
        <div class="tag-shell">
          <div class="tag-main">
            <div class="print-section brand-section">
              <div class="brand-row" style="${getTextStyleInlineCss({ type: "section", key: "brand" })}">
                <div class="brand">${escapeHtml(titleText)}</div>
                <div class="tag-title" style="font-size:${Math.max(7, getTextStyle({ type: "section", key: "brand" }).fontSize * 0.55)}px;">${escapeHtml(subtitleText)}</div>
              </div>
            </div>
            <div class="print-section company-section">
              <div class="company-name" style="${getTextStyleInlineCss({ type: "section", key: "company" })}">${safeTagInfo.companyName}</div>
              <div class="branch-name">${safeTagInfo.branchName}</div>
            </div>
            <div class="print-section asset-section">
              <div class="asset-name" style="${getTextStyleInlineCss({ type: "section", key: "asset" })}">${safeTagInfo.assetDescription}</div>
            </div>
            <div class="print-section fields-section">
              <div class="tag-fields">${getTagFieldsHtml(tagInfo)}</div>
            </div>
          </div>
          <div class="code-panel print-section code-section">
            ${showQrCode ? `<div class="qr-box">${printQrMarkup}</div>` : ""}
            ${showBarcode ? `<div class="barcode-box">${printBarcodeMarkup}</div>` : ""}
            ${showBarcode ? `<div class="barcode-text">${safeTagInfo.propertyTagNo}</div>` : ""}
          </div>
        </div>
      </div>
    `;
  };

  const getPreviewPrintScale = () => {
    // The screen preview uses 6px per millimeter. Browser print uses 1px = 0.264583mm.
    // This scale lets the printed fast-layout use the same pixel layout as the modal preview.
    const pxPerMm = 6;
    const mmPerCssPx = 0.264583;
    return 1 / (pxPerMm * mmPerCssPx);
  };

  const getPreviewSectionTransform = (sectionKey) => {
    const position = sectionPositions[sectionKey] || { x: 0, y: 0 };
    const x = Number(position.x) || 0;
    const y = Number(position.y) || 0;
    return `translate(${x}px, ${y}px)`;
  };

  const getPreviewLikeTagHtml = (tagInfo) => {
    const safeTagInfo = Object.fromEntries(Object.entries(tagInfo).map(([key, value]) => [key, escapeHtml(value)]));
    const { printQrMarkup, printBarcodeMarkup } = getCodeMarkup(tagInfo);
    const previewWidthPx = numericFinalWidth * 6;
    const previewHeightPx = numericFinalHeight * 6;

    const fieldRows = visibleDisplayFields
      .map((field) => {
        const emphasisClass = field.emphasis ? "emphasis" : "";
        return `
          <div class="preview-field-row ${emphasisClass}" style="transform:${getPreviewFieldTransform(field.key)};position:relative;grid-template-columns:${getTextStyle({ type: "field", key: field.key }).wrapText ? "86px minmax(0, 1fr)" : "86px max-content"};${getTextStyleInlineCss({ type: "field", key: field.key })}">
            <span class="preview-field-label">${escapeHtml(field.label)}</span>
            <span class="preview-field-value">${escapeHtml(tagInfo[field.key] || "-")}</span>
          </div>`;
      })
      .join("");

    return `
      <div class="preview-tag-box" style="width:${previewWidthPx}px;height:${previewHeightPx}px;">
        <div class="preview-tag-inner ${showBorder ? "with-border" : ""}">
          ${showLogo && logoDataUrl ? `<img class="preview-logo" src="${logoDataUrl}" alt="Logo" />` : ""}
          <div class="preview-shell">
            <div class="preview-main">
              <div class="preview-brand-row" style="transform:${getPreviewSectionTransform("brand")};${getTextStyleInlineCss({ type: "section", key: "brand" })}">
                <div class="preview-brand">${escapeHtml(titleText)}</div>
                <div class="preview-title" style="font-size:${Math.max(9, getTextStyle({ type: "section", key: "brand" }).fontSize * 0.55)}px;">${escapeHtml(subtitleText)}</div>
              </div>

              <div class="preview-company" style="transform:${getPreviewSectionTransform("company")};${getTextStyleInlineCss({ type: "section", key: "company" })}">
                <div class="preview-company-name">${safeTagInfo.companyName}</div>
                <div class="preview-branch-name" style="font-size:${Math.max(8, getTextStyle({ type: "section", key: "company" }).fontSize * 0.85)}px;">${safeTagInfo.branchName}</div>
              </div>

              <div class="preview-asset-name" style="transform:${getPreviewSectionTransform("asset")};${getTextStyleInlineCss({ type: "section", key: "asset" })}">
                ${safeTagInfo.assetDescription}
              </div>

              <div class="preview-fields" style="transform:${getPreviewSectionTransform("fields")};">
                ${fieldRows}
              </div>
            </div>

            <div class="preview-code" style="transform:${getPreviewSectionTransform("code")};">
              ${showQrCode ? `<div class="preview-qr-box" style="left:${Number(getCodeItem("qr").x) || 0}px;top:${Number(getCodeItem("qr").y) || 0}px;width:${Math.max(24, Number(getCodeItem("qr").width) || 144)}px;height:${Math.max(24, Number(getCodeItem("qr").height) || 144)}px;">
                ${printQrMarkup}
              </div>` : ""}
              ${showBarcode ? `<div class="preview-barcode-box" style="left:${Number(getCodeItem("barcode").x) || 0}px;top:${Number(getCodeItem("barcode").y) || 0}px;width:${Math.max(24, Number(getCodeItem("barcode").width) || 168)}px;height:${Math.max(18, Number(getCodeItem("barcode").height) || 51)}px;">
                ${printBarcodeMarkup}
              </div>` : ""}
              ${showBarcode ? `<div class="preview-barcode-text" style="left:${Number(getCodeItem("barcode").x) || 0}px;top:${(Number(getCodeItem("barcode").y) || 0) + Math.max(18, Number(getCodeItem("barcode").height) || 51) + 4}px;width:${Math.max(24, Number(getCodeItem("barcode").width) || 168)}px;">${safeTagInfo.propertyTagNo}</div>` : ""}
            </div>
          </div>
        </div>
      </div>
    `;
  };

  const getPreviewPrintCss = () => {
    const previewWidthPx = numericFinalWidth * 6;
    const previewHeightPx = numericFinalHeight * 6;
    const fitScale = getPreviewPrintScale();

    return `
      @page { size: ${numericFinalWidth}mm ${numericFinalHeight}mm; margin: 0; }
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; background: #ffffff; }
            .print-page {
        width: ${numericFinalWidth}mm;
        height: ${numericFinalHeight}mm;
        margin: 0;
        padding: 0;
        overflow: hidden;
        background: #ffffff;
        position: relative;
      }
      body.per-page .print-page { page-break-after: always; break-after: page; }
      body.per-page .print-page:last-child { page-break-after: auto; break-after: auto; }
            .print-fit {
        width: ${previewWidthPx}px;
        height: ${previewHeightPx}px;
        transform: scale(${fitScale});
        transform-origin: left top;
      }
      .preview-tag-box {
        background: #ffffff;
        box-shadow: none;
        font-family: Aptos, Arial, sans-serif;
        color: #0f172a;
        overflow: hidden;
      }
      .preview-tag-inner {
        position: relative;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background: #ffffff;
        padding: 18px;
        color: #0f172a;
      }
      .preview-tag-inner.with-border {
        border: 2px solid #1f2937;
        border-radius: 8px;
      }
      .preview-logo {
        position: absolute;
        left: ${Number(logoLayout.x) || 0}px;
        top: ${Number(logoLayout.y) || 0}px;
        width: ${Math.max(24, Number(logoLayout.width) || 96)}px;
        height: ${Math.max(18, Number(logoLayout.height) || 34)}px;
        object-fit: contain;
        z-index: 20;
      }
      .preview-shell {
        height: 100%;
        display: grid;
        grid-template-columns: 1fr 174px;
        gap: 18px;
      }
      .preview-main {
        min-width: 0;
        padding-right: 15px;
      }
      .preview-brand-row {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 12px;
        padding-bottom: 8px;
      }
      .preview-brand {
        font-weight: 900;
        line-height: 1;
        color: inherit;
      }
      .preview-title {
        white-space: nowrap;
        font-weight: 900;
        line-height: 1;
        color: #0f172a;
      }
      .preview-company { margin-top: 8px; }
      .preview-company-name {
        overflow: visible;
        text-overflow: unset;
        white-space: nowrap;
        font-weight: 800;
        line-height: 1.12;
        color: #0f172a;
      }
      .preview-branch-name {
        overflow: visible;
        text-overflow: unset;
        white-space: nowrap;
        line-height: 1.12;
        color: #475569;
      }
      .preview-asset-name {
        margin: 12px 0;
        min-height: 38px;
        overflow: visible;
        font-weight: 800;
        line-height: 1.16;
        color: #0f172a;
      }
      .preview-fields {
        display: flex;
        flex-direction: column;
        gap: 4px;
        line-height: 1.12;
      }
      .preview-field-row {
        display: inline-grid;
        grid-template-columns: 86px max-content;
        gap: 8px;
        align-items: baseline;
        min-width: max-content;
      }
      .preview-field-label {
        font-weight: 800;
        color: #334155;
        white-space: nowrap;
      }
      .preview-field-value {
        min-width: max-content;
        overflow: visible;
        text-overflow: unset;
        white-space: nowrap;
        font-weight: 700;
        color: #0f172a;
      }
      .preview-brand,
      .preview-title,
      .preview-company-name,
      .preview-branch-name,
      .preview-asset-name,
      .preview-field-label,
      .preview-field-value {
        line-height: inherit;
        padding-top: 3px;
        padding-bottom: 5px;
        overflow: visible;
        text-decoration: none;
      }

      .preview-field-row.emphasis .preview-field-value {
        color: #b91c1c;
      }
      .preview-code {
        min-width: 0;
        position: relative;
        height: 100%;
      }
      .preview-qr-box {
        position: absolute;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid #111827;
        background: #ffffff;
        padding: 6px;
      }
      .preview-qr-box svg {
        display: block;
        width: 100%;
        height: 100%;
      }
      .preview-barcode-box {
        position: absolute;
        overflow: hidden;
        background: #ffffff;
      }
      .preview-barcode-box svg {
        display: block;
        width: 100%;
        height: 100%;
      }
      .preview-barcode-text {
        position: absolute;
        overflow: visible;
        text-overflow: unset;
        white-space: nowrap;
        text-align: center;
        font-size: 12px;
        font-weight: 900;
        line-height: 1;
        color: #0f172a;
      }
    `;
  };

  const printTagWithCss = () => {
    if (tagInfos.length === 0) return;

    const printWindow = window.open("", "_blank", "width=600,height=500");
    if (!printWindow) return;

    const tagTitle = isMultipleTags
      ? `Property Tags - ${tagInfos.length} Tags`
      : `Property Tag - ${tagInfos[0]?.propertyTagNo || ""}`;

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>${escapeHtml(tagTitle)}</title>
          <style>${getPreviewPrintCss()}</style>
        </head>
        <body class="per-page">
          ${tagInfos.map((tagInfo) => `<div class="print-page"><div class="print-fit">${getPreviewLikeTagHtml(tagInfo)}</div></div>`).join("")}
          <script>
            window.onload = function () {
              setTimeout(function () {
                window.focus();
                window.print();
              }, 180);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };


  const loadImage = (imageUrl) =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = imageUrl;
    });

  const dataUrlToBlob = async (dataUrl) => {
    const response = await fetch(dataUrl);
    return response.blob();
  };

  const downloadBlob = (blob, fileName) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const getOutputStamp = () => {
    const now = new Date();
    return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
  };

  const cleanFilePart = (value, fallback = "tag") =>
    String(value || fallback)
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .replace(/_+/g, "_")
      .slice(0, 80) || fallback;

  const waitForProgressPaint = () => new Promise((resolve) => setTimeout(resolve, 0));

  const updateOutputProgress = async (percent) => {
    const nextPercent = Math.max(1, Math.min(100, Math.round(Number(percent) || 1)));
    setOutputProgress(nextPercent);
    await waitForProgressPaint();
  };

  const captureOutputTagImage = async (tagInfo) => capturePreviewTag(tagInfo);
  const captureOutputSheetImage = async (pageIndex, onProgress) => captureSheetPreviewPage(pageIndex, onProgress);

  const mmToPrintPx = (mm, dpiValue = PRINT_DPI) => Math.round((Number(mm) || 0) * (Number(dpiValue) || 200) / 25.4);

  const getTagPngExportSize = () => ({
    width: Math.max(1, mmToPrintPx(numericFinalWidth, PRINT_DPI)),
    height: Math.max(1, mmToPrintPx(numericFinalHeight, PRINT_DPI)),
  });

  const resizeDataUrlToPng = async (imageUrl, targetWidth, targetHeight) => {
    const image = await loadImage(imageUrl);
    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, targetWidth, targetHeight);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(image, 0, 0, targetWidth, targetHeight);

    return canvas.toDataURL("image/png");
  };

  const capturePngExportTagImage = async (tagInfo) => {
    const capturedImageUrl = await captureOutputTagImage(tagInfo);
    const { width, height } = getTagPngExportSize();
    return resizeDataUrlToPng(capturedImageUrl, width, height);
  };

  const capturePreviewTag = async (tagInfo) => {
    const element = tagPreviewRefs.current[tagInfo.rowKey];

    if (!element) {
      throw new Error("PPE tag preview content was not found.");
    }

    await document.fonts?.ready;
    await new Promise((resolve) => window.requestAnimationFrame(() => resolve()));

    // Capture the actual tag design at high resolution.
    // Do not stretch the clone to paper pixels here because that changes the layout.
    // Instead, keep the current preview proportions and increase html2canvas scale.
    // Sheet printing will place this sharp tag image into the correct sheet cell.
    const rect = element.getBoundingClientRect();
    const captureWidth = Math.ceil(Math.max(element.scrollWidth, rect.width));
    const captureHeight = Math.ceil(Math.max(element.scrollHeight, rect.height));

    const captureHost = document.createElement("div");
    captureHost.style.position = "fixed";
    captureHost.style.left = "-100000px";
    captureHost.style.top = "0";
    captureHost.style.width = `${captureWidth}px`;
    captureHost.style.height = `${captureHeight}px`;
    captureHost.style.overflow = "hidden";
    captureHost.style.background = "#ffffff";
    captureHost.style.zIndex = "-1";

    const clone = element.cloneNode(true);
    clone.style.width = `${captureWidth}px`;
    clone.style.minWidth = `${captureWidth}px`;
    clone.style.maxWidth = "none";
    clone.style.height = `${captureHeight}px`;
    clone.style.minHeight = `${captureHeight}px`;
    clone.style.flex = "0 0 auto";
    clone.style.boxShadow = "none";
    clone.style.borderRadius = "0";
    clone.style.overflow = "hidden";
    clone.style.backgroundColor = "#ffffff";

    clone.querySelectorAll(".ppe-edit-control").forEach((element) => element.remove());

    captureHost.appendChild(clone);
    document.body.appendChild(captureHost);

    try {
      const canvas = await html2canvas(clone, {
        onclone: (clonedDocument) => {
          clonedDocument.querySelectorAll(".ppe-edit-control").forEach((element) => element.remove());
        },
        scale: HIGH_RES_TAG_CAPTURE_SCALE,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        removeContainer: true,
        logging: false,
        width: captureWidth,
        height: captureHeight,
        windowWidth: captureWidth,
        windowHeight: captureHeight,
        scrollX: 0,
        scrollY: 0,
      });

      if (!canvas.width || !canvas.height) {
        throw new Error("PPE tag preview capture is empty.");
      }

      return canvas.toDataURL("image/png");
    } finally {
      document.body.removeChild(captureHost);
    }
  };

  const composeHighResolutionSheetPage = async (page, pageIndex, onProgress) => {
    const sheetPixelWidth = Math.round(sheetPaper.width * PRINT_PX_PER_MM);
    const sheetPixelHeight = Math.round(sheetPaper.height * PRINT_PX_PER_MM);
    const marginPx = Math.round(numericSheetMarginMm * PRINT_PX_PER_MM);
    const gapPx = Math.round(numericSheetGapMm * PRINT_PX_PER_MM);
    const cellWidthPx = Math.floor((sheetPixelWidth - (marginPx * 2) - (gapPx * (sheetLayout.columns - 1))) / sheetLayout.columns);
    const cellHeightPx = Math.floor((sheetPixelHeight - (marginPx * 2) - (gapPx * (sheetLayout.rows - 1))) / sheetLayout.rows);
    const totalCells = sheetLayout.columns * sheetLayout.rows;
    const paddedPage = [
      ...page,
      ...Array.from({ length: Math.max(0, totalCells - page.length) }, (_, index) => ({
        rowKey: `empty-print-${pageIndex}-${index}`,
        isEmpty: true,
      })),
    ];

    const canvas = document.createElement("canvas");
    canvas.width = sheetPixelWidth;
    canvas.height = sheetPixelHeight;

    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, sheetPixelWidth, sheetPixelHeight);

    ctx.save();
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = Math.max(1, Math.round(0.25 * PRINT_PX_PER_MM));
    ctx.setLineDash([Math.max(4, Math.round(1.4 * PRINT_PX_PER_MM)), Math.max(3, Math.round(1.0 * PRINT_PX_PER_MM))]);

    for (let cellIndex = 0; cellIndex < totalCells; cellIndex += 1) {
      const col = cellIndex % sheetLayout.columns;
      const row = Math.floor(cellIndex / sheetLayout.columns);
      const x = marginPx + (col * (cellWidthPx + gapPx));
      const y = marginPx + (row * (cellHeightPx + gapPx));
      ctx.strokeRect(x, y, cellWidthPx, cellHeightPx);
    }
    ctx.restore();

    const realTagCount = page.filter((item) => !item?.isEmpty).length || 1;
    let renderedTagCount = 0;

    for (let cellIndex = 0; cellIndex < paddedPage.length; cellIndex += 1) {
      const tagInfo = paddedPage[cellIndex];
      if (tagInfo.isEmpty) continue;

      onProgress?.({
        pageIndex,
        renderedTagCount,
        realTagCount,
        phase: "capture",
      });

      const col = cellIndex % sheetLayout.columns;
      const row = Math.floor(cellIndex / sheetLayout.columns);
      const x = marginPx + (col * (cellWidthPx + gapPx));
      const y = marginPx + (row * (cellHeightPx + gapPx));

      const tagImageUrl = await capturePreviewTag(tagInfo);
      const tagImage = await loadImage(tagImageUrl);
      const imageRatio = tagImage.width / tagImage.height;
      const cellRatio = cellWidthPx / cellHeightPx;
      let drawWidth = cellWidthPx;
      let drawHeight = cellHeightPx;

      if (imageRatio > cellRatio) {
        drawWidth = cellWidthPx;
        drawHeight = Math.round(cellWidthPx / imageRatio);
      } else {
        drawHeight = cellHeightPx;
        drawWidth = Math.round(cellHeightPx * imageRatio);
      }

      const drawX = x + Math.round((cellWidthPx - drawWidth) / 2);
      const drawY = y + Math.round((cellHeightPx - drawHeight) / 2);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(tagImage, drawX, drawY, drawWidth, drawHeight);

      renderedTagCount += 1;
      onProgress?.({
        pageIndex,
        renderedTagCount,
        realTagCount,
        phase: "draw",
      });
      await waitForProgressPaint();
    }

    onProgress?.({
      pageIndex,
      renderedTagCount: realTagCount,
      realTagCount,
      phase: "page-complete",
    });

    return canvas.toDataURL("image/png");
  };

  const captureSheetPreviewPage = async (pageIndex, onProgress) => {
    const page = sheetPreviewPages[pageIndex] || [];

    if (!Array.isArray(page)) {
      throw new Error("PPE tag sheet page was not found.");
    }

    return composeHighResolutionSheetPage(page, pageIndex, onProgress);
  };

  const printTag = async () => {
    if (tagInfos.length === 0 || isCapturingPrint) return;

    // Render first using the same high-resolution PNG engine used by Download PDF.
    // Open the print preview only after the images are ready, so users do not see a blank waiting page.
    let printWindow = null;
    const tagTitle = isMultipleTags
      ? `Property Tags - ${tagInfos.length} Tags`
      : `Property Tag - ${tagInfos[0]?.propertyTagNo || ""}`;

    setIsCapturingPrint(true);
    setOutputAction("Preparing print preview");
    setOutputProgress(1);

    try {
      const capturedTags = [];
      const capturedSheetPages = [];

      if (printOutputMode === "sheet") {
        const totalPages = Math.max(1, sheetPreviewPages.length);
        const totalTagsForProgress = Math.max(1, tagInfos.length);
        let renderedTagCount = 0;

        for (let pageIndex = 0; pageIndex < totalPages; pageIndex += 1) {
          setOutputAction(`Rendering print sheet ${pageIndex + 1} of ${totalPages}`);

          capturedSheetPages.push({
            title: `Sheet ${pageIndex + 1}`,
            imageUrl: await captureSheetPreviewPage(pageIndex, (progressInfo) => {
              if (progressInfo?.phase === "capture") {
                const renderedSoFar = renderedTagCount + (progressInfo.renderedTagCount || 0);
                const progressValue = Math.min(94, Math.round(5 + ((renderedSoFar / totalTagsForProgress) * 88)));
                setOutputProgress(Math.max(1, progressValue));
              } else if (progressInfo?.phase === "page-complete") {
                renderedTagCount += progressInfo.realTagCount || 0;
                const progressValue = Math.min(94, Math.round(5 + ((renderedTagCount / totalTagsForProgress) * 88)));
                setOutputProgress(Math.max(1, progressValue));
              }
            }),
          });

          await waitForProgressPaint();
        }

        setOutputProgress(95);
      } else {
        const totalTags = Math.max(1, tagInfos.length);

        for (let index = 0; index < tagInfos.length; index += 1) {
          const tagInfo = tagInfos[index];

          setOutputAction(`Rendering print image ${index + 1} of ${totalTags}`);
          setOutputProgress(Math.max(1, Math.round(5 + ((index / totalTags) * 88))));

          capturedTags.push({
            title: tagInfo.propertyTagNo,
            imageUrl: await capturePngExportTagImage(tagInfo),
          });

          await waitForProgressPaint();
        }

        setOutputProgress(95);
      }

      const renderLabelPrintHtml = () => `
        <!doctype html>
        <html>
          <head>
            <title>${escapeHtml(tagTitle)}</title>
            <style>
              @page { size: ${numericFinalWidth}mm ${numericFinalHeight}mm; margin: 0; }
              * { box-sizing: border-box; }
              html, body { margin: 0; padding: 0; background: #ffffff; }
              .print-note {
                position: fixed;
                top: 8px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 9999;
                padding: 6px 10px;
                border: 1px solid #dbeafe;
                border-radius: 999px;
                background: #eff6ff;
                color: #1d4ed8;
                font: 700 11px Aptos, Arial, sans-serif;
                box-shadow: 0 6px 18px rgba(15, 23, 42, 0.12);
              }
              @media print { .print-note { display: none; } }
                            .print-page {
                width: ${numericFinalWidth}mm;
                height: ${numericFinalHeight}mm;
                margin: 0;
                padding: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
                background: #ffffff;
              }
              body.per-page .print-page { page-break-after: always; break-after: page; }
              body.per-page .print-page:last-child { page-break-after: auto; break-after: auto; }
                            .tag-image { width: ${numericFinalWidth}mm; height: ${numericFinalHeight}mm; display: block; object-fit: fill; margin: 0; padding: 0; }
            </style>
          </head>
          <body class="per-page">
            <div class="print-note">Recommended: Scale 100%, disable Fit to Page, and use the correct paper size.</div>
            ${capturedTags.map((item) => `<div class="print-page"><img class="tag-image" src="${item.imageUrl}" alt="${escapeHtml(item.title)}" /></div>`).join("")}
            <script>window.onload=function(){setTimeout(function(){window.focus();window.print();},150);};</script>
          </body>
        </html>
      `;

      const renderSheetPrintHtml = () => `
        <!doctype html>
        <html>
          <head>
            <title>${escapeHtml(tagTitle)}</title>
            <style>
              @page { size: ${sheetPaper.width}mm ${sheetPaper.height}mm; margin: 0; }
              * { box-sizing: border-box; }
              html, body { margin: 0; padding: 0; background: #ffffff; }
              .print-note {
                position: fixed;
                top: 8px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 9999;
                padding: 6px 10px;
                border: 1px solid #dbeafe;
                border-radius: 999px;
                background: #eff6ff;
                color: #1d4ed8;
                font: 700 11px Aptos, Arial, sans-serif;
                box-shadow: 0 6px 18px rgba(15, 23, 42, 0.12);
              }
              @media print { .print-note { display: none; } }
              .sheet-page {
                width: ${sheetPaper.width}mm;
                height: ${sheetPaper.height}mm;
                margin: 0;
                padding: 0;
                display: flex;
                align-items: stretch;
                justify-content: stretch;
                overflow: hidden;
                break-after: page;
                page-break-after: always;
                background: #ffffff;
              }
              .sheet-page:last-child { break-after: auto; page-break-after: auto; }
              .sheet-page-image { width: 100%; height: 100%; display: block; object-fit: fill; margin: 0; padding: 0; }
            </style>
          </head>
          <body>
            <div class="print-note">Recommended: Scale 100%, disable Fit to Page, and use the correct paper size.</div>
            ${capturedSheetPages.map((item) => `<div class="sheet-page"><img class="sheet-page-image" src="${item.imageUrl}" alt="${escapeHtml(item.title)}" /></div>`).join("")}
            <script>window.onload=function(){setTimeout(function(){window.focus();window.print();},150);};</script>
          </body>
        </html>
      `;

      setOutputAction("Opening print preview");
      setOutputProgress(98);

      printWindow = window.open("", "_blank", "width=900,height=700");
      if (!printWindow) {
        window.alert("Print preview was blocked. Please allow popups for this site.");
        return;
      }

      printWindow.document.open();
      printWindow.document.write(printOutputMode === "sheet" ? renderSheetPrintHtml() : renderLabelPrintHtml());
      printWindow.document.close();

      setOutputProgress(100);
    } catch (error) {
      console.error("PPE tag exact preview print failed:", error);

      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(`
          <!doctype html>
          <html>
            <body style="font-family:Aptos, Arial, sans-serif;padding:20px;color:#b91c1c;">
              <b>PPE tag print failed.</b><br />
              Please try again.
            </body>
          </html>
        `);
        printWindow.document.close();
      } else {
        window.alert(error?.message || "Unable to prepare print preview.");
      }
    } finally {
      setTimeout(() => {
        setIsCapturingPrint(false);
        setOutputAction("");
        setOutputProgress(0);
      }, 250);
    }
  };


  const handleDownloadPdf = async () => {
    if (tagInfos.length === 0 || isCapturingPrint) return;

    setIsCapturingPrint(true);
    setIsDownloadMenuOpen(false);
    setOutputAction("Preparing PDF");
    await updateOutputProgress(1);

    try {
      setOutputAction("Loading PDF engine");
      await updateOutputProgress(3);

      const jsPdfModule = await import("jspdf");
      const JsPDF = jsPdfModule.jsPDF || jsPdfModule.default;

      if (!JsPDF) {
        throw new Error("jsPDF library was not found. Please install it using npm install jspdf.");
      }

      const stamp = getOutputStamp();
      await updateOutputProgress(5);

      if (printOutputMode === "sheet") {
        const totalPages = Math.max(1, sheetPreviewPages.length);
        const totalTagsForProgress = Math.max(1, tagInfos.length);
        let renderedTagsForProgress = 0;

        const pdf = new JsPDF({
          orientation: sheetPaper.width > sheetPaper.height ? "landscape" : "portrait",
          unit: "mm",
          format: [sheetPaper.width, sheetPaper.height],
          compress: false,
        });

        for (let pageIndex = 0; pageIndex < sheetPreviewPages.length; pageIndex += 1) {
          setOutputAction(`Rendering sheet ${pageIndex + 1} of ${totalPages}`);

          if (pageIndex > 0) {
            pdf.addPage([sheetPaper.width, sheetPaper.height], sheetPaper.width > sheetPaper.height ? "landscape" : "portrait");
          }

          const imageUrl = await captureOutputSheetImage(pageIndex, ({ phase, renderedTagCount, realTagCount }) => {
            const pageStartTagCount = sheetPreviewPages
              .slice(0, pageIndex)
              .reduce((sum, rows) => sum + rows.length, 0);
            renderedTagsForProgress = Math.min(totalTagsForProgress, pageStartTagCount + Math.max(0, renderedTagCount || 0));
            const capturePercent = 5 + ((renderedTagsForProgress / totalTagsForProgress) * 78);
            setOutputProgress(Math.max(1, Math.min(88, Math.round(capturePercent))));

            if (phase === "capture") {
              setOutputAction(`Rendering sheet ${pageIndex + 1} of ${totalPages}`);
            } else if (phase === "draw") {
              setOutputAction(`Composing sheet ${pageIndex + 1} of ${totalPages}`);
            }
          });

          setOutputAction(`Adding sheet ${pageIndex + 1} to PDF`);
          await updateOutputProgress(88 + (((pageIndex + 1) / totalPages) * 8));
          pdf.addImage(imageUrl, "PNG", 0, 0, sheetPaper.width, sheetPaper.height, undefined, "NONE");
        }

        setOutputAction("Saving PDF");
        await updateOutputProgress(98);
        pdf.save(`PPE-Tags-Sheet-${sheetLayout.value || sheetTagCount}-${stamp}.pdf`);
        await updateOutputProgress(100);
        return;
      }

      const totalTags = Math.max(1, tagInfos.length);
      const pdf = new JsPDF({
        orientation: numericFinalWidth > numericFinalHeight ? "landscape" : "portrait",
        unit: "mm",
        format: [numericFinalWidth, numericFinalHeight],
        compress: false,
      });

      for (let index = 0; index < tagInfos.length; index += 1) {
        setOutputAction(`Rendering tag ${index + 1} of ${totalTags}`);
        await updateOutputProgress(5 + ((index / totalTags) * 78));

        if (index > 0) {
          pdf.addPage([numericFinalWidth, numericFinalHeight], numericFinalWidth > numericFinalHeight ? "landscape" : "portrait");
        }

        const imageUrl = await captureOutputTagImage(tagInfos[index]);
        setOutputAction(`Adding tag ${index + 1} to PDF`);
        pdf.addImage(imageUrl, "PNG", 0, 0, numericFinalWidth, numericFinalHeight, undefined, "NONE");
        await updateOutputProgress(5 + (((index + 1) / totalTags) * 90));
      }

      setOutputAction("Saving PDF");
      await updateOutputProgress(98);
      pdf.save(`PPE-Tags-${stamp}.pdf`);
      await updateOutputProgress(100);
    } catch (error) {
      console.error("PPE tag PDF download failed:", error);
      window.alert(error?.message || "Unable to download PPE tag PDF.");
    } finally {
      setTimeout(() => {
        setIsCapturingPrint(false);
        setOutputAction("");
        setOutputProgress(0);
      }, 450);
    }
  };

  const handleDownloadPdfFromPng = async () => {
    if (tagInfos.length === 0 || isCapturingPrint) return;

    setIsCapturingPrint(true);
    setIsDownloadMenuOpen(false);
    setOutputAction("Preparing PNG-based PDF");
    await updateOutputProgress(1);

    try {
      setOutputAction("Loading PDF engine");
      await updateOutputProgress(3);

      const jsPdfModule = await import("jspdf");
      const JsPDF = jsPdfModule.jsPDF || jsPdfModule.default;

      if (!JsPDF) {
        throw new Error("jsPDF library was not found. Please install it using npm install jspdf.");
      }

      const stamp = getOutputStamp();
      await updateOutputProgress(5);

      if (printOutputMode === "sheet") {
        const totalPages = Math.max(1, sheetPreviewPages.length);
        const totalTagsForProgress = Math.max(1, tagInfos.length);
        let renderedTagCount = 0;

        const pdf = new JsPDF({
          orientation: sheetPaper.width > sheetPaper.height ? "landscape" : "portrait",
          unit: "mm",
          format: [sheetPaper.width, sheetPaper.height],
          compress: false,
        });

        for (let pageIndex = 0; pageIndex < totalPages; pageIndex += 1) {
          setOutputAction(`Rendering sheet PNG ${pageIndex + 1} of ${totalPages}`);

          const imageUrl = await captureSheetPreviewPage(pageIndex, (progressInfo) => {
            if (progressInfo?.phase === "capture") {
              const renderedSoFar = renderedTagCount + (progressInfo.renderedTagCount || 0);
              const progressValue = Math.min(94, Math.round(8 + ((renderedSoFar / totalTagsForProgress) * 82)));
              setOutputProgress(Math.max(1, progressValue));
            } else if (progressInfo?.phase === "page-complete") {
              renderedTagCount += progressInfo.realTagCount || 0;
              const progressValue = Math.min(94, Math.round(8 + ((renderedTagCount / totalTagsForProgress) * 82)));
              setOutputProgress(Math.max(1, progressValue));
            }
          });

          if (pageIndex > 0) {
            pdf.addPage([sheetPaper.width, sheetPaper.height], sheetPaper.width > sheetPaper.height ? "landscape" : "portrait");
          }

          pdf.addImage(imageUrl, "PNG", 0, 0, sheetPaper.width, sheetPaper.height, undefined, "NONE");
          await waitForProgressPaint();
        }

        setOutputAction("Converting sheet PNG to PDF");
        await updateOutputProgress(98);
        pdf.save(`PPE-Tags-PNG-Based-${stamp}.pdf`);
      } else {
        const totalTags = Math.max(1, tagInfos.length);

        const pdf = new JsPDF({
          orientation: numericFinalWidth > numericFinalHeight ? "landscape" : "portrait",
          unit: "mm",
          format: [numericFinalWidth, numericFinalHeight],
          compress: false,
        });

        for (let index = 0; index < tagInfos.length; index += 1) {
          const tagInfo = tagInfos[index];
          setOutputAction(`Rendering PNG ${index + 1} of ${totalTags}`);
          setOutputProgress(Math.max(1, Math.round(8 + ((index / totalTags) * 82))));

          const imageUrl = await capturePngExportTagImage(tagInfo);

          if (index > 0) {
            pdf.addPage([numericFinalWidth, numericFinalHeight], numericFinalWidth > numericFinalHeight ? "landscape" : "portrait");
          }

          pdf.addImage(imageUrl, "PNG", 0, 0, numericFinalWidth, numericFinalHeight, undefined, "NONE");
          await waitForProgressPaint();
        }

        setOutputAction("Converting PNG to PDF");
        await updateOutputProgress(98);
        pdf.save(`PPE-Tags-PNG-Based-${stamp}.pdf`);
      }

      await updateOutputProgress(100);
    } catch (error) {
      console.error("PPE tag PNG-based PDF download failed:", error);
      window.alert(error?.message || "Unable to download PNG-based PPE tag PDF.");
    } finally {
      setTimeout(() => {
        setIsCapturingPrint(false);
        setOutputAction("");
        setOutputProgress(0);
      }, 450);
    }
  };

  const handleDownloadPngZip = async () => {
    if (tagInfos.length === 0 || isCapturingPrint) return;

    setIsCapturingPrint(true);
    setIsDownloadMenuOpen(false);
    setOutputAction("Preparing PNG ZIP");
    setOutputProgress(1);

    try {
      const zipModule = await import("jszip");
      const JSZip = zipModule.default || zipModule;

      if (!JSZip) {
        throw new Error("JSZip library was not found. Please install it using npm install jszip.");
      }

      const zip = new JSZip();
      const stamp = getOutputStamp();
      const totalTags = Math.max(1, tagInfos.length);
      const pngExportSize = getTagPngExportSize();

      zip.file(
        "README.txt",
        `PPE Tag PNG Export\nTag Size: ${numericFinalWidth}mm x ${numericFinalHeight}mm\nDPI: ${PRINT_DPI}\nPNG Size: ${pngExportSize.width}px x ${pngExportSize.height}px\nNote: PNG files are exported at the selected tag size converted to pixels. For guaranteed physical print size, use Download PDF.\n`
      );

      for (let index = 0; index < tagInfos.length; index += 1) {
        const tagInfo = tagInfos[index];
        setOutputAction(`Rendering PNG ${index + 1} of ${totalTags}`);
        setOutputProgress(Math.max(1, Math.round(1 + ((index / totalTags) * 80))));

        const imageUrl = await capturePngExportTagImage(tagInfo);
        const imageBlob = await dataUrlToBlob(imageUrl);
        const fileName = `${String(index + 1).padStart(3, "0")}-${cleanFilePart(tagInfo.propertyTagNo, "PPE-Tag")}-${pngExportSize.width}x${pngExportSize.height}.png`;

        zip.file(fileName, imageBlob);
        setOutputProgress(Math.max(1, Math.round(1 + (((index + 1) / totalTags) * 84))));
        await waitForProgressPaint();
      }

      const zipBlob = await zip.generateAsync(
        { type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } },
        (metadata) => {
          const zipPercent = 85 + Math.round((metadata.percent || 0) * 0.15);
          setOutputProgress(Math.min(99, zipPercent));
        }
      );

      setOutputProgress(100);
      downloadBlob(zipBlob, `PPE-Tags-PNG-${stamp}.zip`);
    } catch (error) {
      console.error("PPE tag PNG ZIP download failed:", error);
      window.alert(error?.message || "Unable to download PPE tag PNG ZIP.");
    } finally {
      setTimeout(() => {
        setIsCapturingPrint(false);
        setOutputAction("");
        setOutputProgress(0);
      }, 250);
    }
  };

  const getQzTray = async () => {
    if (qzRef.current) return qzRef.current;

    const module = await import("qz-tray");
    const qz = module.default || module;

    if (qz?.api?.setPromiseType) {
      qz.api.setPromiseType((resolver) => new Promise(resolver));
    }

    qzRef.current = qz;
    return qz;
  };

  const connectQzTray = async () => {
    const qz = await getQzTray();

    if (qz.websocket.isActive()) {
      setQzStatus("QZ Tray already connected.");
      return qz;
    }

    const isSecure = typeof window !== "undefined" && window.location.protocol === "https:";

    try {
      // IMPORTANT:
      // host must NOT include the port. QZ Tray appends the port internally.
      // Correct: host: "127.0.0.1" + port: { insecure: [8182] }
      // Wrong:   host: "127.0.0.1:8182" because it becomes ws://127.0.0.1:8182:8182
      await qz.websocket.connect({
        host: isSecure
          ? ["localhost.qz.io", "localhost", "127.0.0.1"]
          : ["127.0.0.1", "localhost", "localhost.qz.io"],
        port: {
          secure: [8181, 8282, 8383, 8484],
          insecure: [8182, 8283, 8384, 8485],
        },
        usingSecure: isSecure,
        retries: 2,
        delay: 1,
      });

      setQzStatus("QZ Tray connected.");
      return qz;
    } catch (error) {
      setQzStatus("Unable to connect to QZ Tray. Make sure QZ Tray is running near the Windows clock.");
      throw error;
    }
  };


  const handleLoadQzPrinters = async () => {
    setIsQzBusy(true);

    try {
      const qz = await connectQzTray();
      const printers = await qz.printers.find();
      const printerList = Array.isArray(printers) ? printers : [printers].filter(Boolean);

      setQzPrinters(printerList);
      setSelectedQzPrinter((prev) => prev || printerList[0] || "");
      setQzStatus(printerList.length > 0 ? `${printerList.length} printer(s) loaded.` : "No printer found.");
    } catch (error) {
      setQzStatus(`QZ Tray is not running or is not listening on ${getQzEndpointLabel()}.`);
      console.warn("QZ Tray connection failed:", error?.message || error);
    } finally {
      setIsQzBusy(false);
    }
  };

  const buildQzConfig = (qz) =>
    qz.configs.create(selectedQzPrinter, {
      units: "mm",
      size: {
        width: numericFinalWidth,
        height: numericFinalHeight,
      },
      margins: 0,
      orientation,
      scaleContent: false,
      rasterize: false,
    });

  const buildPrintableHtml = () => {
    const tagTitle = isMultipleTags
      ? `Property Tags - ${tagInfos.length} Tags`
      : `Property Tag - ${tagInfos[0]?.propertyTagNo || ""}`;

    return `
      <!doctype html>
      <html>
        <head>
          <title>${escapeHtml(tagTitle)}</title>
          <style>
            @page { size: ${numericFinalWidth}mm ${numericFinalHeight}mm; margin: 0; }
            * { box-sizing: border-box; }
            :root { --tag-scale: ${scaleFactor}; }
            html, body { margin: 0; padding: 0; font-family: Aptos, Arial, sans-serif; color: #111827; background: #fff; }
                        .print-page { width: ${numericFinalWidth}mm; height: ${numericFinalHeight}mm; display: flex; align-items: center; justify-content: center; overflow: hidden; }
            body.per-page .print-page { page-break-after: always; break-after: page; }
            body.per-page .print-page:last-child { page-break-after: auto; break-after: auto; }
                        .ppe-tag { position: relative; width: ${numericFinalWidth}mm; height: ${numericFinalHeight}mm; padding: 3mm; overflow: hidden; background: #fff; }
            .tag-logo { position: absolute; left: ${(Number(logoLayout.x) || 0) * 0.264583}mm; top: ${(Number(logoLayout.y) || 0) * 0.264583}mm; width: ${Math.max(24, Number(logoLayout.width) || 96) * 0.264583}mm; height: ${Math.max(18, Number(logoLayout.height) || 34) * 0.264583}mm; object-fit: contain; z-index: 20; }
            .ppe-tag.with-border { border: 0.35mm solid #111827; border-radius: 1.8mm; }
            .tag-shell { height: 100%; display: grid; grid-template-columns: 1fr 29mm; gap: 3mm; align-items: stretch; }
            .tag-main { min-width: 0; padding-right: 2.5mm; }
            .print-section { position: relative; }
            .brand-section { transform: ${getPrintTransform("brand")}; }
            .company-section { transform: ${getPrintTransform("company")}; }
            .asset-section { transform: ${getPrintTransform("asset")}; }
            .fields-section { transform: ${getPrintTransform("fields")}; }
            .code-section { transform: ${getPrintTransform("code")}; }
            .brand-row { display: flex; align-items: baseline; justify-content: space-between; gap: 2mm; padding-bottom: 1mm; }
            .brand { font-size: inherit; font-weight: inherit; font-style: inherit; font-family: inherit; color: inherit; text-decoration: none; letter-spacing: 0; line-height: 1; }
            .tag-title { font-weight: inherit; font-style: inherit; font-family: inherit; color: inherit; text-decoration: none; line-height: 1; white-space: nowrap; }
            .company-name { margin-top: 1.4mm; line-height: 1.08; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .branch-name { margin-top: 0.4mm; font-size: ${6 * scaleFactor}pt; color: #475569; line-height: 1.05; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .asset-name { margin: 1.7mm 0 1.5mm; min-height: 6.2mm; line-height: 1.42; overflow: visible; padding-top: 0.6mm; padding-bottom: 0.9mm; }
            .tag-fields { line-height: 1.25; overflow: visible; }
            .tag-fields div { display: inline-grid; grid-template-columns: 14.5mm max-content; gap: 1.4mm; align-items: baseline; min-width: max-content; }
            .tag-fields b { font-weight: inherit; color: #334155; white-space: nowrap; }
            .tag-fields span { min-width: max-content; overflow: visible; text-overflow: unset; white-space: nowrap; font-weight: inherit; }
            .tag-fields div.emphasis span { color: #b91c1c; }
            .code-panel { display: flex; min-width: 0; flex-direction: column; align-items: center; justify-content: flex-start; }
            .qr-box { width: 24mm; height: 24mm; padding: 1mm; border: 0.3mm solid #111827; background: #fff; }
            .qr-box svg { display: block; width: 100%; height: 100%; }
            .barcode-box { width: 28mm; height: 8.5mm; margin-top: 2mm; overflow: hidden; background: #fff; }
            .barcode-box svg { display: block; width: 100%; height: 100%; }
            .barcode-text { width: 28mm; margin-top: 0.7mm; text-align: center; font-size: ${5.6 * scaleFactor}pt; font-weight: 900; line-height: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          </style>
        </head>
        <body class="per-page">
          ${tagInfos.map((tagInfo) => `<div class="print-page">${getTagHtml(tagInfo)}</div>`).join("")}
        </body>
      </html>
    `;
  };

  const zplSafe = (value) =>
    String(value ?? "")
      .replace(/[\^~]/g, " ")
      .replace(/[\r\n]+/g, " ")
      .trim();

  const mmToDots = (mm, dpiValue = qzDpi) => Math.round((Number(mm) || 0) * (Number(dpiValue) || 203) / 25.4);

  const buildZplTag = (tagInfo) => {
    const dpi = Number(qzDpi) || 203;
    const widthDots = mmToDots(numericFinalWidth, dpi);
    const heightDots = mmToDots(numericFinalHeight, dpi);
    const scale = Math.max(0.6, Math.min(1.4, scaleFactor));
    const brandTextStyle = getTextStyle({ type: "section", key: "brand" });
    const companyTextStyle = getTextStyle({ type: "section", key: "company" });
    const assetTextStyle = getTextStyle({ type: "section", key: "asset" });
    const x = mmToDots(3, dpi);
    const y = mmToDots(3, dpi);
    const qrX = widthDots - mmToDots(30, dpi);
    const qrY = mmToDots(5, dpi);
    const barcodeY = heightDots - mmToDots(14, dpi);
    const qrZpl = showQrCode
      ? `^FO${qrX},${qrY}^BQN,2,4^FDQA,${zplSafe(tagInfo.propertyTagNo)}^FS`
      : "";
    const barcodeZpl = showBarcode
      ? `^FO${qrX - mmToDots(2, dpi)},${barcodeY}^BY2,2,${Math.round(42 * scale)}^BCN,${Math.round(42 * scale)},N,N,N^FD${zplSafe(tagInfo.propertyTagNo)}^FS
^FO${qrX - mmToDots(2, dpi)},${heightDots - mmToDots(5, dpi)}^A0N,${Math.round(15 * scale)},${Math.round(14 * scale)}^FD${zplSafe(tagInfo.propertyTagNo).slice(0, 24)}^FS`
      : "";
    const fields = visibleDisplayFields
      .slice(0, 6)
      .map((field, index) => {
        const yy = y + mmToDots(22 + index * 4.4, dpi);
        const label = zplSafe(field.label).slice(0, 15);
        const value = zplSafe(tagInfo[field.key]).slice(0, 32);
        const fieldStyle = getTextStyle({ type: "field", key: field.key });
        return `^FO${x},${yy}^A0N,${Math.round((Number(fieldStyle.fontSize) || 12) * scale)},${Math.round((Number(fieldStyle.fontSize) || 12) * 0.92 * scale)}^FD${label}: ${value}^FS`;
      })
      .join("\n");

    return `
^XA
^PW${widthDots}
^LL${heightDots}
^CI28
^FO${x},${y}^A0N,${Math.round((Number(brandTextStyle.fontSize) || 28) * scale)},${Math.round((Number(brandTextStyle.fontSize) || 28) * 0.92 * scale)}^FD${zplSafe(titleText).slice(0, 22)}^FS
^FO${x + mmToDots(28, dpi)},${y + mmToDots(1, dpi)}^A0N,${Math.round(Math.max(10, (Number(brandTextStyle.fontSize) || 28) * 0.55) * scale)},${Math.round(Math.max(9, (Number(brandTextStyle.fontSize) || 28) * 0.5) * scale)}^FD${zplSafe(subtitleText).slice(0, 28)}^FS
^FO${x},${y + mmToDots(7, dpi)}^GB${widthDots - mmToDots(36, dpi)},2,2^FS
^FO${x},${y + mmToDots(10, dpi)}^A0N,${Math.round((Number(companyTextStyle.fontSize) || 14) * scale)},${Math.round((Number(companyTextStyle.fontSize) || 14) * 0.95 * scale)}^FD${zplSafe(tagInfo.companyName).slice(0, 40)}^FS
^FO${x},${y + mmToDots(15, dpi)}^A0N,${Math.round((Number(assetTextStyle.fontSize) || 15) * scale)},${Math.round((Number(assetTextStyle.fontSize) || 15) * 0.95 * scale)}^FD${zplSafe(tagInfo.assetDescription).slice(0, 42)}^FS
${fields}
${qrZpl}
${barcodeZpl}
^XZ
`;
  };

  const handleQzPrint = async () => {
    if (!selectedQzPrinter) {
      window.alert("Please load QZ printers and select a printer first.");
      return;
    }

    if (tagInfos.length === 0 || isQzBusy) return;

    setIsQzBusy(true);

    try {
      const qz = await connectQzTray();
      const config = buildQzConfig(qz);
      let data = [];

      if (qzPrintType === "zpl") {
        data = [
          {
            type: "raw",
            format: "command",
            flavor: "plain",
            data: tagInfos.map((tagInfo) => buildZplTag(tagInfo)).join("\n"),
          },
        ];
      } else if (qzPrintType === "html") {
        data = [
          {
            type: "pixel",
            format: "html",
            flavor: "plain",
            data: buildPrintableHtml(),
          },
        ];
      } else {
        const capturedTags = [];

        for (const tagInfo of tagInfos) {
          const imageUrl = await capturePreviewTag(tagInfo);
          capturedTags.push(imageUrl.replace(/^data:image\/png;base64,/, ""));
        }

        data = capturedTags.map((imageBase64) => ({
          type: "pixel",
          format: "image",
          flavor: "base64",
          data: imageBase64,
        }));
      }

      await qz.print(config, data);
      setQzStatus(`Print job sent to ${selectedQzPrinter}.`);
    } catch (error) {
      console.error("QZ print failed:", error);
      setQzStatus("QZ print failed. Check QZ Tray, printer name, and printer driver.");
      window.alert(error?.message || "Unable to print using QZ Tray.");
    } finally {
      setIsQzBusy(false);
    }
  };

  const renderDisplayField = (tagInfo, field) => (
    <div
      key={field.key}
      className={`inline-grid gap-2 rounded px-1 py-0.5 ${
        isEditMode ? "cursor-grab ring-blue-300 hover:bg-blue-50/80 hover:ring-2 active:cursor-grabbing" : ""
      } ${isEditMode && selectedTextTarget?.type === "field" && selectedTextTarget?.key === field.key ? "ring-2 ring-emerald-400" : ""}`}
      style={{
        ...getFieldTransformStyle(field.key, { draggable: isEditMode }),
        gridTemplateColumns: getTextStyle({ type: "field", key: field.key }).wrapText ? "86px minmax(0, 1fr)" : "86px max-content",
        ...getTextStyleCss({ type: "field", key: field.key }),
      }}
      onClick={isEditMode ? () => handleSelectTextTarget("field", field.key) : undefined}
      onPointerDown={isEditMode ? (event) => handleFieldDragStart(event, field.key) : undefined}
      onPointerMove={isEditMode ? handleFieldDragMove : undefined}
      onPointerUp={isEditMode ? handleFieldDragEnd : undefined}
      onPointerCancel={isEditMode ? handleFieldDragEnd : undefined}
      title={isEditMode ? "Drag this field to adjust its print position" : "Switch to Edit Mode to move this field"}
    >
      <span className="text-slate-700" style={{ ...getTextStyleCss({ type: "field", key: field.key }), overflow: "visible", whiteSpace: "nowrap", display: "inline" }}>{field.label}</span>
      <span
        className=""
        style={getTextStyleCss({ type: "field", key: field.key })}
      >
        {tagInfo[field.key] || "-"}
      </span>
      {isEditMode && (
        <span
          className="ppe-edit-control absolute bottom-[-6px] right-[-6px] h-3.5 w-3.5 cursor-nwse-resize rounded-sm border border-blue-700 bg-white shadow ring-1 ring-blue-200"
          title="Drag to resize this field"
          onPointerDown={(event) => handleFieldResizeStart(event, field.key)}
          onPointerMove={handleFieldDragMove}
          onPointerUp={handleFieldDragEnd}
          onPointerCancel={handleFieldDragEnd}
        />
      )}
    </div>
  );

  const renderPreviewTag = (tagInfo) => {
    const { qrValue, tagNoValue } = getCodeMarkup(tagInfo);

    return (
      <div
        key={tagInfo.rowKey}
        ref={(element) => {
          if (element) tagPreviewRefs.current[tagInfo.rowKey] = element;
          else delete tagPreviewRefs.current[tagInfo.rowKey];
        }}
        className="bg-white shadow-lg"
        style={previewStyle}
      >
        <div className={`relative h-full w-full overflow-hidden bg-white p-[18px] text-slate-900 ${showBorder ? "rounded-lg border-2 border-slate-800" : ""}`}>
          {isEditMode && (
            <div
              className="ppe-edit-control pointer-events-none absolute inset-0 z-20"
              style={{
                backgroundImage:
                  "linear-gradient(to right, rgba(37, 99, 235, 0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(37, 99, 235, 0.18) 1px, transparent 1px), linear-gradient(to right, rgba(37, 99, 235, 0.35) 1px, transparent 1px), linear-gradient(to bottom, rgba(37, 99, 235, 0.35) 1px, transparent 1px)",
                backgroundSize: "10px 10px, 10px 10px, 50px 50px, 50px 50px",
              }}
            />
          )}
          {isEditMode && alignmentGuideX !== null && (
            <div
              className="ppe-edit-control pointer-events-none absolute bottom-0 top-0 z-30 border-l-2 border-dashed border-emerald-500"
              style={{ left: `${18 + Number(alignmentGuideX)}px` }}
            />
          )}
          {showLogo && logoDataUrl && (
            <div
              className={`ring-blue-300 ${isEditMode ? "hover:ring-2" : ""}`}
              style={getLogoStyle({ draggable: isEditMode })}
              onPointerDown={isEditMode ? handleLogoDragStart : undefined}
              onPointerMove={isEditMode ? handleLogoDragMove : undefined}
              onPointerUp={isEditMode ? handleLogoDragEnd : undefined}
              onPointerCancel={isEditMode ? handleLogoDragEnd : undefined}
              title={isEditMode ? "Drag logo to move it" : undefined}
            >
              <img src={logoDataUrl} alt="Logo" className="h-full w-full object-contain" draggable={false} />
              {isEditMode && (
                <span
                  className="ppe-edit-control absolute bottom-[-7px] right-[-7px] h-4 w-4 cursor-nwse-resize rounded-sm border border-blue-700 bg-white shadow ring-1 ring-blue-200"
                  title="Drag to resize logo"
                  onPointerDown={handleLogoResizeStart}
                  onPointerMove={handleLogoDragMove}
                  onPointerUp={handleLogoDragEnd}
                  onPointerCancel={handleLogoDragEnd}
                />
              )}
            </div>
          )}
          <div className="relative z-10 grid h-full grid-cols-[1fr_174px] gap-[18px]">
            <div className="min-w-0 pr-[15px]">
              <div
                style={{
                  ...(isEditMode ? getSectionDesignStyle("brand", { draggable: true }) : getSectionTransformStyle("brand")),
                  ...getTextStyleCss({ type: "section", key: "brand" }),
                }}
                className={`flex items-baseline justify-between gap-3 pb-2 ring-blue-300 ${isEditMode ? "cursor-grab rounded px-1 hover:bg-blue-50/80 hover:ring-2 active:cursor-grabbing" : ""} ${isEditMode && selectedTextTarget?.type === "section" && selectedTextTarget?.key === "brand" ? "ring-2 ring-emerald-400" : ""}`}
                onClick={isEditMode ? () => handleSelectTextTarget("section", "brand") : undefined}
                onPointerDown={isEditMode ? (event) => handleSectionDragStart(event, "brand") : undefined}
                onPointerMove={isEditMode ? handleSectionDragMove : undefined}
                onPointerUp={isEditMode ? handleSectionDragEnd : undefined}
                onPointerCancel={isEditMode ? handleSectionDragEnd : undefined}
                title={isEditMode ? "Drag to move header / brand section" : undefined}
              >
                <div className="leading-none" style={getTextStyleCss({ type: "section", key: "brand" })}>{titleText}</div>
                <div
                  className="whitespace-nowrap leading-none"
                  style={{
                    ...getTextStyleCss({ type: "section", key: "brand" }),
                    fontSize: `${Math.max(9, (Number(getTextStyle({ type: "section", key: "brand" }).fontSize) || 28) * 0.55)}px`,
                  }}
                >
                  {subtitleText}
                </div>
                {isEditMode && (
                  <span
                    className="ppe-edit-control absolute bottom-[-7px] right-[-7px] h-4 w-4 cursor-nwse-resize rounded-sm border border-blue-700 bg-white shadow ring-1 ring-blue-200"
                    title="Resize header / brand section"
                    onPointerDown={(event) => handleSectionResizeStart(event, "brand")}
                    onPointerMove={handleSectionDragMove}
                    onPointerUp={handleSectionDragEnd}
                    onPointerCancel={handleSectionDragEnd}
                  />
                )}
              </div>

              <div
                style={{
                  ...(isEditMode ? getSectionDesignStyle("company", { draggable: true }) : getSectionTransformStyle("company")),
                  minHeight: `${Math.max(getSectionSize("company").height || 38, getTextMinimumHeight({ type: "section", key: "company" }))}px`,
                  ...getTextStyleCss({ type: "section", key: "company" }),
                }}
                className={`ring-blue-300 ${isEditMode ? "cursor-grab rounded px-1 hover:bg-blue-50/80 hover:ring-2 active:cursor-grabbing" : ""} ${isEditMode && selectedTextTarget?.type === "section" && selectedTextTarget?.key === "company" ? "ring-2 ring-emerald-400" : ""}`}
                onClick={isEditMode ? () => handleSelectTextTarget("section", "company") : undefined}
                onPointerDown={isEditMode ? (event) => handleSectionDragStart(event, "company") : undefined}
                onPointerMove={isEditMode ? handleSectionDragMove : undefined}
                onPointerUp={isEditMode ? handleSectionDragEnd : undefined}
                onPointerCancel={isEditMode ? handleSectionDragEnd : undefined}
                title={isEditMode ? "Drag to move company information" : undefined}
              >
                <div className="mt-2 leading-tight" style={getTextStyleCss({ type: "section", key: "company" })}>{tagInfo.companyName}</div>
                <div
                  className="leading-tight text-slate-600"
                  style={{
                    ...getTextStyleCss({ type: "section", key: "company" }),
                    fontSize: `${Math.max(8, (Number(getTextStyle({ type: "section", key: "company" }).fontSize) || 14) * 0.85)}px`,
                  }}
                >
                  {tagInfo.branchName}
                </div>
                {isEditMode && (
                  <span
                    className="ppe-edit-control absolute bottom-[-7px] right-[-7px] h-4 w-4 cursor-nwse-resize rounded-sm border border-blue-700 bg-white shadow ring-1 ring-blue-200"
                    title="Resize company information"
                    onPointerDown={(event) => handleSectionResizeStart(event, "company")}
                    onPointerMove={handleSectionDragMove}
                    onPointerUp={handleSectionDragEnd}
                    onPointerCancel={handleSectionDragEnd}
                  />
                )}
              </div>
              <div
                className={`my-3 whitespace-normal leading-snug ring-blue-300 ${isEditMode ? "cursor-grab rounded px-1 hover:bg-blue-50/80 hover:ring-2 active:cursor-grabbing" : ""} ${isEditMode && selectedTextTarget?.type === "section" && selectedTextTarget?.key === "asset" ? "ring-2 ring-emerald-400" : ""}`}
                style={{
                  ...(isEditMode ? getSectionDesignStyle("asset", { draggable: true }) : getSectionTransformStyle("asset")),
                  minHeight: `${Math.max(getSectionSize("asset").height || 46, getTextMinimumHeight({ type: "section", key: "asset" }))}px`,
                  ...getTextStyleCss({ type: "section", key: "asset" }),
                }}
                onClick={isEditMode ? () => handleSelectTextTarget("section", "asset") : undefined}
                onPointerDown={isEditMode ? (event) => handleSectionDragStart(event, "asset") : undefined}
                onPointerMove={isEditMode ? handleSectionDragMove : undefined}
                onPointerUp={isEditMode ? handleSectionDragEnd : undefined}
                onPointerCancel={isEditMode ? handleSectionDragEnd : undefined}
                title={isEditMode ? "Drag to move asset description" : undefined}
              >
                {tagInfo.assetDescription}
                {isEditMode && (
                  <span
                    className="ppe-edit-control absolute bottom-[-7px] right-[-7px] h-4 w-4 cursor-nwse-resize rounded-sm border border-blue-700 bg-white shadow ring-1 ring-blue-200"
                    title="Resize asset description"
                    onPointerDown={(event) => handleSectionResizeStart(event, "asset")}
                    onPointerMove={handleSectionDragMove}
                    onPointerUp={handleSectionDragEnd}
                    onPointerCancel={handleSectionDragEnd}
                  />
                )}
              </div>

              <div className="space-y-1 leading-snug" style={{ ...getSectionTransformStyle("fields"), fontSize: `${12 * scaleFactor}px` }}>
                {visibleDisplayFields.map((field) => renderDisplayField(tagInfo, field))}
              </div>
            </div>

            <div className="relative min-w-0" style={{ ...getSectionTransformStyle("code"), height: "100%" }}>
              {showQrCode && (
                <div
                  className={`relative flex items-center justify-center border-2 border-slate-900 bg-white p-[6px] ring-blue-300 ${
                    isEditMode ? "hover:ring-2" : ""
                  }`}
                  style={getCodeItemStyle("qr", { draggable: isEditMode })}
                  onPointerDown={isEditMode ? (event) => handleCodeDragStart(event, "qr") : undefined}
                  onPointerMove={isEditMode ? handleCodeDragMove : undefined}
                  onPointerUp={isEditMode ? handleCodeDragEnd : undefined}
                  onPointerCancel={isEditMode ? handleCodeDragEnd : undefined}
                  title={isEditMode ? "Drag QR code to move it" : "Switch to Edit Mode to move QR code"}
                >
                  {qrType === "standard" ? (
                    <QRCode
                      value={qrValue}
                      size={Math.max(16, Math.min(getCodeItem("qr").width, getCodeItem("qr").height) - 16)}
                      bgColor="#ffffff"
                      fgColor="#111827"
                      level="M"
                    />
                  ) : (
                    <DottedQRCode
                      value={qrValue}
                      size={Math.max(16, Math.min(getCodeItem("qr").width, getCodeItem("qr").height) - 16)}
                      bgColor="#ffffff"
                      fgColor="#111827"
                      level="M"
                    />
                  )}
                  {isEditMode && (
                    <span
                      className="ppe-edit-control absolute bottom-[-7px] right-[-7px] h-4 w-4 cursor-nwse-resize rounded-sm border border-blue-700 bg-white shadow ring-1 ring-blue-200"
                      title="Drag to resize QR code"
                      onPointerDown={(event) => handleCodeResizeStart(event, "qr")}
                      onPointerMove={handleCodeDragMove}
                      onPointerUp={handleCodeDragEnd}
                      onPointerCancel={handleCodeDragEnd}
                    />
                  )}
                </div>
              )}
              {showBarcode && (
                <>
                  <div
                    className={`relative overflow-hidden bg-white ring-blue-300 ${isEditMode ? "hover:ring-2" : ""}`}
                    style={getCodeItemStyle("barcode", { draggable: isEditMode })}
                    onPointerDown={isEditMode ? (event) => handleCodeDragStart(event, "barcode") : undefined}
                    onPointerMove={isEditMode ? handleCodeDragMove : undefined}
                    onPointerUp={isEditMode ? handleCodeDragEnd : undefined}
                    onPointerCancel={isEditMode ? handleCodeDragEnd : undefined}
                    title={isEditMode ? "Drag barcode to move it" : "Switch to Edit Mode to move barcode"}
                  >
                    <Barcode
                      value={tagNoValue}
                      format="CODE128"
                      height={Math.max(12, Number(getCodeItem("barcode").height) - 9)}
                      width={1.45}
                      margin={0}
                      displayValue={false}
                      background="#ffffff"
                      lineColor="#111827"
                    />
                    {isEditMode && (
                      <span
                        className="ppe-edit-control absolute bottom-[-7px] right-[-7px] h-4 w-4 cursor-nwse-resize rounded-sm border border-blue-700 bg-white shadow ring-1 ring-blue-200"
                        title="Drag to resize barcode"
                        onPointerDown={(event) => handleCodeResizeStart(event, "barcode")}
                        onPointerMove={handleCodeDragMove}
                        onPointerUp={handleCodeDragEnd}
                        onPointerCancel={handleCodeDragEnd}
                      />
                    )}
                  </div>
                  <div
                    className="absolute whitespace-nowrap overflow-visible text-center text-[12px] font-black leading-none"
                    style={{
                      left: `${Number(getCodeItem("barcode").x) || 0}px`,
                      top: `${(Number(getCodeItem("barcode").y) || 0) + Math.max(18, Number(getCodeItem("barcode").height) || 51) + 4}px`,
                      width: `${Math.max(24, Number(getCodeItem("barcode").width) || 168)}px`,
                    }}
                  >
                    {tagNoValue}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSheetPreviewPage = (page, pageIndex) => {
    const totalCells = sheetLayout.columns * sheetLayout.rows;
    const paddedPage = [
      ...page,
      ...Array.from({ length: Math.max(0, totalCells - page.length) }, (_, index) => ({
        rowKey: `empty-${pageIndex}-${index}`,
        isEmpty: true,
      })),
    ];

    return (
      <div
        key={`sheet-page-${pageIndex}`}
        ref={(element) => {
          if (element) sheetPreviewRefs.current[pageIndex] = element;
          else delete sheetPreviewRefs.current[pageIndex];
        }}
        className="bg-white shadow-lg"
        style={{
          width: `${sheetPreviewPaperWidthPx}px`,
          minWidth: `${sheetPreviewPaperWidthPx}px`,
          height: `${sheetPreviewPaperHeightPx}px`,
          minHeight: `${sheetPreviewPaperHeightPx}px`,
          padding: `${sheetPreviewMarginPx}px`,
          display: "grid",
          gridTemplateColumns: `repeat(${sheetLayout.columns}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${sheetLayout.rows}, minmax(0, 1fr))`,
          gap: `${sheetPreviewGapPx}px`,
          flex: "0 0 auto",
        }}
      >
        {paddedPage.map((tagInfo, cellIndex) => (
          <div
            key={tagInfo.rowKey || `sheet-cell-${cellIndex}`}
            className="relative flex items-center justify-center overflow-hidden border border-dashed border-slate-300 bg-white/95"
          >
            {!tagInfo.isEmpty && (
              <div
                style={{
                  width: `${previewPixelWidth}px`,
                  height: `${previewPixelHeight}px`,
                  transform: `scale(${sheetPreviewTagFitScale})`,
                  transformOrigin: "center center",
                  flex: "0 0 auto",
                }}
              >
                {renderPreviewTag(tagInfo)}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderSheetPreview = () => (
    <div className="flex flex-col items-center gap-5">
      {(sheetPreviewPages.length > 0 ? sheetPreviewPages : [[]]).map((page, pageIndex) =>
        renderSheetPreviewPage(page, pageIndex)
      )}
    </div>
  );

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/35 ${isMaximized ? "p-0" : "px-2 py-2"}`}
      style={{ fontFamily: "Aptos, Arial, sans-serif" }}
    >
      <div className={`${modalClassName} ${isMaximized ? "border-0" : "border border-slate-200"} relative bg-white shadow-2xl`}>
        <div className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3 shadow-sm">
          <div className="flex min-w-0 items-center gap-4">
            {!viewMode && (
              <div className="grid shrink-0 grid-cols-2 rounded-xl border border-slate-200 bg-slate-100 p-1 text-[11px] font-extrabold text-slate-600 shadow-inner">
                <button
                  type="button"
                  className={`rounded-lg px-4 py-2 transition ${isEditMode ? "bg-white text-blue-700 shadow-sm" : "hover:bg-white/70"}`}
                  onClick={() => setIsEditMode(true)}
                  title="Design the master tag layout."
                >
                  Design
                </button>
                <button
                  type="button"
                  className={`rounded-lg px-4 py-2 transition ${!isEditMode ? "bg-white text-blue-700 shadow-sm" : "hover:bg-white/70"}`}
                  onClick={() => setIsEditMode(false)}
                  title="Preview all tags using the saved design layout."
                >
                  Preview
                </button>
              </div>
            )}

            <div className="relative min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <h3 className="truncate text-base font-extrabold tracking-tight text-blue-700">
                  {viewMode ? "Property Tag Preview" : isEditMode ? "Property Tag Designer" : (isMultipleTags ? "Property Tags Preview" : "Property Tag Preview")}
                </h3>

                <button
                  type="button"
                  className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-blue-100 bg-blue-50 text-blue-600 transition hover:border-blue-200 hover:bg-blue-100"
                  onClick={() => setShowTagFeatureInfo((prev) => !prev)}
                  onBlur={() => window.setTimeout(() => setShowTagFeatureInfo(false), 180)}
                  title="View property tag designer features"
                >
                  <FontAwesomeIcon icon={faCircleInfo} className="text-[12px]" />
                </button>

                <button
                  type="button"
                  className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50 text-emerald-600 transition hover:border-emerald-200 hover:bg-emerald-100"
                  onClick={() => setShowTagWorkflowInfo((prev) => !prev)}
                  onBlur={() => window.setTimeout(() => setShowTagWorkflowInfo(false), 180)}
                  title="View how the tag workflow works"
                >
                  <FontAwesomeIcon icon={faRoute} className="text-[12px]" />
                </button>
              </div>

              <p className="text-xs font-medium text-slate-500">
                {viewMode
                  ? "Preview the selected fixed property tag using the saved customer label format."
                  : isEditMode
                  ? "Configure one master tag layout and apply it consistently to every selected asset."
                  : isMultipleTags
                    ? `Review, print, and export ${tagInfos.length} fixed property tags using the saved master layout.`
                    : "Review, print, and export the selected fixed property tag using the saved master layout."}
              </p>

              {showTagFeatureInfo && (
                <div className="absolute left-0 top-full z-[80] mt-2 w-[min(92vw,420px)] rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-2xl">
                  <div className="mb-2 flex items-start gap-2">
                    <div className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                      <FontAwesomeIcon icon={faCircleInfo} />
                    </div>
                    <div>
                      <p className="text-sm font-extrabold text-slate-800">Property Tag Designer Features</p>
                      <p className="text-[11px] font-medium leading-relaxed text-slate-500">
                        Design, preview, print, and export property tags with a consistent master layout.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-2 text-[11px] font-semibold text-slate-600 sm:grid-cols-2">
                    <div className="rounded-xl bg-slate-50 p-2">
                      <span className="block font-extrabold text-slate-700">Design Control</span>
                      Move, resize, show/hide fields, logo, QR code, barcode, titles, company details, and asset description.
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2">
                      <span className="block font-extrabold text-slate-700">Font Styling</span>
                      Set font family, size, weight, italic style, color, wrapping, and maximum lines per selected field.
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2">
                      <span className="block font-extrabold text-slate-700">Output Options</span>
                      Generate high-resolution PDF, PNG ZIP, and image-based Print Preview for clearer output.
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2">
                      <span className="block font-extrabold text-slate-700">Layout Formats</span>
                      Save and reload tag formats, including paper size, sheet layout, zoom, logo, positions, and styles.
                    </div>
                  </div>
                </div>
              )}

              {showTagWorkflowInfo && (
                <div className="absolute left-0 top-full z-[80] mt-2 w-[min(92vw,460px)] rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-2xl">
                  <div className="mb-3 flex items-start gap-2">
                    <div className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                      <FontAwesomeIcon icon={faRoute} />
                    </div>
                    <div>
                      <p className="text-sm font-extrabold text-slate-800">How the Tag Workflow Works</p>
                      <p className="text-[11px] font-medium leading-relaxed text-slate-500">
                        A saved master layout controls every selected property tag, then the system exports or prints the final high-resolution output.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 text-[11px] font-semibold text-slate-600">
                    {[
                      { step: "1", title: "Design Master Layout", desc: "Adjust one tag format: paper size, logo, fields, QR/barcode, titles, fonts, colors, and positions." },
                      { step: "2", title: "Apply to Selected Assets", desc: "The same approved layout is automatically used for all selected fixed property tags in Preview mode." },
                      { step: "3", title: "Generate Image Output", desc: "The preview is captured as a high-resolution image to preserve layout, colors, italic fonts, QR code, and barcode quality." },
                      { step: "4", title: "Print or Export", desc: "Use Download PDF, Download PNG ZIP, or Print Preview. PDF and Print Preview use the image-based output for consistent results." },
                    ].map((item, index, rows) => (
                      <div key={item.step} className="grid grid-cols-[28px_1fr] gap-2">
                        <div className="flex flex-col items-center">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-[11px] font-extrabold text-emerald-700 ring-1 ring-emerald-100">
                            {item.step}
                          </div>
                          {index < rows.length - 1 && <div className="mt-1 h-5 border-l border-dashed border-emerald-200" />}
                        </div>
                        <div className="rounded-xl bg-slate-50 p-2">
                          <span className="block font-extrabold text-slate-700">{item.title}</span>
                          <span className="mt-0.5 block font-medium leading-relaxed text-slate-500">{item.desc}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isCapturingPrint && (
              <div className="hidden min-w-[190px] max-w-[260px] rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-bold text-slate-600 shadow-sm sm:block">
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate">{outputAction || "Preparing output"}</span>
                  <span className="shrink-0 tabular-nums">{Math.max(isCapturingPrint ? 1 : 0, Math.min(100, outputProgress))}%</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-blue-100">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all"
                    style={{ width: `${Math.max(isCapturingPrint ? 1 : 0, Math.min(100, outputProgress))}%` }}
                  />
                </div>
              </div>
            )}
            {!viewMode && (
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                onClick={() => setIsMaximized((prev) => !prev)}
                title={isMaximized ? "Restore modal" : "Maximize modal"}
              >
                <FontAwesomeIcon icon={isMaximized ? faCompress : faExpand} />
              </button>
            )}
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
              onClick={onClose}
              title="Close"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
        </div>

        {(isInitialPreviewLoading || isLayoutBusy || isCapturingPrint || isTagRangeLoading) && (
          <div
            className={`absolute inset-x-0 bottom-0 z-[60] flex items-center justify-center ${
              viewMode ? "top-[69px] bg-slate-50" : "top-[78px] bg-white/60 backdrop-blur-[1px]"
            }`}
          >
            {viewMode && (
              <div className="absolute inset-3 rounded-2xl border border-slate-200 bg-slate-100 shadow-inner" />
            )}
            <div className="relative z-10">
              <LoadingSpinner />
            </div>
          </div>
        )}

        <div
          className={`grid gap-4 bg-slate-50 p-3 ${
            isMaximized
              ? "h-[calc(100dvh-58px)]"
              : viewMode
                ? "max-h-[calc(82vh-69px)] overflow-auto"
                : "h-[calc(97vh-58px)]"
          } ${viewMode ? "grid-cols-1" : "lg:grid-cols-[minmax(0,1fr)_320px]"}`}
        >
          <div className="flex min-h-0 flex-col gap-3">
            <div ref={previewViewportRef} className={`relative min-h-0 flex-1 overflow-auto rounded-2xl border border-slate-200 bg-slate-100/80 shadow-inner ${viewMode ? "p-2" : "p-4"}`}>
              <div className="flex min-h-full justify-center" style={previewZoomWrapperStyle}>
                {isEditMode ? (
                  <div className="flex h-full items-center justify-center">
                    {designTagInfo ? renderPreviewTag(designTagInfo) : null}
                  </div>
                ) : printOutputMode === "sheet" ? (
                  renderSheetPreview()
                ) : (
                  <div className={previewGridClass}>{tagInfos.map((tagInfo) => renderPreviewTag(tagInfo))}</div>
                )}
              </div>
            </div>

            {isEditMode && (
              <div className="rounded-2xl border border-blue-100 bg-white px-4 py-3 shadow-sm">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <div className="min-w-0">
                    <p className="text-[11px] font-extrabold uppercase tracking-wide text-blue-700">Selected Tag Format</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">
                        {selectedServerLayout || layoutName || DEFAULT_LAYOUT_NAME}
                      </span>
                      <span>{numericFinalWidth}mm x {numericFinalHeight}mm</span>
                      <span className="text-slate-300">|</span>
                      <span className="capitalize">{orientation}</span>
                      <span className="text-slate-300">|</span>
                      <span>{printOutputMode === "sheet" ? `${sheetPaper.label} / ${sheetLayout.label}` : "Custom Label Printer"}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className="inline-flex h-9 items-center justify-center rounded-lg bg-blue-600 px-4 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700"
                      onClick={() => setIsEditMode(false)}
                      title="Apply the master design and view all tags using this layout."
                    >
                      Apply Changes
                    </button>
                    <button
                      type="button"
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-bold text-slate-600 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={handleSaveLayoutToServer}
                      disabled={isLayoutBusy}
                      title="Save the current design to the selected server format."
                    >
                      <FontAwesomeIcon icon={faFloppyDisk} />
                      Save Format
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {!viewMode && (
          <div className={`min-h-0 overflow-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${isCapturingPrint || isQzBusy || isTagRangeLoading ? "pointer-events-none opacity-60" : ""}`}>
            <div className="mb-4 rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-white p-3">
              <p className="text-sm font-extrabold text-blue-700">{isEditMode ? "Design Settings" : "Print / Preview Settings"}</p>
              <p className="mt-1 text-[11px] font-semibold text-slate-500">Total Tags: <span className="text-slate-800">{tagInfos.length}</span></p>
            </div>

            {!isEditMode && (
              <div className="mb-3 rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-sm">
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-bold text-slate-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50"
                  onClick={() => setShowTagRangeSettings((prev) => !prev)}
                >
                  <span className="inline-flex items-center gap-2">
                    <FontAwesomeIcon icon={faTag} className="text-slate-500" />
                    <span>Property Tag Range</span>
                  </span>
                  <FontAwesomeIcon
                    icon={faChevronDown}
                    className={`text-[10px] text-slate-500 transition-transform ${showTagRangeSettings ? "rotate-180" : ""}`}
                  />
                </button>

                {showTagRangeSettings && (
                  <div className="mt-2 space-y-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <label className="block">
                      <span className="mb-1 block font-semibold text-slate-600">Starting Property Tag No.</span>
                      <input
                        className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        value={startingTagNo}
                        onChange={(event) => setStartingTagNo(event.target.value)}
                        disabled={isTagRangeLoading}
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1 block font-semibold text-slate-600">Ending Property Tag No.</span>
                      <input
                        className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        value={endingTagNo}
                        onChange={(event) => setEndingTagNo(event.target.value)}
                        disabled={isTagRangeLoading}
                      />
                    </label>

                    <button
                      type="button"
                      className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                      onClick={handleLoadTagRange}
                      disabled={isTagRangeLoading || !String(startingTagNo || "").trim() || !String(endingTagNo || "").trim()}
                    >
                      <FontAwesomeIcon icon={faRotateLeft} />
                      {isTagRangeLoading ? "Loading..." : "Load Property Tags"}
                    </button>

                    {tagRangeStatus && (
                      <div className="rounded-md bg-slate-50 px-2 py-1.5 text-[10px] font-semibold text-slate-500">
                        {tagRangeStatus}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="mb-3 rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-sm">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="font-semibold text-slate-600">{activeZoomLabel}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">{resolvedPreviewZoom}%</span>
              </div>

              <input
                type="range"
                min="40"
                max="300"
                step="5"
                className="w-full"
                value={resolvedPreviewZoom}
                onChange={(e) => updateActiveZoom(e.target.value)}
              />
              <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                <span>Zoom Out</span>
                <span>100%</span>
                <span>Zoom In</span>
              </div>
            </div>



            <div className="hidden">
              <button
                type="button"
                className={`rounded-lg px-3 py-2 transition ${isEditMode ? "bg-white text-blue-700 shadow-sm" : "hover:bg-white/70"}`}
                onClick={() => setIsEditMode(true)}
              >
                Design
              </button>
              <button
                type="button"
                className={`rounded-lg px-3 py-2 transition ${!isEditMode ? "bg-white text-blue-700 shadow-sm" : "hover:bg-white/70"}`}
                onClick={() => setIsEditMode(false)}
              >
                Preview
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <label className="block">
                <span className="mb-1 block font-semibold text-slate-600">Paper Size</span>
                <select
                  className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  value={paperPreset}
                  onChange={(e) => handlePaperPresetChange(e.target.value)}
                >
                  {paperPresets.map((preset) => (
                    <option key={preset.label} value={preset.label}>{preset.label}</option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="mb-1 block font-semibold text-slate-600">Width (mm)</span>
                  <input
                    className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    value={paperWidth}
                    onChange={(e) => {
                      setPaperPreset("Custom");
                      setPaperWidth(e.target.value.replace(/[^0-9.]/g, ""));
                    }}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block font-semibold text-slate-600">Height (mm)</span>
                  <input
                    className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    value={paperHeight}
                    onChange={(e) => {
                      setPaperPreset("Custom");
                      setPaperHeight(e.target.value.replace(/[^0-9.]/g, ""));
                    }}
                  />
                </label>
              </div>
              <label className="block">
                <span className="mb-1 block font-semibold text-slate-600">Orientation</span>
                <select
                  className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  value={orientation}
                  onChange={(e) => setOrientation(e.target.value)}
                >
                  <option value="landscape">Landscape</option>
                  <option value="portrait">Portrait</option>
                </select>
              </label>

              <label className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3">
                <input type="checkbox" checked={showBorder} onChange={(e) => setShowBorder(e.target.checked)} />
                <span className="font-semibold text-slate-600">Show Border</span>
              </label>
            {isEditMode && (
              <div className="mt-4 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-bold text-slate-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50"
                  onClick={() => setShowTitleSettings((prev) => !prev)}
                >
                  <span className="inline-flex items-center gap-2">
                    <FontAwesomeIcon icon={faHeading} className="text-slate-500" />
                    <span>Tag Title</span>
                  </span>
                  <FontAwesomeIcon
                    icon={faChevronDown}
                    className={`text-[10px] text-slate-500 transition-transform ${showTitleSettings ? "rotate-180" : ""}`}
                  />
                </button>

                {showTitleSettings && (
                  <div className="mt-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <div className="grid gap-2">
                      <label className="block">
                        <span className="mb-1 block text-[11px] font-semibold text-slate-600">Main Title</span>
                        <input
                          className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                          value={titleText}
                          onChange={(e) => setTitleText(e.target.value)}
                          placeholder="Enter main title"
                          maxLength={40}
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-[11px] font-semibold text-slate-600">Sub Title</span>
                        <input
                          className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                          value={subtitleText}
                          onChange={(e) => setSubtitleText(e.target.value)}
                          placeholder="Enter sub title"
                          maxLength={50}
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}


{isEditMode && (
              <div className="mt-4 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-bold text-slate-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50"
                  onClick={() => setShowFontSettings((prev) => !prev)}
                >
                  <span className="inline-flex items-center gap-2">
                    <FontAwesomeIcon icon={faHeading} className="text-slate-500" />
                    <span>Font Style</span>
                  </span>
                  <FontAwesomeIcon
                    icon={faChevronDown}
                    className={`text-[10px] text-slate-500 transition-transform ${showFontSettings ? "rotate-180" : ""}`}
                  />
                </button>

                {showFontSettings && (
                  <div className="mt-2 rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-sm">
                    <div className="mb-2 rounded-lg bg-blue-50 px-2 py-1.5 text-[10px] font-bold text-blue-700">
                      Selected: {getSelectedTextTargetLabel()}
                    </div>

                    <div className="mb-2 flex flex-wrap gap-1">
                      {[
                        { type: "section", key: "brand", label: "Title" },
                        { type: "section", key: "company", label: "Company" },
                        { type: "section", key: "asset", label: "Asset" },
                      ].map((item) => (
                        <button
                          key={`${item.type}-${item.key}`}
                          type="button"
                          className={`rounded-md border px-2 py-1 text-[10px] font-bold transition ${
                            selectedTextTarget?.type === item.type && selectedTextTarget?.key === item.key
                              ? "border-blue-300 bg-blue-50 text-blue-700"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                          onClick={() => handleSelectTextTarget(item.type, item.key)}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>

                    <label className="block">
                      <span className="mb-1 block font-semibold text-slate-600">Font Family</span>
                      <select
                        className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        value={getTextStyle().fontFamily}
                        onChange={(e) => updateSelectedTextStyle("fontFamily", e.target.value)}
                      >
                        {fontFamilyOptions.map((fontName) => (
                          <option key={fontName} value={fontName}>{fontName}</option>
                        ))}
                      </select>
                    </label>

                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <label className="block">
                        <span className="mb-1 block font-semibold text-slate-600">Font Size</span>
                        <div className="grid grid-cols-[32px_1fr_32px] overflow-hidden rounded-lg border border-slate-300 bg-white">
                          <button
                            type="button"
                            className="h-9 border-r border-slate-200 text-sm font-black text-slate-600 transition hover:bg-slate-50"
                            onClick={() => adjustSelectedFontSize(-1)}
                            title="Decrease font size"
                          >
                            -
                          </button>
                          <input
                            className="h-9 w-full border-0 bg-white px-2 text-center text-xs font-medium outline-none"
                            value={fontSizeDraft ?? String(getTextStyle().fontSize)}
                            onChange={(e) => {
                              const cleanValue = e.target.value.replace(/[^0-9.]/g, "");
                              setFontSizeDraft(cleanValue);
                              if (cleanValue !== "") updateSelectedTextStyle("fontSize", cleanValue);
                            }}
                            onBlur={() => {
                              if (fontSizeDraft === "") setFontSizeDraft(null);
                            }}
                          />
                          <button
                            type="button"
                            className="h-9 border-l border-slate-200 text-sm font-black text-slate-600 transition hover:bg-slate-50"
                            onClick={() => adjustSelectedFontSize(1)}
                            title="Increase font size"
                          >
                            +
                          </button>
                        </div>
                      </label>
                      <label className="block">
                        <span className="mb-1 block font-semibold text-slate-600">Weight</span>
                        <select
                          className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                          value={getTextStyle().fontWeight}
                          onChange={(e) => updateSelectedTextStyle("fontWeight", e.target.value)}
                        >
                          {fontWeightOptions.map((item) => (
                            <option key={item.value} value={item.value}>{item.label}</option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-600">Font Color</span>
                        <span
                          className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold uppercase text-slate-600"
                          title="Selected font color"
                        >
                          {getTextStyle().fontColor || "#0f172a"}
                        </span>
                      </div>

                      <div className="grid grid-cols-5 gap-1.5">
                        {fontColorPresets.map((item) => (
                          <button
                            key={item.value}
                            type="button"
                            className={`group flex h-8 items-center justify-center rounded-lg border transition hover:scale-[1.03] ${
                              String(getTextStyle().fontColor || "").toLowerCase() === item.value.toLowerCase()
                                ? "border-blue-500 ring-2 ring-blue-100"
                                : "border-slate-200"
                            }`}
                            style={{ backgroundColor: item.value }}
                            onClick={() => updateSelectedTextStyle("fontColor", item.value)}
                            title={item.label}
                          >
                            <span className="sr-only">{item.label}</span>
                          </button>
                        ))}
                      </div>

                      <div className="mt-2 grid grid-cols-[1fr_42px] gap-2">
                        <input
                          className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs font-medium uppercase outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                          value={getTextStyle().fontColor || "#0f172a"}
                          onChange={(e) => updateSelectedTextStyle("fontColor", e.target.value)}
                          placeholder="#0F172A"
                          title="Type hex color"
                        />
                        <label
                          className="flex h-9 cursor-pointer items-center justify-center rounded-lg border border-slate-300 bg-white p-1 transition hover:bg-slate-50"
                          title="Open color picker"
                        >
                          <input
                            type="color"
                            className="h-full w-full cursor-pointer border-0 bg-transparent p-0"
                            value={/^#[0-9a-fA-F]{6}$/.test(String(getTextStyle().fontColor || "")) ? getTextStyle().fontColor : "#0f172a"}
                            onChange={(e) => updateSelectedTextStyle("fontColor", e.target.value)}
                          />
                        </label>
                      </div>
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-[11px] font-semibold text-slate-600">
                        <input
                          type="checkbox"
                          checked={getTextStyle().fontStyle === "italic"}
                          onChange={(e) => updateSelectedTextStyle("fontStyle", e.target.checked ? "italic" : "normal")}
                        />
                        Italic
                      </label>

                      <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-[11px] font-semibold text-slate-600">
                        <input
                          type="checkbox"
                          checked={Boolean(getTextStyle().wrapText)}
                          onChange={(e) => updateSelectedTextStyle("wrapText", e.target.checked)}
                        />
                        Wrap Text
                      </label>
                    </div>

                    {getTextStyle().wrapText && (
                      <label className="mt-2 block">
                        <span className="mb-1 block font-semibold text-slate-600">Maximum Lines</span>
                        <div className="grid grid-cols-[32px_1fr_32px] overflow-hidden rounded-lg border border-slate-300 bg-white">
                          <button
                            type="button"
                            className="h-9 border-r border-slate-200 text-sm font-black text-slate-600 transition hover:bg-slate-50"
                            onClick={() => adjustSelectedMaxLines(-1)}
                            title="Decrease maximum lines"
                          >
                            -
                          </button>
                          <input
                            className="h-9 w-full border-0 bg-white px-2 text-center text-xs font-medium outline-none"
                            value={maxLinesDraft ?? String(getTextStyle().maxLines)}
                            onChange={(e) => {
                              const cleanValue = e.target.value.replace(/[^0-9]/g, "");
                              setMaxLinesDraft(cleanValue);
                              if (cleanValue !== "") updateSelectedTextStyle("maxLines", cleanValue);
                            }}
                            onBlur={() => {
                              if (maxLinesDraft === "") setMaxLinesDraft(null);
                            }}
                          />
                          <button
                            type="button"
                            className="h-9 border-l border-slate-200 text-sm font-black text-slate-600 transition hover:bg-slate-50"
                            onClick={() => adjustSelectedMaxLines(1)}
                            title="Increase maximum lines"
                          >
                            +
                          </button>
                        </div>
                      </label>
                    )}

                    <p className="mt-2 text-[10px] font-medium text-slate-500">
                      Click a field or text section on the Design tag, then change the font here. The selected style is saved in the layout JSON.
                    </p>
                  </div>
                )}
              </div>
            )}

            {isEditMode && (
            <div className="mt-4 border-t border-slate-200 pt-4">
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-bold text-slate-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50"
                onClick={() => setShowLogoSettings((prev) => !prev)}
              >
                <span className="inline-flex items-center gap-2">
                  <FontAwesomeIcon icon={faImage} className="text-slate-500" />
                  <span>Logo</span>
                </span>
                <FontAwesomeIcon
                    icon={faChevronDown}
                    className={`text-[10px] text-slate-500 transition-transform ${showLogoSettings ? "rotate-180" : ""}`}
                  />
              </button>

              {showLogoSettings && (
                <div className="mt-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-[10px] font-semibold text-slate-500">Optional image/logo for the tag design.</p>
                    <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-600">
                      <input
                        type="checkbox"
                        checked={showLogo}
                        disabled={!logoDataUrl}
                        onChange={(e) => setShowLogo(e.target.checked)}
                      />
                      Show
                    </label>
                  </div>
                  <input
                    ref={logoImportRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImportLogoFile}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-bold text-slate-600 hover:bg-blue-100"
                      onClick={() => logoImportRef.current?.click()}
                    >
                      <FontAwesomeIcon icon={faImage} />
                      Import Logo
                    </button>
                    <button
                      type="button"
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={!logoDataUrl}
                      onClick={handleRemoveLogo}
                    >
                      <FontAwesomeIcon icon={faRotateLeft} />
                      Remove
                    </button>
                  </div>
                  <div className="mt-3 border-t border-slate-200 pt-3">
                    <p className="mb-2 text-[10px] font-semibold text-slate-500">QR / Barcode Display</p>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-600">
                        <input
                          type="checkbox"
                          checked={showQrCode}
                          onChange={(event) => setShowQrCode(event.target.checked)}
                        />
                        Show QR Code
                      </label>
                      <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-600">
                        <input
                          type="checkbox"
                          checked={showBarcode}
                          onChange={(event) => setShowBarcode(event.target.checked)}
                        />
                        Show Bar Code
                      </label>
                      <label className="block text-[11px] font-semibold text-slate-600">
                        <span className="mb-1 block text-[10px] text-slate-500">QR Type</span>
                        <select
                          className="h-8 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                          value={qrType}
                          disabled={!showQrCode}
                          onChange={(event) => setQrType(event.target.value === "standard" ? "standard" : "dotted")}
                        >
                          <option value="dotted">Dotted</option>
                          <option value="standard">Standard</option>
                        </select>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
            )}


              <div className="mt-4 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-bold text-slate-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50"
                  onClick={() => setShowPrintOutputSettings((prev) => !prev)}
                >
                  <span className="inline-flex items-center gap-2">
                    <FontAwesomeIcon icon={faPrint} className="text-slate-500" />
                    <span>Print Output Type</span>
                  </span>
                  <FontAwesomeIcon
                    icon={faChevronDown}
                    className={`text-[10px] text-slate-500 transition-transform ${showPrintOutputSettings ? "rotate-180" : ""}`}
                  />
                </button>

                {showPrintOutputSettings && (
                  <div className="mt-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <div className="mb-3 grid grid-cols-2 rounded-lg bg-slate-200 p-1 text-[11px] font-bold text-slate-600">
                      <button
                        type="button"
                        className={`rounded-md px-2 py-1.5 transition ${printOutputMode === "label" ? "bg-white text-blue-700 shadow-sm" : "hover:bg-white/60"}`}
                        onClick={() => setPrintOutputMode("label")}
                      >
                        Custom Label Printer
                      </button>
                      <button
                        type="button"
                        className={`rounded-md px-2 py-1.5 transition ${printOutputMode === "sheet" ? "bg-white text-blue-700 shadow-sm" : "hover:bg-white/60"}`}
                        onClick={() => setPrintOutputMode("sheet")}
                      >
                        Normal Printer / Sheet
                      </button>
                    </div>

                    {printOutputMode === "sheet" && (
                      <div className="space-y-2">
                        <label className="block">
                          <span className="mb-1 block font-semibold text-slate-600">Bond Paper Size</span>
                          <select
                            className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                            value={sheetPaperSize}
                            onChange={(e) => setSheetPaperSize(e.target.value)}
                          >
                            {sheetPaperPresets.map((preset) => (
                              <option key={preset.key} value={preset.key}>{preset.label}</option>
                            ))}
                          </select>
                        </label>
                        <label className="block">
                          <span className="mb-1 block font-semibold text-slate-600">Tags Per Sheet</span>
                          <select
                            className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                            value={sheetTagCount}
                            onChange={(e) => setSheetTagCount(e.target.value)}
                          >
                            {sheetTagCountOptions.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <label className="block">
                            <span className="mb-1 block font-semibold text-slate-600">Margin (mm)</span>
                            <input
                              className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                              value={sheetMarginMm}
                              onChange={(e) => setSheetMarginMm(e.target.value.replace(/[^0-9.]/g, ""))}
                            />
                          </label>
                          <label className="block">
                            <span className="mb-1 block font-semibold text-slate-600">Gap (mm)</span>
                            <input
                              className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                              value={sheetGapMm}
                              onChange={(e) => setSheetGapMm(e.target.value.replace(/[^0-9.]/g, ""))}
                            />
                          </label>
                        </div>
                        <label className="block">
                          <span className="mb-1 block font-semibold text-slate-600">PDF Quality</span>
                          <select
                            className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                            value={pdfQualityDpi}
                            onChange={(e) => setPdfQualityDpi(e.target.value)}
                          >
                            <option value="200">Standard / Faster - 200 DPI</option>
                            <option value="300">High Quality - 300 DPI</option>
                          </select>
                        </label>
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>

            {isEditMode && (
            <div className="mt-4 border-t border-slate-200 pt-4">
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-bold text-slate-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50"
                onClick={() => setShowDisplayFields((prev) => !prev)}
              >
                <span className="inline-flex items-center gap-2">
                    <FontAwesomeIcon icon={faFolderOpen} className="text-slate-500" />
                    <span>Display Fields</span>
                  </span>
                <FontAwesomeIcon
                    icon={faChevronDown}
                    className={`text-[10px] text-slate-500 transition-transform ${showDisplayFields ? "rotate-180" : ""}`}
                  />
              </button>

              {showDisplayFields && (
                <div className="mt-2 max-h-64 space-y-1 overflow-auto rounded-xl border border-slate-200 bg-white p-2">
                  {displayFields.map((field) => (
                    <label key={field.key} className="flex cursor-pointer items-center gap-2 rounded-lg bg-slate-50 px-2 py-1.5 text-xs transition hover:bg-blue-50">
                      <input
                        type="checkbox"
                        checked={field.visible}
                        onChange={(e) => handleFieldVisibleChange(field.key, e.target.checked)}
                      />
                      <span className="min-w-0 flex-1 truncate font-semibold text-slate-700">{field.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            )}

            {false && (
            <div className="mt-4 border-t border-slate-200 pt-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-slate-600">Drag Field Position</p>
                  <p className="text-[10px] text-slate-500">
                    Drag each visible field directly inside the tag preview. Positions are saved with the selected template layout.
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-50"
                  onClick={resetFieldPositions}
                >
                  Reset
                </button>
              </div>

              <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-2">
                <div className="rounded-md bg-white px-2 py-1.5 text-[10px] font-semibold text-slate-500">
                  Tip: drag the rows under Tag Information on the preview. Use the X/Y values below only for fine adjustment.
                </div>

                <div className="max-h-52 space-y-1 overflow-auto">
                  {displayFields.map((field) => {
                    const position = getFieldPosition(field.key);

                    return (
                      <div key={field.key} className="grid grid-cols-[1fr_54px_54px] items-center gap-2 rounded-md bg-white px-2 py-1.5 text-xs">
                        <span className={`truncate font-semibold ${field.visible ? "text-slate-700" : "text-slate-400"}`}>
                          {field.label}
                        </span>
                        <input
                          className="w-full rounded border border-slate-300 px-1.5 py-1 text-right"
                          value={position.x ?? 0}
                          onChange={(event) => updateFieldPosition(field.key, "x", event.target.value)}
                          title={`${field.label} X position`}
                        />
                        <input
                          className="w-full rounded border border-slate-300 px-1.5 py-1 text-right"
                          value={position.y ?? 0}
                          onChange={(event) => updateFieldPosition(field.key, "y", event.target.value)}
                          title={`${field.label} Y position`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            )}

            {false && (
            <div className="mt-4 border-t border-slate-200 pt-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-slate-600">QR / Barcode Position and Size</p>
                  <p className="text-[10px] text-slate-500">
                    Drag the QR or barcode directly on the tag preview. Adjust width/height here for exact sizing.
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-50"
                  onClick={resetCodeLayout}
                >
                  Reset
                </button>
              </div>

              <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-2 text-xs">
                {[
                  { key: "qr", label: "QR Code" },
                  { key: "barcode", label: "Barcode" },
                ].map((item) => {
                  const layout = getCodeItem(item.key);

                  return (
                    <div key={item.key} className="rounded-md bg-white p-2">
                      <div className="mb-2 font-bold text-slate-700">{item.label}</div>
                      <div className="grid grid-cols-4 gap-2">
                        <label className="block">
                          <span className="mb-1 block text-[10px] font-semibold text-slate-500">X</span>
                          <input
                            className="w-full rounded border border-slate-300 px-1.5 py-1 text-right"
                            value={layout.x ?? 0}
                            onChange={(event) => updateCodeLayoutValue(item.key, "x", event.target.value)}
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-[10px] font-semibold text-slate-500">Y</span>
                          <input
                            className="w-full rounded border border-slate-300 px-1.5 py-1 text-right"
                            value={layout.y ?? 0}
                            onChange={(event) => updateCodeLayoutValue(item.key, "y", event.target.value)}
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-[10px] font-semibold text-slate-500">W</span>
                          <input
                            className="w-full rounded border border-slate-300 px-1.5 py-1 text-right"
                            value={layout.width ?? 0}
                            onChange={(event) => updateCodeLayoutValue(item.key, "width", event.target.value)}
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-[10px] font-semibold text-slate-500">H</span>
                          <input
                            className="w-full rounded border border-slate-300 px-1.5 py-1 text-right"
                            value={layout.height ?? 0}
                            onChange={(event) => updateCodeLayoutValue(item.key, "height", event.target.value)}
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            )}

            <div className="mt-4 border-t border-slate-200 pt-4">
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-bold text-slate-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50"
                onClick={() => setShowLayoutFileSettings((prev) => !prev)}
              >
                <span className="inline-flex items-center gap-2">
                    <FontAwesomeIcon icon={faFolderOpen} className="text-slate-500" />
                    <span>Layout File Settings</span>
                  </span>
                <FontAwesomeIcon
                    icon={faChevronDown}
                    className={`text-[10px] text-slate-500 transition-transform ${showLayoutFileSettings ? "rotate-180" : ""}`}
                  />
              </button>

              {showLayoutFileSettings && (
                <div className="mt-2">
                  <input
                    ref={layoutImportRef}
                    type="file"
                    accept="application/json,.json"
                    className="hidden"
                    onChange={handleImportLayoutFile}
                  />

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                <div className="mb-3 grid grid-cols-2 rounded-lg bg-slate-200 p-1 text-[11px] font-bold text-slate-600">
                  <button
                    type="button"
                    className={`rounded-lg px-3 py-2 transition ${layoutSettingsTab === "formats" ? "bg-white text-blue-700 shadow-sm" : "hover:bg-white/60"}`}
                    onClick={() => setLayoutSettingsTab("formats")}
                  >
                    Available Formats
                  </button>
                  <button
                    type="button"
                    className={`rounded-lg px-3 py-2 transition ${layoutSettingsTab === "setup" ? "bg-white text-blue-700 shadow-sm" : "hover:bg-white/60"}`}
                    onClick={() => setLayoutSettingsTab("setup")}
                  >
                    Setup / Add New
                  </button>
                </div>

                {layoutSettingsTab === "formats" ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-[1fr_auto] gap-2">
                      <select
                        value={selectedServerLayout}
                        onChange={(e) => setSelectedServerLayout(e.target.value)}
                        className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      >
                        <option value="">Select Available Format</option>
                        {serverLayouts.map((layout) => (
                          <option key={layout.layoutName || layout.fileName} value={layout.layoutName}>
                            {layout.layoutName}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="inline-flex h-9 items-center justify-center rounded-lg border border-blue-200 bg-white px-3 text-xs font-bold text-slate-600 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={() => handleLoadServerLayouts()}
                        disabled={isLayoutBusy}
                      >
                        Refresh
                      </button>
                    </div>

                    <button
                      type="button"
                      className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                      onClick={handleLoadLayoutFromServer}
                      disabled={isLayoutBusy || !selectedServerLayout}
                    >
                      <FontAwesomeIcon icon={faFolderOpen} />
                      Load Selected Format
                    </button>

                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="block">
                      <span className="mb-1 block font-semibold text-slate-600">New / Update Format Name</span>
                      <input
                        className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        value={layoutName}
                        onChange={(e) => setLayoutName(e.target.value)}
                        placeholder="default"
                      />
                    </label>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-2 text-[11px] font-bold text-slate-700 transition hover:bg-slate-100"
                        onClick={handleSaveLayoutToBrowser}
                      >
                        <FontAwesomeIcon icon={faFloppyDisk} />
                        Save Browser
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-2 text-[11px] font-bold text-slate-700 transition hover:bg-slate-100"
                        onClick={handleLoadLayoutFromBrowser}
                      >
                        <FontAwesomeIcon icon={faFolderOpen} />
                        Load Browser
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-2 text-[11px] font-bold text-slate-700 transition hover:bg-slate-100"
                        onClick={handleDownloadLayoutFile}
                      >
                        <FontAwesomeIcon icon={faDownload} />
                        Download JSON
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-2 text-[11px] font-bold text-slate-700 transition hover:bg-slate-100"
                        onClick={() => layoutImportRef.current?.click()}
                      >
                        <FontAwesomeIcon icon={faUpload} />
                        Import JSON
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-blue-600 px-2 text-[11px] font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                        onClick={handleSaveLayoutToServer}
                        disabled={isLayoutBusy}
                      >
                        <FontAwesomeIcon icon={faFloppyDisk} />
                        Save Server Format
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-2 text-[11px] font-bold text-slate-700 transition hover:bg-slate-100"
                        onClick={handleResetLayoutSettings}
                        disabled={isLayoutBusy}
                      >
                        <FontAwesomeIcon icon={faRotateLeft} />
                        Reset Setup
                      </button>
                    </div>
                  </div>
                )}

                <div className="mt-2 rounded-md bg-white px-2 py-1.5 text-[10px] font-semibold text-slate-500">
                  {isLayoutBusy ? "Processing layout file..." : layoutStatus}
                </div>
                  </div>
                </div>
              )}
            </div>


            {printOutputMode === "label" && (
            <div className="mt-4 border-t border-slate-200 pt-4">
              <div className="mb-2">
                <p className="text-xs font-bold text-slate-600">QZ Tray Direct Printing</p>
                <p className="text-[10px] text-slate-500">Use this for sticker/thermal printers installed on the client PC.</p>
              </div>

              <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs">
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <select
                    value={selectedQzPrinter}
                    onChange={(e) => setSelectedQzPrinter(e.target.value)}
                    className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">Select QZ Printer</option>
                    {qzPrinters.map((printer) => (
                      <option key={printer} value={printer}>
                        {printer}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="inline-flex h-9 items-center justify-center rounded-lg border border-blue-200 bg-white px-3 text-xs font-bold text-slate-600 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={handleLoadQzPrinters}
                    disabled={isQzBusy}
                  >
                    {isQzBusy ? "Loading..." : "Load"}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="mb-1 block font-semibold text-slate-600">QZ Print Type</span>
                    <select
                      value={qzPrintType}
                      onChange={(e) => setQzPrintType(e.target.value)}
                      className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="image">Image Capture</option>
                      <option value="html">HTML</option>
                      <option value="zpl">ZPL / Zebra Compatible</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block font-semibold text-slate-600">ZPL DPI</span>
                    <select
                      value={qzDpi}
                      onChange={(e) => setQzDpi(e.target.value)}
                      className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      disabled={qzPrintType !== "zpl"}
                    >
                      <option value="203">203 DPI</option>
                      <option value="300">300 DPI</option>
                    </select>
                  </label>
                </div>

                <div className="rounded-md bg-white px-2 py-1.5 text-[10px] font-semibold text-slate-500">
                  {qzStatus}
                </div>

                <button
                  type="button"
                  className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-slate-800 px-3 text-xs font-bold text-white shadow-sm transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:bg-slate-300"
                  onClick={handleQzPrint}
                  disabled={isQzBusy || !selectedQzPrinter || tagInfos.length === 0}
                >
                  <FontAwesomeIcon icon={faPrint} />
                  {isQzBusy ? "Sending..." : "Print via QZ Tray"}
                </button>
              </div>
            </div>

            )}

            <div className="mt-5 border-t border-slate-200 bg-white pt-4">
              <div className="grid grid-cols-1 gap-2">
                <div className="grid min-w-0 grid-cols-[0.95fr_1.05fr] gap-2">
                  <div className="relative min-w-0">
                      <button
                        type="button"
                        className="inline-flex h-10 w-full min-w-0 items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2 text-xs font-bold text-blue-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={() => setIsDownloadMenuOpen((prev) => !prev)}
                        disabled={tagInfos.length === 0 || isCapturingPrint}
                        title={isCapturingPrint ? outputAction || "Preparing download" : "Download options"}
                      >
                        <FontAwesomeIcon icon={faDownload} className="shrink-0" />
                        <span className="min-w-0 truncate">Download</span>
                        <span
                          className="shrink-0 border-x-[4px] border-t-[5px] border-x-transparent border-t-current"
                          aria-hidden="true"
                        />
                      </button>

                      {isDownloadMenuOpen && !isCapturingPrint && (
                        <div className="absolute bottom-full left-0 right-0 z-50 mb-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white text-xs font-semibold shadow-lg">
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-bold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
                            onClick={handleDownloadPdfFromPng}
                          >
                            <FontAwesomeIcon icon={faDownload} className="w-4 text-slate-500" />
                            Download PDF
                          </button>
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-bold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
                            onClick={handleDownloadPngZip}
                          >
                            <FontAwesomeIcon icon={faImage} className="w-4 text-slate-500" />
                            Download PNG ZIP
                          </button>
                        </div>
                      )}
                    </div>

                  <button
                    type="button"
                    className="inline-flex h-10 w-full min-w-0 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-2 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={printTag}
                    disabled={tagInfos.length === 0 || isCapturingPrint}
                    title={isCapturingPrint ? outputAction || "Preparing print preview" : "Print Preview"}
                  >
                    <FontAwesomeIcon icon={faPrint} className="shrink-0" />
                    <span className={isCapturingPrint ? "min-w-0 truncate" : "whitespace-nowrap"}>{isCapturingPrint ? (outputAction || "Preparing...") : "Print Preview"}</span>
                  </button>
                </div>

              </div>
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchPPETag;
