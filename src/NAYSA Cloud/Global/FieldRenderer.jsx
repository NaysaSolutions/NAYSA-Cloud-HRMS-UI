import React from "react";
import { Search, X, ChevronDown } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

const FieldRenderer = ({
  id,
  name,
  label,
  required = false,
  type = "text",
  value,
  onChange,
  onLookup,
  onClear,
  onBlur,
  onKeyDown,
  disabled,
  lookupDisabled = false,
  editableLookup = false,
  allowLookupInput = false,
  hideClearButton = false,
  isRetrieved = false,
  retrieved = false,
  options = [],
  readOnly = false,
  placeholder = " ",
  inputRef,
  variant = "default",
  maxLength,
  onPaste,
  labelClassName = "",
  nativeSelect = false,
  ...props
}) => {
  const isAudit = variant === "audit";
  const isEnabled = !disabled || isAudit;
  // For lookup fields, readOnly should only prevent manual typing.
  // It should NOT disable the search icon/click action.
  // To disable lookup action, pass disabled={true} or lookupDisabled={true}.
  const lookupActionDisabled = disabled || lookupDisabled || isAudit;

  const labelText = typeof label === "string" ? label : "";
  const idSource = id || name || labelText;
  const normalizedFieldKey = String(idSource || "")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();
  const isCurrRateField = normalizedFieldKey === "currrate";

  const inputId = idSource
    ? String(idSource).toLowerCase().replace(/[^a-z0-9]+/gi, "_")
    : undefined;

  const enabledInputTheme = `
    global-ref-textbox-enabled
    !bg-white !text-slate-900 !border-slate-300
    placeholder:!text-slate-400
    focus:!border-blue-500 focus-visible:!border-blue-500
    dark:!bg-slate-700 dark:!text-slate-100 dark:!border-slate-600
    dark:placeholder:!text-slate-400
    dark:focus:!border-blue-400 dark:focus-visible:!border-blue-400
  `;

  const disabledInputTheme = `
    global-ref-textbox-disabled
    !bg-slate-100 !text-slate-600 !border-slate-200
    disabled:!opacity-100
    placeholder:!text-slate-400
    dark:!bg-slate-800 dark:!text-slate-300 dark:!border-slate-700
    dark:placeholder:!text-slate-500
  `;

  const sharedClasses = `
    peer w-full h-8 sm:h-8
    global-ref-textbox-ui
    !px-2
    !font-normal
    rounded-lg
    ${isEnabled ? enabledInputTheme : disabledInputTheme}
    ${readOnly || isAudit ? "cursor-default" : ""}
    focus-visible:!ring-0 focus-visible:!ring-offset-0
    border shadow-none transition-all
  `;

  const labelClass = `
    global-ref-floating-label field-renderer-floating-label-clean
    ${isEnabled ? "global-ref-label-enabled" : "global-ref-label-disabled"}
    !text-slate-600
    dark:!text-slate-300
    ${isEnabled
      ? "!bg-white dark:!bg-slate-700"
      : "!bg-slate-100 dark:!bg-slate-800"
    }
    ${labelClassName}
  `;

  const searchButtonClass = (isActive) => `
    absolute right-0 top-0 h-8 sm:h-8 w-10 flex items-center justify-center
    rounded-r-lg border border-l-0 transition-colors
    ${
      isActive
        ? `
          bg-blue-50 text-blue-600 border-slate-300
          hover:bg-blue-600 hover:text-white
          dark:bg-slate-700 dark:text-blue-300 dark:border-slate-600
          dark:hover:bg-blue-600 dark:hover:text-white
        `
        : `
          bg-gray-100 text-gray-400 border-slate-200
          dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700
        `
    }
  `;

  const selectButtonClass = (isActive) => `
    pointer-events-none absolute right-0 top-0 h-8 sm:h-8 w-10 flex items-center justify-center
    rounded-r-lg border border-l-0 transition-colors
    ${
      isActive
        ? `
          bg-blue-50 text-blue-600 border-slate-300
          dark:bg-slate-700 dark:text-blue-300 dark:border-slate-600
        `
        : `
          bg-gray-100 text-gray-400 border-slate-200
          dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700
        `
    }
  `;

  const getDisplayValue = (val, fieldType = "text") => {
    if (val === undefined || val === null) return "";
    if (typeof val !== "object") return String(val);

    if (fieldType === "select") {
      return val.value !== undefined && val.value !== null ? String(val.value) : "";
    }

    return val.label ?? val.value ?? "";
  };

  const handleChange = (val) => {
    if (!onChange || readOnly || isAudit) return;

    const isEvent = val && typeof val === "object" && "target" in val;
    const finalValue = isEvent ? val.target.value : val;

    onChange(finalValue);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    if (onClear) {
      onClear();
    } else if (onChange && !readOnly && !isAudit) {
      onChange("");
    }
  };

  const isRetrievedMode = Boolean(isRetrieved || retrieved);
  const shouldHideClearButton =
    hideClearButton || type === "date" || isRetrievedMode || isCurrRateField;
  const canClear = !disabled && !readOnly && !isAudit && !shouldHideClearButton;

  const renderLabel = () => (
    <label htmlFor={inputId} className={labelClass}>
      {required && <span className="global-ref-asterisk-ui mr-1 dark:!text-red-400">*</span>}
      {label}
    </label>
  );

  const clearBtn = (onClick, positionStyle = { right: "5px" }) => (
    <button
      type="button"
      onClick={onClick}
      title="Clear"
      aria-label="Clear field"
      className="
        absolute flex items-center justify-center
        border-none bg-transparent
        text-slate-400 transition-colors
        hover:bg-slate-200/70 hover:text-slate-600
        dark:text-slate-300 dark:hover:bg-slate-600/70 dark:hover:text-white
      "
      style={{
        top: "50%",
        transform: "translateY(-50%)",
        width: "24px",
        height: "18px",
        borderRadius: "6px",
        cursor: "pointer",
        zIndex: 10,
        flexShrink: 0,
        ...positionStyle,
      }}
    >
      <X style={{ width: "11px", height: "11px", strokeWidth: 2.5 }} />
    </button>
  );

  const renderClearButton = (currentValue, fieldType = "text") => {
    const displayVal = getDisplayValue(currentValue, fieldType);
    if (!canClear || !displayVal) return null;

    // number and amount are right-aligned text, so the clear button goes on the left side
    const positionStyle =
      fieldType === "number" || fieldType === "amount" ? { left: "5px" } : { right: "5px" };

    return clearBtn(handleClear, positionStyle);
  };

  return (
    <div className="relative w-full">
      <style>{`
        .field-renderer-floating-label-clean.global-ref-floating-label {
          box-shadow: none !important;
          border-radius: 0 !important;
          padding-left: 2px !important;
          padding-right: 2px !important;
        }

        .field-renderer-floating-label-clean.global-ref-floating-label::before,
        .field-renderer-floating-label-clean.global-ref-floating-label::after {
          display: none !important;
        }

        .field-renderer-date-input {
          position: relative;
          padding-right: 2rem !important;
        }

        .field-renderer-date-input::-webkit-calendar-picker-indicator {
          position: absolute;
          right: 0.5rem;
          top: 50%;
          transform: translateY(-50%);
          margin: 0;
          cursor: pointer;
        }

        .dark .field-renderer-date-input::-webkit-calendar-picker-indicator {
          filter: invert(1) brightness(1.6);
        }

        .field-renderer-date-input::-webkit-datetime-edit {
          padding-right: 1.25rem;
        }
      `}</style>

      {/* ── LOOKUP ─────────────────────────────────────────────── */}
      {type === "lookup" && (
        <div className="relative flex items-center w-full">
          <Input
            id={inputId}
            value={getDisplayValue(value, "lookup")}
            readOnly={!allowLookupInput}
            placeholder={placeholder}
            className={`${sharedClasses} ${allowLookupInput ? "" : "cursor-pointer"} ${
              !lookupActionDisabled && editableLookup && getDisplayValue(value, "lookup")
                ? "pr-20"
                : "pr-10"
            }`}
            onChange={allowLookupInput ? handleChange : undefined}
            onKeyDown={onKeyDown}
            onClick={() => !allowLookupInput && !lookupActionDisabled && onLookup?.()}
          />

          {!lookupActionDisabled &&
            editableLookup &&
            !shouldHideClearButton &&
            getDisplayValue(value, "lookup") &&
            clearBtn(
              (e) => {
                e.stopPropagation();
                if (onClear) {
                  onClear();
                } else if (onChange) {
                  onChange("");
                }
              },
              { right: "44px" }
            )}

          <button
            type="button"
            onClick={() => !lookupActionDisabled && onLookup?.()}
            disabled={lookupActionDisabled}
            title="Search"
            className={searchButtonClass(!lookupActionDisabled)}
          >
            <Search className="h-4 w-4" strokeWidth={3} />
          </button>

          {renderLabel()}
        </div>
      )}

      {/* ── TEXT / NUMBER / DATE ────────────────────────────────── */}
      {(type === "text" || type === "number" || type === "date") && (
        <>
          <Input
            id={inputId}
            ref={inputRef}
            type={type}
            placeholder={placeholder}
            value={getDisplayValue(value, type)}
            onChange={handleChange}
            onBlur={onBlur}
            onKeyDown={onKeyDown}
            disabled={disabled}
            readOnly={readOnly || isAudit}
            className={`${sharedClasses} ${type === "number" ? "text-right" : ""} ${
              type === "date" ? "field-renderer-date-input" : ""
            } ${
              canClear && getDisplayValue(value, type)
                ? type === "number"
                  ? "pl-8"
                  : "pr-8"
                : ""
            }`}
            maxLength={maxLength}
            onPaste={onPaste}
            {...props}
          />
          {renderClearButton(value, type)}
          {renderLabel()}
        </>
      )}

      {/* ── AMOUNT ─────────────────────────────────────────────── */}
      {type === "amount" && (
        <>
          <Input
            id={inputId}
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={getDisplayValue(value, "amount")}
            onChange={handleChange}
            onBlur={onBlur}
            onKeyDown={onKeyDown}
            disabled={disabled}
            readOnly={readOnly || isAudit}
            className={`${sharedClasses} text-right ${
              canClear && getDisplayValue(value, "amount") ? "pl-8" : ""
            }`}
            maxLength={maxLength}
            onPaste={onPaste}
            {...props}
          />
          {renderClearButton(value, "amount")}
          {renderLabel()}
        </>
      )}

      {/* ── SELECT ─────────────────────────────────────────────── */}
      {type === "select" && (
        <>
          <div className="relative flex items-center w-full">
            <Select
              value={getDisplayValue(value, "select")}
              onValueChange={(newVal) => handleChange(newVal)}
              disabled={disabled || readOnly || isAudit}
            >
              <SelectTrigger
                id={inputId}
                className={`${sharedClasses} flex items-center justify-between !bg-transparent !leading-none !pr-12 [&>svg]:hidden`}
              >
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>

              <div className={selectButtonClass(!(disabled || readOnly || isAudit))}>
                <ChevronDown className="h-4 w-4" strokeWidth={3} />
              </div>

              <SelectContent className="rounded-xl border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
                {options.map((opt) => (
                  <SelectItem
                    key={String(opt.value)}
                    value={String(opt.value)}
                    className="text-xs rounded-lg focus:bg-blue-50 focus:text-blue-700 dark:focus:bg-slate-700 dark:focus:text-white"
                  >
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {renderLabel()}
        </>
      )}
    </div>
  );
};

export default FieldRenderer;