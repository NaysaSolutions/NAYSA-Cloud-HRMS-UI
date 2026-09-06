import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { useSwalErrorAlert as showErrorAlert, useSwalErrorAlertAPI as showApiErrorAlert, useSwalSuccessAlert as showSuccessAlert } from "@/NAYSA Cloud/Global/behavior.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer";
import ButtonBar from "@/NAYSA Cloud/Global/ButtonBar";
import { faSave, faUndo } from "@fortawesome/free-solid-svg-icons";

/* These shared alert utilities retain their historical use* exports but are called as callbacks. */
/* eslint-disable react/prop-types */

const INITIAL_FORM = {
  compCode: "001", compName: "", compAddress: "", compEmail: "", compTin: "", compSss: "", compHdmf: "", compPh: "", compTelNo: "", compFaxNo: "", zipCode: "", rdoCode: "", year: String(new Date().getFullYear()), cutoffCode: "", cutoffName: "", cutoffType: "S", cutoffFreq: "S1", cutoffStart: "", cutoffEnd: "", cutoffDate: "", cutoffMonthCode: "", cutoffMonthName: "", taxTable: "", regDaysYr: "", regHrs: "", minNetpayRate: "", minNetpayAmount: "", maxNtaxBonus: "", maxNtaxIncome: "", deminimis: "", gracePeriod: "", minOt: "", ndOtStart: "22:00", ndOtEnd: "06:00", dailyRateDecimal: "", hourRateDecimal: "", employeePortal: "", portalUrl: "", emailAppLv: "", emailAppOt: "", emailAppOb: "", emailAppDtr: "", tsType: "", tsTemplate: "", bioType: "", rptType: "", timezone: "Asia/Manila", "13mpCountD": "", "13mpCountS": "", "13mpCountM": "", sssCalcM: "", sssCalcS: "", sssCalcD: "", phCalcM: "", phCalcS: "", phCalcD: "", hdmfCalcM: "", hdmfCalcS: "", hdmfCalcD: "", attachLoc: "", pathPrinting: "", licensedBy: "", version: "",
};

const dateValue = (value) => {
  if (!value || String(value).startsWith("1900-01-01") || String(value).startsWith("0001-01-01")) return "";
  return String(value).slice(0, 10);
};
const asForm = (data) => Object.keys(INITIAL_FORM).reduce((form, key) => {
  form[key] = ["cutoffStart", "cutoffEnd", "cutoffDate"].includes(key) ? dateValue(data?.[key]) : data?.[key] ?? INITIAL_FORM[key];
  return form;
}, { ...INITIAL_FORM });

const Section = ({ title, children }) => <fieldset className="border border-slate-300 bg-white p-3"><legend className="px-1 p-3 text-xs font-bold text-slate-600">{title}</legend>{children}</fieldset>;
const Grid = ({ children }) => <div className="grid grid-cols-1 gap-3 md:grid-cols-3">{children}</div>;

const Company = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [formData, setFormData] = useState(INITIAL_FORM);
  const { data: fetchedData, isLoading } = useQuery({
    queryKey: ["companyData"],
    queryFn: async () => {
      const { data } = await apiClient.get("/getCompany", { params: { mode: "get" } });
      const raw = data?.data?.[0]?.result || data?.result;
      const parsed = raw ? JSON.parse(raw) : [];
      return parsed?.[0] || null;
    },
  });
  useEffect(() => { if (fetchedData) setFormData(asForm(fetchedData)); }, [fetchedData]);
  const update = (key, value) => setFormData((prev) => ({ ...prev, [key]: value }));
  const field = (key, label, props = {}) => <FieldRenderer id={key} label={label} value={formData[key]} onChange={(value) => update(key, value)} {...props} />;
  const payloadData = useMemo(() => ({
    ...formData, userCode: user?.USER_CODE || "ADMIN",
    ...Object.fromEntries(["regDaysYr", "regHrs", "minNetpayRate", "minNetpayAmount", "maxNtaxBonus", "maxNtaxIncome", "deminimis", "gracePeriod", "minOt"].map((key) => [key, formData[key] === "" ? null : Number(formData[key])])),
  }), [formData, user]);
  const { mutate: saveCompany, isPending: isSaving } = useMutation({
    mutationFn: (jsonData) => apiClient.post("/upsertCompany", { json_data: JSON.stringify({ json_data: jsonData }) }),
    onSuccess: (response) => {
      const row = response?.data?.data?.[0];
      if (!row) return showErrorAlert("Error", "The server returned no save result.");
      if (Number(row.errorcount || 0) > 0) return showErrorAlert("Missing Required Field(s):", row.errormsg);
      queryClient.invalidateQueries({ queryKey: ["companyData"] });
      showSuccessAlert("Success!", "Changes have been saved!");
    },
    onError: (error) => showApiErrorAlert("System Error", error?.response?.status ? `Request failed (HTTP ${error.response.status})` : `No response from server.\n${error?.message || ""}`),
  });
  const handleSave = () => {
    if (!formData.compCode.trim() || !formData.compName.trim() || !formData.compAddress.trim() || !formData.year.trim()) return showErrorAlert("Missing Required Field(s)", "Company Code, Company Name, Address, and Payroll Year are required.");
    saveCompany(payloadData);
  };
  return <div className="global-ref-main-div-ui">
    {(isLoading || isSaving) && <LoadingSpinner />}
    <div className="global-ref-header-ui">
      <h1 className="global-ref-headertext-ui">Payroll Parameters</h1>
        <ButtonBar buttons={[
        { key: "save", label: <span className="hidden sm:inline ml-2">Save</span>, 
          icon: faSave, onClick: handleSave, 
          disabled: isSaving, 
          className: "flex items-center justify-center h-8 w-8 sm:w-auto sm:px-4 text-xs rounded-md bg-blue-600 text-white hover:bg-blue-700" },
        { key: "reset", label: <span className="hidden sm:inline ml-2">Reset</span>, 
          icon: faUndo, onClick: () => queryClient.invalidateQueries({ queryKey: ["companyData"] }), 
          className: "flex items-center justify-center h-8 w-8 sm:w-auto sm:px-4 text-xs rounded-md bg-slate-500 text-white hover:bg-slate-600" },
        ]} />
    </div>
    <div className="global-ref-tab-div-ui mt-24 space-y-4">
      <Section title="Company Information">
        <Grid>
          {field("compCode", "Company Code", { required: true, disabled : true })}
          {field("compName", "Company Name", { required: true, disabled : true })}
          {field("compAddress", "Address", { required: true })}
          {field("compEmail", "Email")}
          {field("compTin", "TIN")}
          {field("compSss", "SSS No.")}
          {field("compHdmf", "Pag-ibig No.")}
          {field("compPh", "PhilHealth No.")}
          {field("zipCode", "Postal ZIP Code", { maxLength: 4 })}      
          {field("rdoCode", "RDO Code")}
          {field("compTelNo", "Telephone No.")}
          {field("compFaxNo", "Fax No.")}
        </Grid>
      </Section>   
      <Section title="Current Payroll Set-Up">
        <Grid>
          {field("year", "Current Payroll Year", { required: true, disabled : true, type: "number", min: 1900, max: 9999 })}
          {field("cutoffType", "Cut-Off Type", 
            { disabled : true, type: "select", options: [
              { value: "S", label: "Semi-Monthly" }, 
              { value: "M", label: "Monthly" }, 
              { value: "W", label: "Weekly" }] 
            })}
          {field("cutoffFreq", "Frequency", 
            { disabled : true, type: "select", options: [
              { value: "S1", label: "Semi Monthly 1" }, 
              { value: "S2", label: "Semi-Monthly 2" }, 
              { value: "W1", label: "Week 1" }, 
              { value: "W2", label: "Week 2"}, 
              { value: "W3", label: "Week 3"}, 
              { value: "W4", label: "Week 4"}, 
              { value: "W5", label: "Week 5"}, 
              { value: "M", label: "Monthly"} ] 
            })}
          {field("cutoffCode", "Cut-Off Code")}
          {field("cutoffName", "Current Payroll Period", { disabled : true })}
          {field("cutoffStart", "Payroll Start", { type: "date", disabled : true })}
          {field("cutoffEnd", "Payroll End", { type: "date", disabled : true })}
          {field("cutoffDate", "Payroll Date", { type: "date", disabled : true })}
          {field("cutoffMonthName", "Payroll Month", { disabled : true })}
        </Grid>
      </Section>
      <Section title="Company Default Set-Up">
        <Grid>
          
          {field("taxTable", "Ref. Tax Table", { type: "select", options: [{ value: "E", label: "Employee Master Data" }, { value: "C", label: "Payroll Period" }, { value: "F", label: "Fixed Rate" }] })}
          {field("regDaysYr", "Reg. Days/Year", { type: "number", step: "0.01" })}
          {field("regHrs", "Reg. Hours", { type: "number", step: "0.01" })}
        </Grid>
      </Section>
      <Section title="Payroll Rules">
        <Grid>
          {field("maxNtaxBonus", "Max NTax Bonus", { type: "number", step: "0.01" })}
          {field("maxNtaxIncome", "Max NTax Income", { type: "number", step: "0.01" })}
          {field("deminimis", "Max NTax De minimis", { type: "number", step: "0.01" })}
          {field("minNetpayRate", "Minimum Net Pay Rate", { type: "number", step: "0.01" })}
          {field("minNetpayAmount", "Minimum Net Pay Amount", { type: "number", step: "0.01" })}
          {field("gracePeriod", "Grace Period (Mins)", { type: "number", step: "1" })}
          {field("minOt", "Minimum OT (Mins)", { type: "number", step: "1" })}
          {field("ndOtStart", "ND Start Time (hh:mm)", { maxLength: 5 })}
          {field("ndOtEnd", "ND End Time (hh:mm)", { maxLength: 5 })}
        </Grid>
      </Section>
    </div>
  </div>;
};

export default Company;
