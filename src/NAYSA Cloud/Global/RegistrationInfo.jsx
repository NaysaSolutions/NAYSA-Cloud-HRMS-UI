import React from "react";
import FieldRenderer from "./FieldRenderer";

const RegistrationInfo = ({ data = {}, layout = "stacked", showHeader = true }) => {
  const v = data || {};

  const parseSqlLocal = (value) => {
    if (!value) return null;
    const s = String(value).trim();
    const [datePart, timePartRaw] = s.includes("T") ? s.split("T") : s.split(" ");
    if (!datePart) return null;

    const [yyyy, mm, dd] = datePart.split("-").map(Number);
    if (!yyyy || !mm || !dd) return null;

    let hh = 0, mi = 0, ss = 0;
    if (timePartRaw) {
      const timePart = timePartRaw.split(".")[0];
      const t = timePart.split(":").map(Number);
      hh = t[0] || 0;
      mi = t[1] || 0;
      ss = t[2] || 0;
    }
    return new Date(yyyy, mm - 1, dd, hh, mi, ss);
  };

  const formatDateTime = (value) => {
    const d = parseSqlLocal(value);
    if (!d) return value ? String(value) : "";

    const monthsFull = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const pad = (n) => String(n).padStart(2, "0");

    let hours = d.getHours();
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;

    return `${monthsFull[d.getMonth()]} ${pad(d.getDate())}, ${d.getFullYear()} ${pad(
      hours
    )}:${pad(d.getMinutes())}:${pad(d.getSeconds())} ${ampm}`;
  };

  const firstValue = (...values) =>
    values.find((value) => String(value ?? "").trim() !== "") ?? "";

  // Display user names when provided by the stored procedure,
  // then fall back to the existing user code for backward compatibility.
  const registrationFields = [
    {
      label: "Registered By",
      value: firstValue(
        v.registeredByName,
        v.registeredByUserName,
        v.registeredName,
        v.registeredBy
      ),
    },
    { label: "Registered Date", value: formatDateTime(v.registeredDate) },
  ];

  const updateFields = [
    {
      label: "Updated By",
      value: firstValue(
        v.updatedByName,
        v.updatedByUserName,
        v.lastUpdatedByName,
        v.lastUpdatedName,
        v.lastUpdatedBy
      ),
    },
    { label: "Updated Date", value: formatDateTime(v.lastUpdatedDate) },
  ];

  // Helper to render individual field
  const renderField = (field) => (
    <FieldRenderer
      key={field.label}
      type="text"
      label={field.label}
      value={field.value || ""}
      readOnly={true}
      disabled={true}     
      variant="audit"     
    />
  );

  return (
    <div className={`bg-white dark:bg-slate-800 p-3 rounded-lg border dark:border-slate-700 shadow-sm ${layout === 'minimize' ? 'max-w-2xl' : ''}`}>
      {showHeader && (
        <h3 className="text-[9px] sm:text-[12px] font-bold text-slate-500 dark:text-slate-400 tracking-widest border-b dark:border-slate-700 pb-2 mb-3 uppercase">
          Registration Information
        </h3>
      )}

      {layout === "minimize" ? (
        /* MINIMIZE MODE: 2 Columns (Registration on left, Updates on right) */
        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          <div className="flex flex-col gap-3">
            {registrationFields.map(renderField)}
          </div>
          <div className="flex flex-col gap-3">
            {updateFields.map(renderField)}
          </div>
        </div>
      ) : layout === "straight" ? (
        /* STRAIGHT MODE: Header on top, all 4 fields in one horizontal row below */
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-5 gap-y-3">
          {[...registrationFields, ...updateFields].map(renderField)}
        </div>
      ) : (
        /* STANDARD MODES: twoCols or stacked */
        <div className={`flex flex-col gap-3 ${layout === "twoCols"
          ? "grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4"
          : "flex flex-col gap-4"}`}
        >
          {[...registrationFields, ...updateFields].map(renderField)}
        </div>
      )}
    </div>
  );
};

export default RegistrationInfo;