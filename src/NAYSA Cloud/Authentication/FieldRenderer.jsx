import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";

const FieldRenderer = ({
  id,
  label,
  required = false,
  type = "text", // "text" | "number" | "date" | "select" | "lookup"
  value,
  onChange,
  onLookup,
  disabled,
  options = [], // for select
}) => {
  const isEnabled = !disabled;

  const inputId =
    id ||
    (label ? label.toLowerCase().replace(/[^a-z0-9]+/gi, "_") : undefined);

  const baseInput = `peer global-ref-textbox-ui ${isEnabled ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"
    }`;

  const labelClass = `global-ref-floating-label ${isEnabled ? "global-ref-label-enabled" : "global-ref-label-disabled"
    }`;

  const handleChange = (e) => {
    if (onChange) onChange(e.target.value);
  };

  return (
    <div className="relative w-full">
      {/* LOOKUP FIELD (BLUE MAGNIFY BUTTON) */}
      {type === "lookup" && (
        <>
          <div
            className={`flex items-stretch global-ref-textbox-ui ${isEnabled
                ? "global-ref-textbox-enabled"
                : "global-ref-textbox-disabled"
              }`}
          >
            <input
              id={inputId}
              type="text"
              placeholder=" "
              readOnly
              value={value || ""}
              className="peer flex-grow bg-transparent border-none px-3 focus:outline-none cursor-pointer"
              onClick={() => isEnabled && onLookup && onLookup()}
            />

            {/* BLUE MAGNIFY BUTTON */}
            <button
              type="button"
              onClick={() => isEnabled && onLookup && onLookup()}
              disabled={!isEnabled}
              tabIndex={-1}
              className={`
    absolute right-[1px] inset-y-[1px]
    w-10 flex items-center justify-center
    rounded-r-md
    ${isEnabled
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"}
  `}
            >
              <FontAwesomeIcon icon={faMagnifyingGlass} />
            </button>

          </div>

          <label htmlFor={inputId} className={labelClass}>
            {label}
            {required && (
              <span className="global-ref-asterisk-ui ml-1">*</span>
            )}
          </label>
        </>
      )}

      {/* TEXT FIELD */}
      {type === "text" && (
        <>
          <input
            id={inputId}
            type="text"
            placeholder=" "
            value={value || ""}
            onChange={handleChange}
            disabled={disabled}
            className={baseInput}
          />
          <label htmlFor={inputId} className={labelClass}>
            {label}
            {required && (
              <span className="global-ref-asterisk-ui ml-1">*</span>
            )}
          </label>
        </>
      )}

      {/* NUMBER FIELD */}
      {type === "number" && (
        <>
          <input
            id={inputId}
            type="number"
            placeholder=" "
            value={value || ""}
            onChange={handleChange}
            disabled={disabled}
            className={baseInput}
          />
          <label htmlFor={inputId} className={labelClass}>
            {label}
            {required && (
              <span className="global-ref-asterisk-ui ml-1">*</span>
            )}
          </label>
        </>
      )}

      {/* DATE FIELD */}
      {type === "date" && (
        <>
          <input
            id={inputId}
            type="date"
            placeholder=" "
            value={value || ""}
            onChange={handleChange}
            disabled={disabled}
            className={baseInput}
          />
          <label htmlFor={inputId} className={labelClass}>
            {label}
            {required && (
              <span className="global-ref-asterisk-ui ml-1">*</span>
            )}
          </label>
        </>
      )}

      {/* SELECT FIELD */}
      {type === "select" && (
        <>
          <select
            id={inputId}
            value={value || ""}
            onChange={handleChange}
            disabled={disabled}
            className={baseInput}
          >
            <option value=""></option>
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <label htmlFor={inputId} className={labelClass}>
            {label}
            {required && (
              <span className="global-ref-asterisk-ui ml-1">*</span>
            )}
          </label>

          <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
            <svg
              className="h-4 w-4 text-gray-500"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </>
      )}
    </div>
  );
};

export default FieldRenderer;
