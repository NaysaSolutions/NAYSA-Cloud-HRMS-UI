import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

const VARIANT_CLASS = {
  primary: "bg-blue-600 hover:bg-blue-700 text-white",
  danger: "bg-red-600 hover:bg-red-700 text-white",
  secondary: "bg-gray-500 hover:bg-gray-600 text-white",
  success: "bg-green-600 hover:bg-green-700 text-white",
};

const ButtonBar = ({ buttons }) => {
  return (
    <div className="flex gap-1 justify-center text-xs">
      {buttons.map((btn) => {
        const variant = btn.variant || "primary";

        const baseClass =
          "px-3 py-2 rounded-lg flex items-center gap-2 transition-colors";

        const disabledClass = btn.disabled
          ? "opacity-50 cursor-not-allowed"
          : "";

        const variantClass =
          VARIANT_CLASS[variant] || VARIANT_CLASS.primary;

        return (
          <div key={btn.key || btn.label} className={btn.wrapperClassName || ""}>
            <button
              onClick={btn.onClick}
              disabled={btn.disabled}
              className={
                btn.className ||
                `${baseClass} ${variantClass} ${disabledClass}`
              }
            >
              {btn.icon && <FontAwesomeIcon icon={btn.icon} />}
              {btn.label}
              {btn.trailingIcon && (
                <FontAwesomeIcon
                  icon={btn.trailingIcon}
                  className="text-[10px]"
                />
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default ButtonBar;
