import React, { useMemo, useState } from "react";
import { X, Printer, Eye, EyeOff, RefreshCcw } from "lucide-react";

import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import {
  useSwalErrorAlert,
} from "@/NAYSA Cloud/Global/behavior.jsx";

const pxPerMm = 4;

const DEFAULT_PAPER = {
  paperWidth: 203.2,
  paperHeight: 88.9,
  unitCode: "mm",
  offsetX: 0,
  offsetY: 0,
};

const SAMPLE_FIELDS = [
  {
    fieldKey: "checkDate",
    fieldLabel: "Check Date",
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

const FIELD_META = {
  checkDate: "border-red-400 bg-red-50/70 text-red-700",
  amountInWords: "border-blue-400 bg-blue-50/70 text-blue-700",
  payeeName: "border-green-400 bg-green-50/70 text-green-700",
  checkAmount: "border-purple-400 bg-purple-50/70 text-purple-700",
  forAccountOnly: "border-orange-400 bg-orange-50/70 text-orange-700",
  cvNo: "border-cyan-400 bg-cyan-50/70 text-cyan-700",
};

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

const normalizeFieldRow = (item = {}, index = 0) => {
  const defaultField =
    SAMPLE_FIELDS.find(
      (field) => field.fieldKey === (item.fieldKey || item.field_key)
    ) || SAMPLE_FIELDS[index] || SAMPLE_FIELDS[0];

  return {
    ...defaultField,
    rowId: item.rowId || item.row_id || "",
    fieldKey: item.fieldKey || item.field_key || defaultField.fieldKey,
    fieldLabel: item.fieldLabel || item.field_label || defaultField.fieldLabel,
    staticValue: item.staticValue ?? item.static_value ?? defaultField.staticValue ?? "",
    xPosition: item.xPosition ?? item.x_position ?? defaultField.xPosition,
    yPosition: item.yPosition ?? item.y_position ?? defaultField.yPosition,
    fieldWidth: item.fieldWidth ?? item.field_width ?? defaultField.fieldWidth,
    fieldHeight: item.fieldHeight ?? item.field_height ?? defaultField.fieldHeight,
    fontName: item.fontName || item.font_name || defaultField.fontName,
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

const applyDigitTokens = (text, token, sourceDigits) => {
  let index = 0;
  return text.replace(new RegExp(token, "g"), () => {
    const value = sourceDigits[index] ?? sourceDigits[sourceDigits.length - 1] ?? "";
    index += 1;
    return value;
  });
};

const toDateObject = (value) => {
  if (!value) return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  const text = String(value).trim();

  // MM/DD/YYYY
  const slashParts = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashParts) {
    const mm = Number(slashParts[1]);
    const dd = Number(slashParts[2]);
    const yyyy = Number(slashParts[3]);
    const date = new Date(yyyy, mm - 1, dd);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const parsed = new Date(text.includes("T") ? text : text.replace(" ", "T"));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatCheckDate = (dateValue, formatType = "MM/DD/YYYY") => {
  const date = toDateObject(dateValue) || new Date();
  const format = String(formatType || "MM/DD/YYYY");

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = String(date.getFullYear());
  const shortMonth = date.toLocaleString("en-US", { month: "short" });
  const longMonth = date.toLocaleString("en-US", { month: "long" });

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

const formatAmount = (value) => {
  const raw = String(value ?? "").replace(/,/g, "").trim();
  const num = Number(raw || 0);

  if (Number.isNaN(num)) return value || "";

  return num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const getFieldValue = (field, checkData, showForAccountOnly) => {
  if (!field) return "";

  if (field.fieldKey === "checkDate") {
    return formatCheckDate(checkData?.checkDate, field.formatType);
  }

  if (field.fieldKey === "amountInWords") {
    return checkData?.amountInWords || "";
  }

  if (field.fieldKey === "payeeName") {
    return checkData?.payeeName || "";
  }

  if (field.fieldKey === "checkAmount") {
    const amount = checkData?.checkAmount ?? checkData?.amount ?? "";
    const formatted = formatAmount(amount);
    return formatted ? `${formatted}` : "";
  }

  if (field.fieldKey === "forAccountOnly") {
    return showForAccountOnly ? field.staticValue || checkData?.forAccountOnly || "For A/C Only" : "";
  }

  if (field.fieldKey === "cvNo") {
    return checkData?.cvNo || "";
  }

  return field.staticValue || "";
};

export default function CheckPrintPreviewModal({
  open = false,
  onClose,
  bankCode = "",
  checkData = {},
  templateData = null,
  endpoint = "/getBankCheckTemplate",
}) {
  const [showForAccountOnly, setShowForAccountOnly] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [loadedTemplate, setLoadedTemplate] = useState(null);

  React.useEffect(() => {
    if (!open) return;

    setShowForAccountOnly(true);

    if (templateData) {
      setLoadedTemplate(templateData);
      return;
    }

    const loadTemplate = async () => {
      if (!bankCode) {
        useSwalErrorAlert("Missing Bank", "Bank Code is required to load the check template.");
        return;
      }

      setIsLoading(true);

      try {
        const response = await apiClient.get(endpoint, {
          params: { BANK_CODE: bankCode },
        });

        const parsed = extractResultObject(response);

        if (!parsed?.templateId && !parsed?.template_id) {
          useSwalErrorAlert(
            "No Check Template",
            "No check template is assigned to the selected bank account."
          );
          setLoadedTemplate(null);
          return;
        }

        setLoadedTemplate(parsed);
      } catch (error) {
        useSwalErrorAlert(
          "Load Failed",
          error?.response?.data?.message ||
            error?.message ||
            "Failed to load the bank check template."
        );
        setLoadedTemplate(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadTemplate();
  }, [open, bankCode, endpoint, templateData]);

  const templateHeader = useMemo(() => {
    const source = loadedTemplate || templateData || {};
    return {
      templateId: source.templateId || source.template_id || "",
      templateCode: source.templateCode || source.template_code || "",
      templateName: source.templateName || source.template_name || "",
      bankName: source.bankName || source.bank_name || "",
      bankCode: source.bankCode || source.bank_code || bankCode || "",
      bankAcctNo: source.bankAcctNo || source.bankacct_no || "",
      paperWidth: source.paperWidth ?? source.paper_width ?? DEFAULT_PAPER.paperWidth,
      paperHeight: source.paperHeight ?? source.paper_height ?? DEFAULT_PAPER.paperHeight,
      offsetX: source.offsetX ?? source.offset_x ?? DEFAULT_PAPER.offsetX,
      offsetY: source.offsetY ?? source.offset_y ?? DEFAULT_PAPER.offsetY,
      unitCode: source.unitCode || source.unit_code || DEFAULT_PAPER.unitCode,
    };
  }, [loadedTemplate, templateData, bankCode]);

  const fields = useMemo(() => {
    const source = loadedTemplate || templateData || {};
    const rows = safeArray(source.dt1);

    return (rows.length ? rows : SAMPLE_FIELDS)
      .map(normalizeFieldRow)
      .sort((a, b) => numberOrZero(a.sortOrder) - numberOrZero(b.sortOrder));
  }, [loadedTemplate, templateData]);

  const visibleFields = useMemo(
    () =>
      fields.filter((field) => {
        if (!field.isVisible) return false;
        if (field.fieldKey === "forAccountOnly" && !showForAccountOnly) return false;
        return true;
      }),
    [fields, showForAccountOnly]
  );

  if (!open) return null;

  const paperWidth = numberOrZero(templateHeader.paperWidth) || DEFAULT_PAPER.paperWidth;
  const paperHeight = numberOrZero(templateHeader.paperHeight) || DEFAULT_PAPER.paperHeight;
  const offsetX = numberOrZero(templateHeader.offsetX);
  const offsetY = numberOrZero(templateHeader.offsetY);

  const handlePrint = () => {
    const printFields = visibleFields
      .map((field) => {
        const value = escapeHtml(getFieldValue(field, checkData, showForAccountOnly));
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
          <title>Check Print Preview</title>
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

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-slate-900/40 px-4 py-6">
      <div className="relative flex max-h-[94vh] w-full max-w-[1120px] flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        {isLoading && (
          <div className="absolute inset-0 z-[2] flex items-center justify-center bg-white/60">
            <LoadingSpinner />
          </div>
        )}

        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-blue-50 px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-[15px] font-bold text-blue-900">
              Check Print Preview
            </h2>
            <p className="mt-0.5 truncate text-[11px] text-slate-500">
              {templateHeader.bankCode || bankCode || "No Bank"} 
              {templateHeader.templateName ? ` • ${templateHeader.templateName}` : ""}
              {checkData?.cvNo ? ` • ${checkData.cvNo}` : ""}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setShowForAccountOnly((prev) => !prev)}
              className={`flex h-8 items-center gap-1 rounded-md px-3 text-[11px] font-semibold transition ${
                showForAccountOnly
                  ? "bg-orange-100 text-orange-700 hover:bg-orange-200"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
              title="Show/Hide For A/C Only"
            >
              {showForAccountOnly ? <Eye size={14} /> : <EyeOff size={14} />}
              <span className="hidden sm:inline">
                {showForAccountOnly ? "For A/C Only: Show" : "For A/C Only: Hide"}
              </span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={!loadedTemplate && !templateData}
              className="flex h-8 items-center gap-1 rounded-md bg-blue-600 px-3 text-[11px] font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Printer size={14} />
              Print
            </button>

            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-600 transition hover:bg-slate-200"
              title="Close"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        <div className="overflow-auto bg-slate-100 p-4">
          <div className="mx-auto rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div
              className="relative mx-auto border border-slate-400 bg-white"
              style={{
                width: `${paperWidth * pxPerMm}px`,
                height: `${paperHeight * pxPerMm}px`,
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
              </div>
              <div className="absolute bottom-[32px] left-[30px] text-[17px] tracking-[5px] text-slate-600">
                ❞1234567890❞ &nbsp;&nbsp; 0102034567❞ &nbsp;&nbsp; 1001
              </div> */}

              {visibleFields.map((field) => {
                const x = (numberOrZero(field.xPosition) + offsetX) * pxPerMm;
                const y = (numberOrZero(field.yPosition) + offsetY) * pxPerMm;
                const width = numberOrZero(field.fieldWidth) * pxPerMm;
                const height = numberOrZero(field.fieldHeight) * pxPerMm;

                return (
                  <div
                    key={field.fieldKey}
                    className={`absolute flex select-none items-center overflow-hidden border border-dashed px-2 ${
                      FIELD_META[field.fieldKey] || "border-slate-400 bg-white text-slate-700"
                    }`}
                    style={{
                      left: x,
                      top: y,
                      width,
                      height,
                      fontSize: `${numberOrZero(field.fontSize)}pt`,
                      fontWeight: field.fontWeight || "400",
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
                  >
                    {getFieldValue(field, checkData, showForAccountOnly)}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mx-auto mt-3 grid max-w-[1010px] grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-3 text-[11px] text-slate-600 md:grid-cols-3">
            <div>
              <span className="font-bold">Bank:</span>{" "}
              {templateHeader.bankCode || bankCode || ""}
            </div>
            <div>
              <span className="font-bold">Template:</span>{" "}
              {templateHeader.templateName || "No template loaded"}
            </div>
            <div>
              <span className="font-bold">CV No.:</span>{" "}
              {checkData?.cvNo || ""}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
