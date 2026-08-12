import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye } from "@fortawesome/free-solid-svg-icons";

const PermissionBadge = ({
  permission = "",
  isReadOnly = false,
  isFullAccess = false,
  variant = "reference",
  className = "",
}) => {
  const accessText =
    isReadOnly || String(permission).toUpperCase() === "READ"
      ? "READ ONLY"
      : isFullAccess || String(permission).toUpperCase() === "FULL"
      ? "FULL ACCESS"
      : String(permission || "").toUpperCase();

  // Hide badge when FULL ACCESS or no permission
  if (accessText === "FULL ACCESS" || !accessText) {
    return null;
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 text-blue-700 ${className}`}
      title="Read Only"
    >
      <FontAwesomeIcon icon={faEye} className="text-[11px]" />

      <span
        className={`font-bold uppercase tracking-wide ${
          variant === "transaction" ? "text-xs" : "text-[11px]"
        }`}
      >
        READ ONLY
      </span>
    </div>
  );
};

export default PermissionBadge;