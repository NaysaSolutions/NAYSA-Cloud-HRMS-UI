import { useCallback, useEffect, useMemo, useState } from "react";
import { faSave, faUndo } from "@fortawesome/free-solid-svg-icons";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer";
import ButtonBar from "@/NAYSA Cloud/Global/ButtonBar";
import SearchCOAMast from "@/NAYSA Cloud/Lookup/SearchCOAMast";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";

const INITIAL_FORM = {
  drtLaborAcct: "",
  drtLaborAcctName: "",
  fohAcct: "",
  fohAcctName: "",
  mfgsryAcct: "",
  mfgsryAcctName: "",
  mfgfohAcct: "",
  mfgfohAcctName: "",
};

const ACCOUNT_FIELDS = [
  {
    key: "drtLaborAcct",
    nameKey: "drtLaborAcctName",
    label: "Direct Labor Account",
    dbField: "DRTLABOR_ACCT",
  },
  {
    key: "fohAcct",
    nameKey: "fohAcctName",
    label: "Factory Overhead Account",
    dbField: "FOH_ACCT",
  },
  {
    key: "mfgsryAcct",
    nameKey: "mfgsryAcctName",
    label: "MFG Salary Account",
    dbField: "MFGSRY_ACCT",
  },
  {
    key: "mfgfohAcct",
    nameKey: "mfgfohAcctName",
    label: "MFG FOH Account",
    dbField: "MFGFOH_ACCT",
  },
];

const getStoredUserCode = () => {
  const directKeys = ["userCode", "USER_CODE", "user_code"];

  for (const key of directKeys) {
    const value = localStorage.getItem(key);
    if (value) return value;
  }

  const objectKeys = ["auth", "user", "authUser", "currentUser", "naysaUser"];

  for (const key of objectKeys) {
    try {
      const value = localStorage.getItem(key);
      if (!value) continue;

      const parsed = JSON.parse(value);
      const code =
        parsed?.userCode ||
        parsed?.user_code ||
        parsed?.USER_CODE ||
        parsed?.user?.userCode ||
        parsed?.user?.user_code ||
        parsed?.user?.USER_CODE;

      if (code) return code;
    } catch {
      // Ignore invalid localStorage JSON values.
    }
  }

  return "";
};

const parseApiRows = (payload) => {
  if (!payload) return [];

  const data = payload.data;

  if (Array.isArray(data)) {
    const firstRow = data[0];
    const rawResult = firstRow?.result;

    if (typeof rawResult === "string") {
      try {
        const parsed = JSON.parse(rawResult);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }

    return data;
  }

  const rawResult = data?.result ?? payload?.result;

  if (typeof rawResult === "string") {
    try {
      const parsed = JSON.parse(rawResult);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
};

const pickValue = (row, ...keys) => {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null) return String(value).trim();
  }
  return "";
};

const getApiErrorMessage = (error, fallback) =>
  error?.response?.data?.errormsg ||
  error?.response?.data?.message ||
  error?.message ||
  fallback;

export default function ProdParameters() {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeAccountField, setActiveAccountField] = useState(null);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    document.title = "Production Parameters";
  }, []);

  const updateForm = (updates) => setFormData((prev) => ({ ...prev, ...updates }));

  const isFormEmpty = useMemo(
    () => ACCOUNT_FIELDS.every((field) => !String(formData[field.key] || "").trim()),
    [formData]
  );

  const getActionButtonClass = (disabled = false) =>
    `flex h-8 min-w-[78px] items-center justify-center gap-2 rounded-md px-3 text-xs font-medium text-white transition-all ${
      disabled
        ? "cursor-not-allowed bg-blue-500 opacity-50"
        : "bg-blue-600 hover:bg-blue-700"
    }`;

  const loadParameters = useCallback(async () => {
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const { data: payload } = await apiClient.get("/prodParameters/load");

      if (payload.success === false) {
        throw new Error(payload.message || "Unable to load Production Parameters.");
      }

      const rows = parseApiRows(payload);
      const row = rows[0] || {};

      setFormData({
        drtLaborAcct: pickValue(row, "drtLaborAcct", "DRTLABOR_ACCT"),
        drtLaborAcctName: pickValue(row, "drtLaborAcctName", "DRTLABOR_ACCT_NAME", "drtLaborAcctDesc"),
        fohAcct: pickValue(row, "fohAcct", "FOH_ACCT"),
        fohAcctName: pickValue(row, "fohAcctName", "FOH_ACCT_NAME", "fohAcctDesc"),
        mfgsryAcct: pickValue(row, "mfgsryAcct", "MFGSRY_ACCT"),
        mfgsryAcctName: pickValue(row, "mfgsryAcctName", "MFGSRY_ACCT_NAME", "mfgsryAcctDesc"),
        mfgfohAcct: pickValue(row, "mfgfohAcct", "MFGFOH_ACCT"),
        mfgfohAcctName: pickValue(row, "mfgfohAcctName", "MFGFOH_ACCT_NAME", "mfgfohAcctDesc"),
      });
    } catch (error) {
      console.error("Load Production Parameters failed:", error);
      setMessage({
        type: "error",
        text: getApiErrorMessage(error, "Unable to load Production Parameters."),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadParameters();
  }, [loadParameters]);

  const validateForm = useCallback(() => {
    const missingFields = ACCOUNT_FIELDS.filter(
      (field) => !String(formData[field.key] || "").trim()
    ).map((field) => field.label);

    if (missingFields.length > 0) {
      setMessage({
        type: "error",
        text: `Please fill in the required field(s): ${missingFields.join(", ")}`,
      });
      return false;
    }

    return true;
  }, [formData]);

  const handleSave = useCallback(async () => {
    setMessage({ type: "", text: "" });

    if (!validateForm()) return;

    setSaving(true);

    try {
      const { data: payload } = await apiClient.post("/prodParameters/upsert", {
        json_data: {
          drtLaborAcct: formData.drtLaborAcct,
          fohAcct: formData.fohAcct,
          mfgsryAcct: formData.mfgsryAcct,
          mfgfohAcct: formData.mfgfohAcct,
          userCode: getStoredUserCode(),
        },
      });

      if (payload.success === false) {
        throw new Error(
          payload.errormsg || payload.message || "Unable to save Production Parameters."
        );
      }

      setMessage({
        type: "success",
        text: payload.message || "Production Parameters saved successfully.",
      });

      await loadParameters();
    } catch (error) {
      console.error("Save Production Parameters failed:", error);
      setMessage({
        type: "error",
        text: getApiErrorMessage(error, "Unable to save Production Parameters."),
      });
    } finally {
      setSaving(false);
    }
  }, [formData, loadParameters, validateForm]);

  const handleReset = () => {
    setActiveAccountField(null);
    loadParameters();
  };

  const getAccountDisplayValue = (field) => {
    const acctCode = formData[field.key];
    const acctName = formData[field.nameKey];

    return acctCode ? `${acctCode}${acctName ? ` - ${acctName}` : ""}` : "";
  };

  const handleCloseAccountLookup = (selectedAccount) => {
    if (selectedAccount && activeAccountField) {
      updateForm({
        [activeAccountField.key]: selectedAccount.acctCode || "",
        [activeAccountField.nameKey]: selectedAccount.acctName || "",
      });
      setMessage({ type: "", text: "" });
    }

    setActiveAccountField(null);
  };

  useEffect(() => {
    const handleKey = (e) => {
      if (e.ctrlKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!saving && !loading && !isFormEmpty) handleSave();
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleSave, saving, loading, isFormEmpty]);

  const isBusy = loading || saving;

  return (
    <div className="global-ref-main-div-ui">
      {isBusy && <LoadingSpinner />}

      <div className="global-ref-header-ui mx-auto w-full max-w-[680px]">
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="global-ref-headertext-ui w-full truncate text-center !text-base !leading-tight sm:w-auto sm:text-left sm:!text-lg lg:!text-xl">
            Production Parameters
          </h1>

          <div className="flex w-full justify-center sm:w-auto sm:justify-end">
            <ButtonBar
              buttons={[
                {
                  key: "save",
                  label: <span className="hidden sm:inline">Save</span>,
                  icon: faSave,
                  onClick: handleSave,
                  disabled: isBusy || isFormEmpty,
                  className: getActionButtonClass(isBusy || isFormEmpty),
                },
                {
                  key: "reset",
                  label: <span className="hidden sm:inline">Reset</span>,
                  icon: faUndo,
                  onClick: handleReset,
                  disabled: isBusy,
                  className: getActionButtonClass(isBusy),
                },
              ]}
            />
          </div>
        </div>
      </div>

      <div className="global-ref-tab-div-ui mx-auto w-full max-w-[680px] !mt-28">
        <div className="mx-auto flex w-full max-w-[560px] flex-col gap-4 py-2">
          <div className="mb-1 text-center text-sm font-semibold text-slate-700 dark:text-gray-200">
            Production Account Setup
          </div>

          {message.text && (
            <div
              className={`rounded-md px-3 py-2 text-xs font-medium ${
                message.type === "success"
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
              }`}
            >
              {message.text}
            </div>
          )}

          {ACCOUNT_FIELDS.map((field) => (
            <FieldRenderer
              key={field.key}
              id={field.key}
              label={field.label}
              type="lookup"
              required
              value={getAccountDisplayValue(field)}
              disabled={isBusy}
              editableLookup
              onLookup={() => setActiveAccountField(field)}
              onClear={() =>
                updateForm({
                  [field.key]: "",
                  [field.nameKey]: "",
                })
              }
            />
          ))}
        </div>
      </div>

      {activeAccountField && (
        <SearchCOAMast
          isOpen={Boolean(activeAccountField)}
          source={activeAccountField.key}
          customParam="ActiveAll"
          title={`Select ${activeAccountField.label}`}
          onClose={handleCloseAccountLookup}
        />
      )}
    </div>
  );
}
