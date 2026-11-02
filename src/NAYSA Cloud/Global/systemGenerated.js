export const SYSTEM_GENERATED_ENDPOINT = "/systemGeneratedTransactions";

export const systemGeneratedNumeric = (value) => Number(String(value ?? "").replace(/,/g, "")) || 0;

const checkError = (record) => {
  if (record?.success === false || Number(record?.errorCount ?? record?.errorcount ?? 0) > 0) {
    throw new Error(record.errorMsg || record.errormsg || record.message || "System Generated request failed.");
  }
};

export const parseSystemGeneratedResult = (response) => {
  const body = response?.data;
  checkError(body);
  const payload = body?.data ?? body;
  const first = Array.isArray(payload) ? payload[0] : null;
  const record = first && typeof first === "object" && ("result" in first || "errorCount" in first) ? first : payload;
  checkError(record);
  let result = record?.result ?? record;
  if (typeof result === "string") {
    try {
      result = JSON.parse(result);
    } catch {
      throw new Error("The System Generated service returned invalid JSON.");
    }
  }
  checkError(result);
  if (result == null) throw new Error("The System Generated service returned no data.");
  return result;
};

export const parseSystemGeneratedReferences = (response) => {
  const data = parseSystemGeneratedResult(response);
  if (Array.isArray(data) || typeof data !== "object" || !Array.isArray(data.edCodes)) {
    throw new Error("The System Generated service returned invalid references.");
  }
  const references = Object.fromEntries(
    ["branches", "payGroups", "departments", "clients", "statuses", "positions", "cutoffs", "edCodes"].map((key) => {
      const rows = data[key] ?? [];
      if (!Array.isArray(rows)) throw new Error(`Invalid ${key} reference list.`);
      return [key, rows];
    }),
  );
  references.edCodes = references.edCodes.map((row) => ({
    ...row,
    code: row.edCode,
    description: row.edName,
  }));
  return references;
};

// Only persisted SG fields belong in this payload; header Amount/Frequency are bulk-entry controls.
export const buildSystemGeneratedPayload = (header, rows, userCode, formatDate) => ({
  jsonData: {
    sgId: header.sgId || null,
    sgDate: formatDate(header.sgDate),
    cutoffType: header.cutoffType,
    cutoffFrequency: header.cutoffFrequency,
    cutoffCode: header.cutoffCode,
    cutoffStartDate: formatDate(header.cutoffStartDate),
    cutoffEndDate: formatDate(header.cutoffEndDate),
    tranType: header.tranType || "Regular",
    remarks: header.remarks || "",
    genCode: header.genCode || "M",
    userCode,
    rows: rows.map((row, index) => ({
      groupId: row.groupId,
      lineNo: index + 1,
      empNo: row.empNo,
      edCode: row.edCode,
      startDate: formatDate(row.startDate),
      endDate: formatDate(row.endDate),
      amount: systemGeneratedNumeric(row.amount),
      frequency: row.frequency,
      holdFlag: row.holdFlag || "N",
      genCode: row.genCode || header.genCode || "M",
    })),
  },
});
