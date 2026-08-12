
export const useGetCurrentDay = () => new Date().toISOString().split('T')[0];



export const useGetCurrentDayV2 = () => {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  const year = today.getFullYear();
  const value = `${month}/${day}/${year}`;
  return value;
};



export const useGetFirstDayOfMonth = () => {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const month = String(firstDay.getMonth() + 1).padStart(2, "0");
  const day = String(firstDay.getDate()).padStart(2, "0");
  const year = firstDay.getFullYear();
  return `${month}/${day}/${year}`;
};



export const useGetLastDayOfMonth = () => {
 const today = new Date();
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const month = String(lastDay.getMonth() + 1).padStart(2, "0");
  const day = String(lastDay.getDate()).padStart(2, "0");
  const year = lastDay.getFullYear();
  return `${month}/${day}/${year}`;
};







export function useFormatToDate(value) {
  if (!value) return "";
  if (typeof value === "string") {
    const m = value.match(/^(\d{4}-\d{2}-\d{2})(?:T.*)?$/);
    if (m && !value.includes("T")) return m[1];
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";

  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10); 
}





export function useReturnToDate(value) {
  if (!value) return "";

  if (typeof value === "string") {
    const m = value.match(/^(\d{4}-\d{2}-\d{2})(?:T.*)?$/);
    if (m && !value.includes("T")) {
      const [year, month, day] = m[1].split('-');
      return `${month}/${day}/${year}`;
    }
  }

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  const year = local.getFullYear();
  const month = String(local.getMonth() + 1).padStart(2, '0');
  const day = String(local.getDate()).padStart(2, '0');
  return `${month}/${day}/${year}`;
}



export const useformatToDatev2 = (value) => {
  if (!value) return "";

  const raw = String(value).trim();
  const datePart = raw.includes("T") ? raw.split("T")[0] : raw;

  // Try hyphen-separated formats first (YYYY-MM-DD or DD-MM-YYYY)
  let parts = datePart.split("-");
  if (parts.length === 3) {
    const [a, b, c] = parts;
    if (a.length === 4) {
      // YYYY-MM-DD
      const year = a;
      const month = String(b).padStart(2, "0");
      const day = String(c).padStart(2, "0");
      return `${month}/${day}/${year}`;
    }
    if (c.length === 4) {
      // DD-MM-YYYY
      const year = c;
      const month = String(b).padStart(2, "0");
      const day = String(a).padStart(2, "0");
      return `${month}/${day}/${year}`;
    }
  }

  // Try slash-separated formats (MM/DD/YYYY or YYYY/MM/DD)
  parts = datePart.split("/");
  if (parts.length === 3) {
    const [a, b, c] = parts;
    if (a.length === 4) {
      // YYYY/MM/DD
      const year = a;
      const month = String(b).padStart(2, "0");
      const day = String(c).padStart(2, "0");
      return `${month}/${day}/${year}`;
    }
    if (c.length === 4) {
      // MM/DD/YYYY
      const year = c;
      const month = String(a).padStart(2, "0");
      const day = String(b).padStart(2, "0");
      return `${month}/${day}/${year}`;
    }
  }

  // Try compact numeric YYYYMMDD or DDMMYYYY
  const digits = datePart.replace(/\D/g, "");
  if (digits.length === 8) {
    // Assume YYYYMMDD
    const y = digits.slice(0, 4);
    const m = digits.slice(4, 6);
    const d = digits.slice(6, 8);
    return `${m}/${d}/${y}`;
  }

  // Fallback: use Date parsing and normalize to MM/DD/YYYY
  const dObj = new Date(raw);
  if (!Number.isNaN(dObj.getTime())) {
    const local = new Date(dObj.getTime() - dObj.getTimezoneOffset() * 60000);
    const year = local.getFullYear();
    const month = String(local.getMonth() + 1).padStart(2, "0");
    const day = String(local.getDate()).padStart(2, "0");
    return `${month}/${day}/${year}`;
  }

  return "";
};





// export const formatDateInput = (value) => {
//   const digits = String(value || "")
//     .replace(/\D/g, "")
//     .slice(0, 8);

//   if (digits.length <= 2) return digits;
//   if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
//   return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
// };

// export const isValidDateString = (value) => {
//   if (value === "") return true;

//   if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return false;

//   const [month, day, year] = value.split("/").map(Number);

//   if (year < 1900 || year > 2099) return false;
//   if (month < 1 || month > 12) return false;
//   if (day < 1 || day > 31) return false;

//   const date = new Date(year, month - 1, day);

//   return (
//     date.getFullYear() === year &&
//     date.getMonth() === month - 1 &&
//     date.getDate() === day
//   );
// };

// const applyDateValue = (fieldNameOrSetter, updateState, value) => {
//   if (typeof fieldNameOrSetter === "function") {
//     fieldNameOrSetter(value);
//     return;
//   }

//   if (updateState && typeof fieldNameOrSetter === "string") {
//     updateState({ [fieldNameOrSetter]: value });
//   }
// };

// export const usehandleDateChange = (value, fieldNameOrSetter, updateState) => {
//   const rawValue = String(value || "");

//   if (rawValue === "") {
//     applyDateValue(fieldNameOrSetter, updateState, "");
//     return;
//   }

//   // do not allow characters other than digits and /
//   if (!/^[0-9/]*$/.test(rawValue)) return;

//   // absolute max length for MM/dd/yyyy
//   if (rawValue.length > 10) return;

//   const parts = rawValue.split("/");

//   // month max 2 digits
//   if (parts[0]?.length > 2) return;

//   // day max 2 digits
//   if (parts[1]?.length > 2) return;

//   // year max 4 digits
//   if (parts[2]?.length > 4) return;

//   const formatted = formatDateInput(rawValue);
//   const formattedParts = formatted.split("/");

//   if (formattedParts[0] && Number(formattedParts[0]) > 12) return;
//   if (formattedParts[1] && Number(formattedParts[1]) > 31) return;

//   if (formattedParts[2] && formattedParts[2].length === 4) {
//     const year = Number(formattedParts[2]);
//     if (year < 1900 || year > 2099) return;
//   }

//   applyDateValue(fieldNameOrSetter, updateState, formatted);
// };

// export const usehandleDateBlur = (value, fieldNameOrSetter, updateState) => {
//   if (!isValidDateString(value)) {
//     applyDateValue(fieldNameOrSetter, updateState, "");
//   }
// };

