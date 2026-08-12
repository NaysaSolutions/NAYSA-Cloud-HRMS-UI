import React, { useRef } from "react";
import { PatternFormat } from "react-number-format";
import { useSwalErrorAlert } from "@/NAYSA Cloud/Global/behavior.jsx";

const getAllowedYearRange = () => {
  const currentYear = new Date().getFullYear();
  return {
    minYear: currentYear - 1,
    currentYear,
    maxYear: currentYear + 1,
  };
};

export const isStrictDateAllowed = ({ value }) => {
  const cleaned = String(value || "")
    .replace(/\D/g, "")
    .slice(0, 8);

  const month = cleaned.slice(0, 2);
  const day = cleaned.slice(2, 4);
  const year = cleaned.slice(4, 8);

  if (month.length === 1 && !["0", "1"].includes(month)) return false;
  if (month.length === 2) {
    const m = Number(month);
    if (m < 1 || m > 12) return false;
  }

  if (day.length === 1 && !["0", "1", "2", "3"].includes(day)) return false;
  if (day.length === 2) {
    const d = Number(day);
    if (d < 1 || d > 31) return false;
  }

  if (year.length === 1 && !["1", "2"].includes(year)) return false;

  if (year.length === 4) {
    const y = Number(year);
    const { minYear, maxYear } = getAllowedYearRange();

    if (y < minYear || y > maxYear) {
      return false;
    }
  }

  return true;
};

export const usehandleDateChange = (value, field, updateState) => {
  const cleaned = String(value || "")
    .replace(/\D/g, "")
    .slice(0, 8);

  let formatted = cleaned;

  if (cleaned.length > 2 && cleaned.length <= 4) {
    formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
  } else if (cleaned.length > 4) {
    formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
  }

  updateState({ [field]: formatted });
};

export const usehandleDateBlur = (value, field, updateState) => {
  const dateStr = String(value || "").trim();

  if (!dateStr) {
    updateState({ [field]: "" });
    return false;
  }

  const { minYear, currentYear, maxYear } = getAllowedYearRange();

  const showInvalidDateAlert = () => {
    useSwalErrorAlert(
      "Invalid Date",
      `Please enter a valid date in MM/DD/YYYY format. Allowed years are ${minYear}, ${currentYear}, and ${maxYear} only.`
    );
  };

  const regex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/\d{4}$/;

  if (!regex.test(dateStr)) {
    updateState({ [field]: "" });
    showInvalidDateAlert();
    return false;
  }

  const [month, day, year] = dateStr.split("/").map(Number);

  if (year < minYear || year > maxYear) {
    updateState({ [field]: "" });
    showInvalidDateAlert();
    return false;
  }

  const maxDay = new Date(year, month, 0).getDate();

  if (day < 1 || day > maxDay) {
    updateState({ [field]: "" });
    showInvalidDateAlert();
    return false;
  }

  const parsed = new Date(year, month - 1, day);

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    updateState({ [field]: "" });
    showInvalidDateAlert();
    return false;
  }

  updateState({ [field]: dateStr });
  return true;
};

export const formatDateToMMDDYYYY = (value) => {
  if (!value) return "";

  const raw = String(value).trim();
  const datePart = raw.includes("T") ? raw.split("T")[0] : raw;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return "";

  const [year, month, day] = datePart.split("-");
  return `${month}/${day}/${year}`;
};

export const formatDateToYYYYMMDD = (value) => {
  if (!value) return "";

  const raw = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) return "";

  const [month, day, year] = raw.split("/");
  return `${year}-${month}-${day}`;
};

const dateSegments = [
  { key: "month", start: 0, end: 2, maxLength: 2 },
  { key: "day", start: 3, end: 5, maxLength: 2 },
  { key: "year", start: 6, end: 10, maxLength: 4 },
];

const getDateSegmentByPosition = (selectionStart = 0) => {
  if (selectionStart <= 2) {
    return dateSegments[0];
  }

  if (selectionStart <= 5) {
    return dateSegments[1];
  }

  return dateSegments[2];
};

const getDateSegmentByKey = (key) =>
  dateSegments.find((segment) => segment.key === key) || null;

const getNextDateSegment = (segment) => {
  const currentIndex = dateSegments.findIndex(
    (dateSegment) => dateSegment.key === segment?.key
  );

  return currentIndex >= 0 ? dateSegments[currentIndex + 1] || null : null;
};

const getSelectedDateSegment = (input) => {
  if (!input) return null;

  return (
    dateSegments.find(
      (segment) =>
        input.selectionStart === segment.start &&
        input.selectionEnd === segment.end
    ) || null
  );
};

const selectDateSegment = (input, selectionStart) => {
  if (!input || typeof input.setSelectionRange !== "function") return;

  const segment = getDateSegmentByPosition(selectionStart);

  window.requestAnimationFrame(() => {
    input.setSelectionRange(segment.start, segment.end);
  });
};

const setDateSegmentSelection = (input, segment, shouldSelect) => {
  if (!input || !segment || typeof input.setSelectionRange !== "function") return;

  window.requestAnimationFrame(() => {
    if (shouldSelect) {
      input.setSelectionRange(segment.start, segment.end);
    } else {
      input.setSelectionRange(segment.end, segment.end);
    }
  });
};

const replaceDateSegment = (dateValue, segment, segmentValue) => {
  const normalizedValue = String(dateValue || "");

  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(normalizedValue)) {
    return "";
  }

  const month = normalizedValue.slice(0, 2);
  const day = normalizedValue.slice(3, 5);
  const year = normalizedValue.slice(6, 10);
  const nextParts = { month, day, year, [segment.key]: segmentValue };

  return `${nextParts.month}/${nextParts.day}/${nextParts.year}`;
};

const getNextSegmentBuffer = (segment, currentBuffer, digit) => {
  if (!currentBuffer && segment.key === "month" && !["0", "1"].includes(digit)) {
    return `0${digit}`;
  }

  if (!currentBuffer && segment.key === "day" && !["0", "1", "2", "3"].includes(digit)) {
    return `0${digit}`;
  }

  return `${currentBuffer || ""}${digit}`.slice(0, segment.maxLength);
};

const DateFormatInput = ({
  id,
  name,
  value,
  updateState,
  disabled = false,
  className = "peer global-tran-textbox-ui pr-10",
  placeholder = "mm/dd/yyyy",
  onChangeCustom,
  onBlurCustom,
  onKeyDownCustom,
  showCalendar = true,
  onClick,
  onFocus,
  ...props
}) => {
  const fieldName = name || id;
  const nativeDateRef = useRef(null);
  const segmentEditRef = useRef({ key: "", buffer: "" });

  const { minYear, currentYear, maxYear } = getAllowedYearRange();

  const handleBlur = (e) => {
    segmentEditRef.current = { key: "", buffer: "" };
    const currentValue = e?.target?.value || value || "";
    const isValid = usehandleDateBlur(currentValue, fieldName, updateState);

    if (onBlurCustom) {
      onBlurCustom(e, {
        value: currentValue,
        field: fieldName,
        isValid,
      });
    }
  };

  const handleOpenCalendar = () => {
    if (disabled || !nativeDateRef.current) return;

    if (typeof nativeDateRef.current.showPicker === "function") {
      nativeDateRef.current.showPicker();
    } else {
      nativeDateRef.current.focus();
      nativeDateRef.current.click();
    }
  };

  const handleNativeDateChange = (e) => {
    const selectedValue = e.target.value;
    const formattedValue = formatDateToMMDDYYYY(selectedValue);

    const selectedYear = Number((selectedValue || "").slice(0, 4));
    if (selectedYear && (selectedYear < minYear || selectedYear > maxYear)) {
      useSwalErrorAlert(
        "Invalid Date",
        `Allowed years are ${minYear}, ${currentYear}, and ${maxYear} only.`
      );
      updateState({ [fieldName]: "" });
      return;
    }

    updateState({ [fieldName]: formattedValue });

    if (onChangeCustom) {
      onChangeCustom(selectedValue, fieldName, formattedValue);
    }
  };

  const handleFocus = (e) => {
    if (onFocus) {
      onFocus(e);
    }
  };

  const handleClick = (e) => {
    if (onClick) {
      onClick(e);
    }

    if (disabled) return;

    const segment = getDateSegmentByPosition(e.currentTarget.selectionStart || 0);
    segmentEditRef.current = { key: segment.key, buffer: "" };
    selectDateSegment(e.currentTarget, e.currentTarget.selectionStart || 0);
  };

  const handleKeyDown = (e) => {
    if (!disabled && e.key === "Enter") {
      const selectedSegment = getSelectedDateSegment(e.currentTarget);
      const activeSegment = getDateSegmentByKey(segmentEditRef.current.key);
      const segment = activeSegment || selectedSegment;
      const nextSegment = getNextDateSegment(segment);

      if (nextSegment) {
        e.preventDefault();
        segmentEditRef.current = { key: nextSegment.key, buffer: "" };
        setDateSegmentSelection(e.currentTarget, nextSegment, true);
        return;
      }
    }

    if (!disabled && /^\d$/.test(e.key) && /^\d{2}\/\d{2}\/\d{4}$/.test(String(value || ""))) {
      const selectedSegment = getSelectedDateSegment(e.currentTarget);
      const activeSegment = getDateSegmentByKey(segmentEditRef.current.key);
      const segment = activeSegment || selectedSegment;

      if (segment) {
        e.preventDefault();

        const currentBuffer =
          segmentEditRef.current.key === segment.key ? segmentEditRef.current.buffer : "";
        const nextBuffer = getNextSegmentBuffer(segment, currentBuffer, e.key);
        const isSegmentComplete = nextBuffer.length >= segment.maxLength;

        if (isSegmentComplete) {
          const nextDateValue = replaceDateSegment(value, segment, nextBuffer);

          if (!nextDateValue || !isStrictDateAllowed({ value: nextDateValue })) {
            segmentEditRef.current = { key: "", buffer: "" };
            setDateSegmentSelection(e.currentTarget, segment, true);
            return;
          }

          updateState({ [fieldName]: nextDateValue });

          if (onChangeCustom) {
            onChangeCustom(nextDateValue.replace(/\D/g, ""), fieldName, nextDateValue);
          }

          const nextSegment = getNextDateSegment(segment);
          segmentEditRef.current = nextSegment
            ? { key: nextSegment.key, buffer: "" }
            : { key: "", buffer: "" };
          setDateSegmentSelection(e.currentTarget, nextSegment || segment, !!nextSegment);
          return;
        }

        segmentEditRef.current = { key: segment.key, buffer: nextBuffer };
        setDateSegmentSelection(e.currentTarget, segment, true);
        return;
      }
    }

    if (e.key === "Delete" && fieldName !== "documentDate") {
      segmentEditRef.current = { key: "", buffer: "" };
      e.preventDefault();
      updateState({ [fieldName]: "" });

      if (onChangeCustom) {
        onChangeCustom("", fieldName, "");
      }
    }

    if (onKeyDownCustom) {
      onKeyDownCustom(e, {
        value: e?.currentTarget?.value || "",
        field: fieldName,
      });
    }
  };

  return (
    <div className="relative w-full">
      <PatternFormat
        id={id}
        name={fieldName}
        value={value || ""}
        format="##/##/####"
        mask=""
        placeholder={placeholder}
        inputMode="numeric"
        className={className}
        disabled={disabled}
        isAllowed={isStrictDateAllowed}
        onValueChange={(values) => {
          segmentEditRef.current = { key: "", buffer: "" };
          usehandleDateChange(values.value, fieldName, updateState);

          if (onChangeCustom) {
            onChangeCustom(values.value, fieldName, values.formattedValue);
          }
        }}
        onBlur={handleBlur}
        onFocus={handleFocus}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        {...props}
      />

      {showCalendar && !disabled && (
        <>
          <button
            type="button"
            onClick={handleOpenCalendar}
            className="absolute inset-y-0 right-2 flex items-center text-gray-500"
            tabIndex={-1}
          >
            📅
          </button>

          <input
            ref={nativeDateRef}
            type="date"
            value={formatDateToYYYYMMDD(value || "")}
            min={`${minYear}-01-01`}
            max={`${maxYear}-12-31`}
            onChange={handleNativeDateChange}
            tabIndex={-1}
            style={{
              position: "absolute",
              width: 1,
              height: 1,
              opacity: 0,
              pointerEvents: "none",
            }}
          />
        </>
      )}
    </div>
  );
};

export default DateFormatInput;



