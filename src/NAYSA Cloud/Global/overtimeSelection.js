const parseJson = (value) => {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error("The overtime service returned invalid JSON. Please reload the lookup.");
  }
};

const checkError = (record) => {
  if (
    record?.success === false ||
    Number(record?.errorCount ?? record?.errorcount ?? 0) > 0
  ) {
    throw new Error(
      record.errorMsg || record.errormsg || record.message || "Unable to load overtime selections.",
    );
  }
};

export const parseOvertimeSelectionResult = (response) => {
  const body = response?.data;
  checkError(body);
  const payload = body?.data ?? body;
  const firstRow = Array.isArray(payload) ? payload[0] : null;
  const record = firstRow && typeof firstRow === "object" && (
    "result" in firstRow || "errorCount" in firstRow || "errorcount" in firstRow
  ) ? firstRow : payload;
  checkError(record);
  const result = parseJson(record?.result ?? record);
  checkError(result);
  if (result == null) {
    throw new Error("The overtime service returned no selection data. Please reload the lookup.");
  }
  return result;
};

export const parseOvertimeReferences = (response) => {
  const data = parseOvertimeSelectionResult(response);
  const keys = ["branches", "payGroups", "departments", "overtimes"];
  if (
    typeof data !== "object" || Array.isArray(data) ||
    !keys.some((key) => Object.prototype.hasOwnProperty.call(data, key))
  ) {
    throw new Error("The overtime service returned an invalid selection reference response.");
  }

  return Object.fromEntries(keys.map((key) => {
    const list = parseJson(data[key]) ?? [];
    if (!Array.isArray(list)) {
      throw new Error(`The overtime service returned an invalid ${key} list.`);
    }
    return [key, list];
  }));
};
