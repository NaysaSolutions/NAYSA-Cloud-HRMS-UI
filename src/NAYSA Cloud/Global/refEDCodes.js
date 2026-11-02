export const ED_FIELDS = [
  { key: "edCode", label: "E/D Code", column: "ED_CODE", max: 3, required: true },
  { key: "edName", label: "E/D Description", column: "ED_NAME", max: 200, required: true },
  { key: "edType", label: "Category", column: "ED_TYPE", max: 15, type: "category" },
  { key: "code", label: "Classification", column: "CODE", max: 15 },
  { key: "reportHdr", label: "Report Header", column: "REPORT_HDR", max: 200 },
  { key: "reportField", label: "Report Field", column: "REPORT_FIELD", max: 20 },
  { key: "ctrp", label: "CTRP", column: "CTRP", max: 1, type: "flag" },
  { key: "deminimis", label: "Compute Deminimis", column: "DEMINIMIS", max: 1, type: "flag" },
  { key: "taxable", label: "Taxable", column: "TAXABLE", max: 1, type: "flag" },
  { key: "order", label: "Order", column: "ORDER", max: 2 },
  { key: "compSss", label: "Compute SSS", column: "COMP_SSS", max: 1, type: "flag" },
  { key: "compPh", label: "Compute PhilHealth", column: "COMP_PH", max: 1, type: "flag" },
  { key: "compHdmf", label: "Compute HDMF", column: "COMP_HDMF", max: 5 },
  { key: "acctCode", label: "Account Code", column: "ACCT_CODE", max: 15 },
  { key: "acctName", label: "Account Name", column: "ACCT_NAME", max: 200 },
  { key: "bonusFlag", label: "Bonus", column: "BONUS_FLAG", max: 1, type: "flag" },
  { key: "includeBonexamt", label: "Compute Bonus Exempt", column: "INCLUDE_BONEXAMT", max: 1, type: "flag" },
  { key: "includeMp13", label: "Compute 13th Month Pay", column: "INCLUDE_MP13", max: 1, type: "flag" },
  { key: "tax2316", label: "Tax 2316", column: "TAX_2316", max: 5 },
  { key: "ntax2316", label: "NTax 2316", column: "NTAX_2316", max: 5 },
  { key: "active", label: "Active", column: "ACTIVE", max: 1, type: "flag" },
];

export const ED_INITIAL_FORM = Object.fromEntries(ED_FIELDS.map(({ key }) => [key, key === "active" ? "Y" : ""]));

export const normalizeEDForm = (record = {}) => Object.fromEntries(
  ED_FIELDS.map(({ key }) => [key, String(record[key] ?? ED_INITIAL_FORM[key]).trim()]),
);

const assertSuccess = (record) => {
  if (record?.success === false || Number(record?.errorcount ?? record?.errorCount ?? 0) > 0) {
    throw new Error(record.errormsg || record.errorMsg || record.message || "E/D code request failed.");
  }
};

export const parseEDResult = (response) => {
  const body = response?.data;
  assertSuccess(body);
  const row = body?.data?.[0] ?? body?.[0] ?? body;
  assertSuccess(row);
  const raw = row?.result ?? row;
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  assertSuccess(parsed);
  return parsed;
};

export const parseEDFlag = (response) => {
  const parsed = parseEDResult(response);
  const flag = parsed?.result ?? parsed;
  if (!["0", "1", 0, 1].includes(flag)) throw new Error("Invalid E/D code validation response.");
  return String(flag) === "1";
};

export const validateEDForm = (form) => {
  for (const field of ED_FIELDS) {
    const value = String(form[field.key] ?? "").trim();
    if (field.required && !value) return `${field.label} is required.`;
    if (value.length > field.max) return `${field.label} must not exceed ${field.max} characters.`;
    if (field.type === "flag" && value && !["Y", "N"].includes(value)) return `${field.label} must be Yes or No.`;
  }
  if (form.edType && !["EARN", "DED"].includes(form.edType)) return "Category must be Earnings or Deductions.";
  return "";
};

export const buildEDPayload = (form, userCode, action) => ({
  json_data: { ...normalizeEDForm(form), edCode: form.edCode.trim().toUpperCase(), userCode, action },
});
