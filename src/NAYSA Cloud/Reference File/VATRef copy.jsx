// src/NAYSA Cloud/Reference File/VATRef.jsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faSave,
  faUndo,
  faPrint,
  faChevronDown,
  faFileCsv,
  faFileExcel,
  faFilePdf,
  faEdit,
  faTrashAlt
} from "@fortawesome/free-solid-svg-icons";


import SearchGlobalReferenceTable from "../Lookup/SearchGlobalReferenceTable";
import SearchCOAMast from "../Lookup/SearchCOAMast.jsx";


import { useTopDocDropDown } from "@/NAYSA Cloud/Global/top1RefTable";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import {
  useSwalErrorAlert,
  useSwalDeleteConfirm,
  useSwalshowSave,
  useSwalValidationAlert,
  useSwalDeleteRecord,
  useSwalInfoAlert,
} from "@/NAYSA Cloud/Global/behavior";



import {
  reftables,
  reftablesPDFGuide,
  reftablesVideoGuide,
  useGlobalDeleteRefTable
} from "@/NAYSA Cloud/Global/reftable";

import RegistrationInfo from "@/NAYSA Cloud/Global/RegistrationInfo.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";


const VATRef = () => {
  const { user } = useAuth();

  const docType = "VATRef";
  const documentTitle = reftables[docType];
  const pdfLink = reftablesPDFGuide[docType];
  const videoLink = reftablesVideoGuide[docType];
 const [isAccountModalOpen, setAccountModalOpen] = useState(false)
 const setValue = (name, value) => setFormData((p) => ({ ...p, [name]: value }));

  const showValidation = async (title, lines) => {
      const msg = Array.isArray(lines) ? lines.join("\n") : String(lines || "");
      return useSwalValidationAlert({
        icon: "error",
        title,
        message: msg,
      });
    };

  const [formData, setFormData] = useState({
    vatCode: "",
    vatName: "",
    vatType: "",
    vatClass: "",
    vatRate: "",
    vatCategory: "",
    acctCode: "",
    acctName: "",
  });

  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showAccountModal] = useState(false);
  const [accountModalSource] = useState(false);


  const [registrationInfo, setRegistrationInfo] = useState({
    registeredBy: "",
    registeredDate: "",
    lastUpdatedBy: "",
    lastUpdatedDate: "",
  });


  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);

  const [isOpenExport, setOpenExport] = useState(false);
  const exportRef = useRef(null); 


  const [vatTypes, setVatTypes] = useState([]);
  const [vatCat, setVatCat] = useState([]);
  const [vatClass, setVatClass] = useState([]);

  const [accountCode, setAccountCode] = useState([]);
  const [isDupCode, setIsDupCode] = useState(false);
  

  const LoadingSpinner = () => (
    <div className="fixed inset-0 z-[70] bg-black/20 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-xl px-6 py-4 shadow-xl">
        {saving ? "Saving…" : "Loading…"}
      </div>
    </div>
  );


 const extractRowsFromResponse = (response) => {
    const payload = response?.data;
    if (!payload?.success) return [];

    if (Array.isArray(payload.data) && payload.data[0]?.result) {
      try {
        return JSON.parse(payload.data[0].result) || [];
      } catch {
        return [];
      }
    }

    if (Array.isArray(payload.data)) return payload.data;
    return [];
  };

    const codeToName = (list, code) => {
    const x = String(code ?? "").trim();
    const found = (list || []).find((i) => String(i.code) === x);
    return found?.name || x;
  };

  const mapRowToUi = (a) => {
    // const fsConsoCode = a?.fsConsoCode ?? a?.fsConsCode ?? a?.fsconso_code ?? "";
    // const fsConsoName = a?.fsConsoName ?? a?.fsConsDesc ?? a?.fsconso_name ?? "";



    return {
      vatCode: a?.vatCode ?? a?.vat_code ?? "",
      vatName: a?.vatName ?? a?.vat_name ?? "",
      vatType: a?.vatType ?? a?.vat_type ?? "",
      vatClass: a?.vatClass ?? a?.vat_class ?? "",
      acctGroup: a?.acctGroup ?? a?.acct_group ?? "",
      vatRate: a?.vatRate ?? a?.vat_rate ?? "",
      vatCategory: a?.vatCategory ?? a?.vat_category ?? "",
      acctCode: a?.acctCode ?? a?.acct_code ?? "",
      acctName: a?.acctName ?? a?.acct_name ?? "",
      registeredBy: a?.registeredBy ?? a?.registered_by ?? "",
      registeredDate: a?.registeredDate ?? a?.registered_date ?? "",
      lastUpdatedBy: a?.lastUpdatedBy ?? a?.updated_by ?? "",
      lastUpdatedDate: a?.lastUpdatedDate ?? a?.updated_date ?? "",
    };

    
  };

    const normalizeDropdown = (items) =>
    (items || [])
      .map((x) => {
        const rawCode =
          x?.DROPDOWN_CODE ??
          x?.dropdown_code ??
          x?.dropdownCode ??
          x?.CODE ??
          x?.code ??
          "";
        const rawName =
          x?.DROPDOWN_NAME ??
          x?.dropdown_name ??
          x?.dropdownName ??
          x?.NAME ??
          x?.name ??
          "";

        const u = String(rawCode || "").toUpperCase();
        const uiCode = u === "DR" ? "Debit" : u === "CR" ? "Credit" : rawCode;
        const uiName =
          rawName || (u === "DR" ? "Debit" : u === "CR" ? "Credit" : "");

        return { code: uiCode || "", name: uiName || "" };
      })
      .filter((x) => x.code || x.name);


  // const VAT_TYPE_CODE = {
  //   Input: "I",
  //   Output: "O",
  // };

  // const ACCT_GRP_CODE = {
  //   "BALANCE SHEET": "B",
  //   "INCOME STATEMENT": "I",
  // };

    const normalizeVatType = (item) => {
    if (!item) return item;
    const code = String(item.code || "").trim();
    const name = String(item.name || "").trim();
    if (code.length === 1) return { code, name };

    const mapped =
      VAT_TYPE_CODE[code.toUpperCase()] || VAT_TYPE_CODE[name.toUpperCase()];
    return mapped ? { code: mapped, name } : item;
  };



    const normalizeVatClass = (item) => {
    if (!item) return item;
    const code = String(item.code || "").trim();
    const name = String(item.name || "").trim();
    if (code.length === 1) return { code, name };

    const mapped =
      VAT_ClASS_CODE[code.toUpperCase()] || VAT_ClASS_CODE[name.toUpperCase()];
    return mapped ? { code: mapped, name } : item;
  };


      const normalizeVatCat = (item) => {
    if (!item) return item;
    const code = String(item.code || "").trim();
    const name = String(item.name || "").trim();
    if (code.length === 1) return { code, name };

    const mapped =
      VAT_CATEGORY_CODE[code.toUpperCase()] || VAT_CATEGORY_CODE[name.toUpperCase()];
    return mapped ? { code: mapped, name } : item;
  };





  const latestDropdownReqRef = useRef(0);



  const loadHSDropdowns = async () => {
    const reqId = ++latestDropdownReqRef.current;

    try {
      const [type, clas, cat] = await Promise.all([
        useTopDocDropDown("VATREF", "VAT_TYPE"),
        useTopDocDropDown("VATREF", "VAT_CLASS"),
        useTopDocDropDown("VATREF", "VAT_CATEGORY"),
        // apiClient.get("/LoadVATClass"),
      ]);

      if (reqId !== latestDropdownReqRef.current) return;
 
      setVatTypes(normalizeDropdown(type).map(normalizeVatType))
      setVatClass(normalizeDropdown(clas).map(normalizeVatClass));
      setVatCat(normalizeDropdown(cat).map(normalizeVatCat));

      // const clsRows = extractRowsFromResponse(clsRes);
      // const cls = (clsRows || []).map((x) => ({
      //   code: x?.classCode ?? x?.class_code ?? "",
      //   name: x?.className ?? x?.class_name ?? "",
      // }));
      // setAccountClasses(cls.filter((x) => x.code || x.name));
    } catch (err) {
      console.error("Dropdown load failed", err);
      if (reqId !== latestDropdownReqRef.current) return;
      setVatTypes([]);
      setVatClass([]);
      setVatCat([]);
    }
  };

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get("/vat");
      const rows = extractRowsFromResponse(response);
      setAccounts(rows.map((a) => mapRowToUi(a)));
      console.log(rows)
    } catch (err) {
      console.error(err);
      await useSwalErrorAlert(
        "Error",
        `Failed to fetch accounts: ${err.message}`
      );
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  
  const getAccount = async (acctCode) => {
    setLoading(true);
    try {
      const response = await apiClient.post("/lookupCOA", {
        PARAMS: JSON.stringify({ search: "Single", acctCode }),
      });

      const rows = extractRowsFromResponse(response);
      const row = rows?.[0] ? mapRowToUi(rows[0]) : null;
      if (!row) throw new Error("Account not found");

      setRegistrationInfo({
        registeredBy: row.registeredBy || "",
        registeredDate: row.registeredDate || "",
        lastUpdatedBy: row.lastUpdatedBy || "",
        lastUpdatedDate: row.lastUpdatedDate || "",
      });

      const {
        registeredBy,
        registeredDate,
        lastUpdatedBy,
        lastUpdatedDate,
        ...formOnly
      } = row;

      return formOnly;
    } catch (error) {
      console.error(error);
      await useSwalErrorAlert("Error", "Failed to get account details");
      return null;
    } finally {
      setLoading(false);
    }
  };


  // ✅ click outside export
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportRef.current && !exportRef.current.contains(event.target)) {
        setOpenExport(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ✅ sorted list (no filters yet; SearchGlobalReferenceTable handles UI filtering/grouping)
  const filtered = useMemo(() => {
    const out = Array.isArray(accounts) ? [...accounts] : [];
    out.sort((a, b) =>
      String(a?.acctCode ?? "").localeCompare(String(b?.acctCode ?? ""), undefined, {
        numeric: true,
      })
    );
    return out;
  }, [accounts]);



    // ✅ SearchGlobalReferenceTable columns
    const columns = useMemo(
      () => [
        
        { key: "vatCode", label: "VAT Code", sortable: true },
        { key: "vatName", label: "VAT Name", sortable: true },
        { key: "vatType", label: "VAT Type", sortable: true },
        { key: "vatClass", label: "VAT Class", sortable: true },
        { key: "vatRate", label: "VAT Rate", sortable: true },
        { key: "vatCategory", label: "VAT Category", sortable: true },
        { key: "acctCode", label: "Account Code", sortable: true },
        {key: "acctName", label: "Account Name", sortable: true },
        {
          key: "__actions",
          label: "Actions",
          sortable: false,
          renderType: "actions",
          render: (row) => (
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                className="px-2 py-1 text-xs rounded-md bg-blue-600 text-white hover:bg-blue-700"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditAccount(row);
                }}
                title="Edit"
              >
                <FontAwesomeIcon icon={faEdit} />
              </button>
  
              <button
                type="button"
                className="px-2 py-1 text-xs rounded-md bg-red-600 text-white hover:bg-red-700"
                onClick={(e) => {
                  e.stopPropagation();
                  // handleDeleteAccount(row);
                }}
                title="Delete"
              >
                <FontAwesomeIcon icon={faTrashAlt} />
              </button>
            </div>
          ),
        },
      ],
      // important: include handlers used inside render
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [selectedAccount, accounts, loading, saving]
    );

  

 // ✅ display-ready rows for the table
const vatTableData = useMemo(() => {
  const rows = Array.isArray(filtered) ? filtered : [];
  return rows.map((row) => ({
    ...row,
    vatType: codeToName(vatTypes, row.vatType),
    vatClass: codeToName(vatClass, row.vatClass),
    vatCategory: codeToName(vatCat, row.vatCategory),
    // Just use row.acctName directly - it should already be populated from the SPROC
    acctName: row.acctName,
  }));
}, [filtered, vatTypes, vatClass, vatCat]);


  const resetForm = () => {
    setFormData({
    vatCode: "",
    vatName: "",
    vatType: "",
    vatClass: "",
    vatRate: "",
    vatCategory: "",
    acctCode: "",
    acctName: "",
    
    // showAccountModal,
    });
    

    setSelectedAccount(null);
    setIsEditing(false);

    setRegistrationInfo({
      registeredBy: "",
      registeredDate: "",
      lastUpdatedBy: "",
      lastUpdatedDate: "",
    });
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === "vatCode") setIsDupCode(false);
  };

  



  const setField = (name, value) => setFormData((p) => ({ ...p, [name]: value }));

  const startNew = () => {
    resetForm();
    setIsEditing(true);
  };


const latestGetRef = useRef(0);

  const handleEditAccount = async (row) => {
    const reqId = ++latestGetRef.current;
    setSelectedAccount(row);

    const full = await getAccount(row.acctCode);
    if (reqId !== latestGetRef.current) return;

    if (full) {
      setFormData(full);
      setSelectedAccount(full);
      setIsEditing(true);
    }

  };

    const handleSaveAccount = async () => {
    setSaving(true);


 try {
      const missingFields = [];

    const vatCode = (formData.vatCode || "").trim();
    const vatName = (formData.vatName || "").trim();
    const vatType = (formData.vatType || "").trim();
    const vatClass = (formData.vatClass || "").trim();
    const vatRate = (formData.vatRate || "").trim();
    const vatCategory = (formData.vatCategory || "").trim();
    const acctCode = (formData.acctCode || "").trim();
    const acctName = (formData.acctName || "").trim();

      if (!vatCode) missingFields.push("VAT Code");
      if (!vatName) missingFields.push("VAT Name");
      if (!vatType) missingFields.push("VAT Type");
      if (!vatClass) missingFields.push("VAT Class");
      if (!vatRate) missingFields.push("VAT Rate");
      if (!vatCategory) missingFields.push("VAT Category");
      if (!acctCode) missingFields.push("Account Code");
      if (!acctName) missingFields.push("Account Name");

      if (missingFields.length > 0) {
        await showValidation(
          "Missing Required Field(s)",
          missingFields.map((f) => `• ${f}`)
        );
        return;
      }

      const isAdd = !selectedAccount;

      if (isAdd && isDupCode) return;

      if (isAdd) {
        const isDuplicate = accounts.some(
          (a) =>
            String(a?.vatCode || "").trim().toUpperCase() === vatCode.toUpperCase()
        );

        if (isDuplicate) {
          setIsDupCode(true);
          await showValidation("Duplicate Entry", ["Duplicate Code is not allowed."]);
          return;
        }
      }

      const response = await apiClient.post("/upsertVat", {  
        json_data: JSON.stringify({
          json_data: {
            action: isAdd ? "ADD" : "EDIT",
            vatCode,
            vatName,
            vatType: formData.vatType,
            vatClass: formData.vatClass,
            vatRate: Number(vatRate) || 0,
            vatCategory: formData.vatCategory,
            acctCode: formData.acctCode,
            acctName: formData.acctName,
            userCode: user?.USER_CODE || "ADMIN",
          },
        }),
      });

      if (response?.data?.status === "success") {
        await useSwalshowSave(resetForm, () => { });
        await fetchAccounts();
      } else {
        await useSwalErrorAlert(
          "Save Failed",
          response?.data?.message || "Unable to save record."
        );
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.response?.data?.msg ||
        err?.message ||
        "Failed to save transaction.";

      await useSwalValidationAlert({ icon: "error", title: "Save Failed", message: msg });
    } finally {
      setSaving(false);
    }
  };


  // ✅ Ctrl+S (MUST be after handleSaveAccount)
  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!saving && isEditing) handleSaveAccount();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saving, isEditing, selectedAccount, formData]);

  const handleAcctCodeBlur = async () => {
    const code = (formData.vatCode || "").trim();
    if (!code) return;

    const isAdd = !selectedAccount;
    if (!isAdd) return;

    const dup = accounts.some(
      (a) => (a?.vatCode || "").trim().toUpperCase() === code.toUpperCase()
    );

    setIsDupCode(dup);

    if (dup) {
      await showValidation("Duplicate Entry", ["Duplicate Code is not allowed."]);
    }
  };


const handleExport = (format) => {
    setOpenExport(false);
    try {
      const payload = {
        entity: "exportVAT",
        format,
        filter: {},
      };

      apiClient
        .get("/load", { params: payload, responseType: "blob" })
        .then((response) => {
          const url = window.URL.createObjectURL(new Blob([response.data]));
          const link = document.createElement("a");
          link.href = url;
          link.setAttribute(
            "download",
            `vat_export_${format}_${new Date().toISOString().slice(0, 10)}.${format}`
          );
          document.body.appendChild(link);
          link.click();
          link.remove();
        });
    } catch (error) {
      console.error(error);
      useSwalErrorAlert("Export Error", `Failed to export to ${String(format).toUpperCase()}`);
    }
  };


  // options for FieldRenderer
  const optVatType = useMemo(
    () => vatTypes.map((x) => ({ value: x.code, label: x.name })),
    [vatTypes]
  );

const optVatClass = useMemo(
  () => (vatClass || []).map((x) => ({ value: x.code, label: x.name })),
  [vatClass] 
);
  
const optVatCategory = useMemo(
  () => (vatCat || []).map((x) => ({ value: x.code, label: x.name })),
  [vatCat] 
);



   
    useEffect(() => {
      let timer;
      if (loading) timer = setTimeout(() => setShowSpinner(true), 200);
      else setShowSpinner(false);
      return () => clearTimeout(timer);
    }, [loading]);


  useEffect(() => {
    fetchAccounts();
    loadHSDropdowns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="global-ref-main-div-ui mt-24">
      {(loading || saving) && showSpinner && <LoadingSpinner />}


      {/* HEADER */}
      <div className="fixed mt-4 top-14 left-6 right-6 z-30 global-ref-header-ui flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <h1 className="global-ref-headertext-ui">{documentTitle}</h1>
        </div>

        <div className="flex gap-2 justify-center text-xs">
          <button
            onClick={startNew}
            className="bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
          >
            <FontAwesomeIcon icon={faPlus} /> Add
          </button>

          <button
            onClick={handleSaveAccount}
            className={`bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 ${!isEditing || saving ? "opacity-50 cursor-not-allowed" : ""
              }`}
            disabled={!isEditing || saving}
            title="Ctrl+S to Save"
          >
            <FontAwesomeIcon icon={faSave} /> Save
          </button>

          <button
            onClick={resetForm}
            className="bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
            disabled={saving}
          >
            <FontAwesomeIcon icon={faUndo} /> Reset
          </button>

          <div ref={exportRef} className="relative">


            {isOpenExport && (
              <div className="absolute right-0 mt-1 w-40 rounded-lg shadow-lg bg-white ring-1 ring-black/10 z-[60] dark:bg-gray-800">
                <button
                  onClick={() => handleExport("csv")}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900"
                >
                  <FontAwesomeIcon icon={faFileCsv} className="mr-2 text-green-600" /> CSV
                </button>
                <button
                  onClick={() => handleExport("excel")}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900"
                >
                  <FontAwesomeIcon icon={faFileExcel} className="mr-2 text-green-600" /> Excel
                </button>
                <button
                  onClick={() => handleExport("pdf")}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900"
                >
                  <FontAwesomeIcon icon={faFilePdf} className="mr-2 text-red-600" /> PDF
                </button>
              </div>
            )}
          </div>
        </div>
      </div>



    
      {/* FORM */}
       <div className="global-tran-tab-div-ui mt-5" style={{ minHeight: "calc(100vh - 170px)" }}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Column 1 */}
          <div className="global-ref-textbox-group-div-ui space-y-4">
            {/* VAT Code  */}
            
              <FieldRenderer
               type="text"
               name="vatCode"
               label="VAT Code"
               value={formData.vatCode}
               onChange={handleFormChange}
               disabled={!isEditing}
               required
               />
            

            <FieldRenderer
               type="text"
               name="vatName"
               label="VAT Name"
               value={formData.vatName}
               onChange={handleFormChange}
               disabled={!isEditing}
               required
               />


            <FieldRenderer
               type="select"
               name="vatType"
               label="VAT Type"
               value={formData.vatType}
               options={optVatType}
               onChange={handleFormChange}
               disabled={!isEditing}
               required
               />

            <FieldRenderer
               type="select"
               name="vatClass"
               label="VAT Class"
               value={formData.vatClass}
              options={optVatClass}
               onChange={handleFormChange}
               disabled={!isEditing}
               required
               />
            

          </div>

          {/* Column 2 */}
          <div className="global-ref-textbox-group-div-ui space-y-4">
              <FieldRenderer
               type="text"
               name="vatRate"
               label="VAT Rate"
               value={formData.vatRate}
               onChange={handleFormChange}
               disabled={!isEditing}
               required
               />



               <FieldRenderer
               type="select"
               name="vatCategory"
               label="VAT Category"
               value={formData.vatCategory}
               options={optVatCategory}
               onChange={handleFormChange}
               disabled={!isEditing}
               required
               />

                <FieldRenderer
                  label="Account Code"
                  required
                  type="lookup"
                  name="acctCode"
                  // Directly use the acctCode and acctName stored in your formData
                  value={formData.acctCode ? `${formData.acctCode} - ${formData.acctName}` : ""}
                  readOnly={true}
                  disabled={!isEditing}
                  onLookup={!isEditing ? undefined : () => setAccountModalOpen(true)}
                />


          </div>
              
              <SearchCOAMast
                isOpen={isAccountModalOpen}
                onClose={(val) => {
                  if (val) {
                    setValue("acctCode", val.acctCode);
                    setValue("acctName", val.acctName);
                  }
                  setAccountModalOpen(false);
                }}
              />
                
          {/* Column 3 */}
          <div className="global-ref-textbox-group-div-ui space-y-4 max-w-md">
            <RegistrationInfo layout="stacked" data={registrationInfo} disabled />
          </div>
        </div>


        {/* TABLE */}
          <div className="global-tran-table-main-div-ui mt-6">
            <SearchGlobalReferenceTable
              docType={docType}
              columns={columns}
              data={vatTableData}
              itemsPerPage={50}
              showFilters
              isLoading={loading}
              onRowClick={(row) => setSelectedRow(row)}
              onRowDoubleClick={(row) => handleEdit(row)}
            />
          </div>
      </div>


    </div>
  );
};


export default VATRef;
