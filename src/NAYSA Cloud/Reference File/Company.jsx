import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";

// Import Lookup Modals
import BranchLookupModal from "@/NAYSA Cloud/Lookup/SearchBranchRef";
import SearchCurrRef from "@/NAYSA Cloud/Lookup/SearchCurrRef";
import SearchBankMast from "@/NAYSA Cloud/Lookup/SearchBankMast";
import SearchRCMast from "@/NAYSA Cloud/Lookup/SearchRCMast";
import SearchEmailNotification from "@/NAYSA Cloud/Lookup/SearchEmailNotification";

import {
  useGetCurrentDayV2,
  useformatToDatev2,
} from "@/NAYSA Cloud/Global/dates";

import DateFormatInput from "@/NAYSA Cloud/Global/DateFormatInput.jsx";

// Icons & Globals
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faFilePdf, faSave, faUndo, faInfoCircle, faVideo, faTimes, faSpinner, faSearch } from "@fortawesome/free-solid-svg-icons";
import { reftables, reftablesPDFGuide, reftablesVideoGuide } from "@/NAYSA Cloud/Global/reftable";
import { useSwalErrorAlert, useSwalSuccessAlert, useSwalErrorAlertAPI} from "@/NAYSA Cloud/Global/behavior.jsx";
import { useFieldLenghtCheck, useGetFieldLength,} from '@/NAYSA Cloud/Global/procedure';
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

// UI Helpers
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer";
import ButtonBar from "@/NAYSA Cloud/Global/ButtonBar";

const INITIAL_FORM = {
  compCode: "",
  compName: "",
  classification: "",
  rdoCode: "",
  compEmail: "",
  branchCode: "",
  branchName: "",
  cutoffCode: "",
  cutoffName: "",
  currencyCode: "",
  currencyName: "",
  disbursementBankCode: "",
  disbursementBankName: "",
  depositBankCode: "",
  depositBankName: "",
  staleCheckDueDays: 0,
  globalRespCenter: "",
  globalRespCenterName: "",
  salesRespCenter: "",
  salesRespCenterName: "",
  birAcNo: "",
  birReleaseNo: "",
  birAcDateIssued: "",
  payor2307Name: "",
  payor2307TIN: "",
  payor2307Position: "",
  userCode: "",
  tblFieldArray: [],
  tblFieldArrayBir: [],
};

const CompanyCutoffLookup = ({ isOpen, onClose }) => {
  const [filters, setFilters] = useState({
    cutoffCode: "",
    cutoffName: "",
  });

  const {
    data: cutoffs = [],
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ["companyOpenCutoffLookup"],
    queryFn: async () => {
      const { data } = await apiClient.get("/cutOff");
      const raw = data?.data?.[0]?.result || data?.result;
      return raw ? JSON.parse(raw) : [];
    },
    enabled: isOpen,
    staleTime: 1000 * 60 * 5,
  });

  const filteredCutoffs = useMemo(() => {
    const cutoffCodeFilter = filters.cutoffCode.toLowerCase();
    const cutoffNameFilter = filters.cutoffName.toLowerCase();

    return cutoffs.filter((item) => {
      const status = String(item.status || item.Status || "").trim().toUpperCase();
      const isClosed = status === "C" || status === "CLOSED";

      return (
        !isClosed &&
        String(item.cutoffCode || "")
          .toLowerCase()
          .includes(cutoffCodeFilter) &&
        String(item.cutoffName || "")
          .toLowerCase()
          .includes(cutoffNameFilter)
      );
    });
  }, [cutoffs, filters]);

  const handleApply = (cutoff) => {
    onClose({
      cutoffCode: cutoff.cutoffCode || "",
      cutoffName: cutoff.cutoffName || "",
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col relative overflow-hidden transform animate-scale-in border border-slate-200">
        <div className="flex items-center justify-between bg-slate-100 border-b border-slate-200">
          <div className="flex items-center gap-2 pl-3">
            <h2 className="global-lookup-headertext-ui">Search Cut Off</h2>
            {isFetching && (
              <div className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </div>
            )}
          </div>

          <button
            onClick={() => onClose(null)}
            className="p-2 text-slate-400 hover:text-red-600 transition-colors"
          >
            <FontAwesomeIcon icon={faTimes} size="lg" />
          </button>
        </div>

        <div className="flex-grow overflow-auto custom-scrollbar bg-white">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <FontAwesomeIcon icon={faSpinner} spin size="2x" className="mb-4 text-blue-500" />
              <p className="text-sm font-medium">Loading...</p>
            </div>
          ) : (
            <table className="min-w-full border-separate border-spacing-0">
              <thead className="sticky top-0 z-10 bg-slate-200">
                <tr>
                  {[
                    { label: "Cut Off Code", key: "cutoffCode" },
                    { label: "Description", key: "cutoffName" },
                  ].map((col) => (
                    <th key={col.key} className="global-lookup-th-ui">
                      <span className="global-lookup-th-text-ui">{col.label}</span>
                      <div className="relative">
                        <input
                          type="text"
                          value={filters[col.key]}
                          onChange={(e) => setFilters((prev) => ({ ...prev, [col.key]: e.target.value }))}
                          placeholder="Filter..."
                          className="global-lookup-filter-text-ui"
                        />
                        <FontAwesomeIcon icon={faSearch} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]" />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredCutoffs.length > 0 ? (
                  filteredCutoffs.map((cutoff, index) => (
                    <tr
                      key={cutoff.cutoffCode || index}
                      onClick={() => handleApply(cutoff)}
                      className="group hover:bg-blue-50 cursor-pointer transition-colors"
                    >
                      <td className="global-lookup-td-ui w-[180px] font-bold">{cutoff.cutoffCode}</td>
                      <td className="global-lookup-td-ui w-[300px]">{cutoff.cutoffName}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="2" className="px-4 py-20 text-center text-slate-400 italic text-sm">
                      No matching records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className="global-lookup-footer-records-div-ui">
          <span className="global-lookup-footer-records-text-ui">
            Total Records: {filteredCutoffs.length}
          </span>
        </div>
      </div>
    </div>
  );
};

const Company = () => {
  const queryClient = useQueryClient();
  const docType = "Company";
  const guideRef = useRef(null);

  const [formData, setFormData] = useState(INITIAL_FORM);
  const [modals, setModals] = useState({
    branch: false,
    cutoff: false,
    currency: false,
    disbBank: false,
    depBank: false,
    rc: false,
    email: false,
  });
  const [rcType, setRcType] = useState(null);
  const [isOpenGuide, setOpenGuide] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [tblFieldArray, setTblFieldArray] = useState([]);

  const { user } = useAuth();

  // --- TANSTACK QUERY: Fetch Data ---
  const { data: fetchedData, isLoading: isFetching } = useQuery({
    queryKey: ["companyData"],
    queryFn: async () => {
      const { data } = await apiClient.get("/getCompany", {
        params: { mode: "get" },
      });
      const rawResult = data?.data?.[0]?.result || data?.result;
      return rawResult ? JSON.parse(rawResult)[0] : null;
    },
  });

  // Update form when data changes
  useEffect(() => {
    if (fetchedData) {
      const formatRetrievedDate = (dateString) => {
        if (
          !dateString ||
          dateString.startsWith("1900-01-01") ||
          dateString.startsWith("0001-01-01")
        ) {
          return "";
        }
        return useformatToDatev2(dateString);
      };

      setFormData({
        compCode: fetchedData.compCode || "",
        compName: fetchedData.compName || "",
        classification: fetchedData.compClass || "",
        rdoCode: fetchedData.rdoCode || "",
        compEmail: fetchedData.compEmail || "",
        branchCode: fetchedData.branchCode || "",
        branchName: fetchedData.branchName || "",
        cutoffCode: fetchedData.cutoffCode || "",
        cutoffName: fetchedData.cutoffName || "",
        currencyCode: fetchedData.currCode || "",
        currencyName: fetchedData.currName || "",
        disbursementBankCode: fetchedData.disbBankcode || "",
        disbursementBankName: fetchedData.disbursementBankName || "",
        depositBankCode: fetchedData.depBankcode || "",
        depositBankName: fetchedData.depositBankName || "",
        staleCheckDueDays: fetchedData.staleCheckDueDays || "",
        globalRespCenter: fetchedData.globalRespCenter || "",
        globalRespCenterName: fetchedData.globalRespCenterName || "",
        salesRespCenter: fetchedData.salesRespCenter || "",
        salesRespCenterName: fetchedData.salesRespCenterName || "",
        birAcNo: fetchedData.birAcNo || "",
        birReleaseNo: fetchedData.birReleaseNo || "",
        // birAcDateIssued: (fetchedData.birAcDateIssued || "").split("T")[0],
        // birAcDateIssued: useformatToDatev2(fetchedData.birAcDateIssued),
        birAcDateIssued: formatRetrievedDate(fetchedData.birAcDateIssued),
        payor2307Name: fetchedData.payor2307Name || "",
        payor2307TIN: fetchedData.payor2307TIN || "",
        payor2307Position: fetchedData.payor2307Position || "",
      });
    }
  }, [fetchedData]);

  // load max length metadata once
  useEffect(() => {
    let mounted = true;

    (async () => {
      const companyres = await useFieldLenghtCheck("company");
      if (mounted) {
        setTblFieldArray(companyres || []);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const getMax = (col) => useGetFieldLength(tblFieldArray, col);

  // --- TANSTACK QUERY: Save Mutation ---
  const { mutate: saveCompany, isLoading: isSaving } = useMutation({
    mutationFn: async (payload) => {
      const response = await apiClient.post("/upsertCompany", payload);
      return response;
    },

    onSuccess: (response) => {
      console.log("API Response:", response);

      const sqlRow = response?.data?.data?.[0];
      console.log("Sql Response:", sqlRow);

      if (!sqlRow) {
        console.error("No Data found.");
        return;
      }

      if (Number(sqlRow.errorcount || 0) > 0) {
        const sqlerrormsg = sqlRow.errormsg;
        useSwalErrorAlert("Missing Required Field(s):", sqlerrormsg);
        return;
      }

      queryClient.invalidateQueries(["companyData"]);
      useSwalSuccessAlert("Success!", "Changes has been saved!");
      setIsEditing(false);
    },
    onError: (error) => {
      console.error("Mutation Error:", error);

      const status = error?.response?.status;
      const data = error?.response?.data;
      const msg = status
        ? // ? `Request failed (HTTP ${status}).\n${typeof data === "string" ? data : JSON.stringify(data)}`
          `Request failed (HTTP ${status})`
        : `No response from server.\n${error?.message || ""}`;

      useSwalErrorAlertAPI("System Error", msg);
    },
  });

  const handleSave = () => {
    if (!formData.compCode)
      return useSwalErrorAlert("Error", "Company Code is required.");

    const cleanData = {
      ...formData,
      birAcDateIssued:
        formData.birAcDateIssued === "" ? null : formData.birAcDateIssued,
      depBankcode: formData.depositBankCode,
      disbBankcode: formData.disbursementBankCode,
      staleCheckDueDays: Number(formData.staleCheckDueDays) || 0,
      userCode: user?.USER_CODE || "ADMIN",
    };

    const payload = {
      json_data: JSON.stringify({
        json_data: cleanData,
      }),
    };

    saveCompany(payload);
  };

  const updateForm = (updates) =>
    setFormData((prev) => ({ ...prev, ...updates }));
  const toggleModal = (name, isOpen) =>
    setModals((prev) => ({ ...prev, [name]: isOpen }));

  useEffect(() => {
    const handleKey = (e) => {
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    const handleClick = (e) => {
      if (guideRef.current && !guideRef.current.contains(e.target))
        setOpenGuide(false);
    };
    window.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handleClick);
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [formData]);

  return (
    <div className="global-ref-main-div-ui">
      {(isFetching || isSaving) && <LoadingSpinner />}

      {/* Lookup Modals Logic stays similar but triggers toggleModal */}
      <BranchLookupModal isOpen={modals.branch} onClose={(v) => { toggleModal("branch", false); if(v) updateForm({ branchCode: v.branchCode, branchName: v.branchName }) }} />
      <CompanyCutoffLookup isOpen={modals.cutoff} onClose={(v) => { toggleModal("cutoff", false); if(v) updateForm({ cutoffCode: v.cutoffCode, cutoffName: v.cutoffName }) }} />
      <SearchCurrRef isOpen={modals.currency} onClose={(v) => { toggleModal("currency", false); if(v) updateForm({ currencyCode: v.currCode, currencyName: v.currName }) }} />
      <SearchBankMast isOpen={modals.disbBank} onClose={(v) => { toggleModal("disbBank", false); if(v) updateForm({ disbursementBankCode: v.bankCode , disbursementBankName: v.bankAcctNo }) }} />
      <SearchBankMast isOpen={modals.depBank} onClose={(v) => { toggleModal("depBank", false); if(v) updateForm({ depositBankCode: v.bankCode , depositBankName: v.bankAcctNo }) }} />
      <SearchRCMast isOpen={modals.rc} onClose={(v) => { toggleModal("rc", false); if(v && rcType) updateForm({ [`${rcType}RespCenter`]: v.rcCode, [`${rcType}RespCenterName`]: v.rcName  });}} />

      {/* Header & ButtonBar */}
      <div className="global-ref-header-ui">
        <h1 className="global-ref-headertext-ui">{reftables[docType]}</h1>
        <div className="flex items-center gap-2">
          <ButtonBar
            buttons={[
              {
                key: "save",
                label: <span className="hidden lg:inline ml-2">Save</span>,
                icon: faSave,
                onClick: handleSave,
                disabled: isSaving,
                className:
                  "flex items-center justify-center h-8 w-8 sm:w-auto sm:h-8 sm:px-4 text-[10px] sm:text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-all",
              },
              {
                key: "reset",
                label: <span className="hidden lg:inline ml-2">Reset</span>,
                icon: faUndo,
                onClick: () => queryClient.resetQueries(["companyData"]),
                className:
                  "flex items-center justify-center h-8 w-8 sm:w-auto sm:h-8 sm:px-4 text-[10px] sm:text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-all",
              },
            ]}
          />

          {/* Info Dropdown */}
          <div ref={guideRef} className="relative">
            <button
              onClick={() => setOpenGuide((v) => !v)}
              className="bg-blue-600 text-white h-8 w-8 sm:w-auto sm:h-8 sm:px-4 rounded-md flex items-center justify-center gap-1 hover:bg-blue-700 transition-all"
            >
              <FontAwesomeIcon
                icon={faInfoCircle}
                className="text-[12px] sm:text-xs"
              />
              <span className="hidden lg:inline ml-1 text-xs font-medium">
                Info
              </span>
              <FontAwesomeIcon
                icon={faChevronDown}
                className="hidden sm:inline text-[10px] opacity-80"
              />
            </button>

            {/* Dropdown Menu */}
            {isOpenGuide && (
              <div className="absolute right-0 mt-2 w-48 rounded-md shadow-xl bg-white ring-1 ring-black/10 z-[60] dark:bg-gray-800 overflow-hidden">
                <button
                  onClick={() => {
                    window.open(pdfLink, "_blank");
                    setOpenGuide(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-xs hover:bg-blue-50 dark:hover:bg-blue-900 border-b border-gray-100 dark:border-gray-700"
                >
                  <FontAwesomeIcon
                    icon={faFilePdf}
                    className="mr-2 text-red-500"
                  />{" "}
                  PDF Guide
                </button>
                <button
                  onClick={() => {
                    window.open(videoLink, "_blank");
                    setOpenGuide(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-xs hover:bg-blue-50 dark:hover:bg-blue-900"
                >
                  <FontAwesomeIcon
                    icon={faVideo}
                    className="mr-2 text-blue-500"
                  />{" "}
                  Video Guide
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="global-ref-tab-div-ui mt-22">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <FieldRenderer
              label="Company Code"
              required
              type="text"
              value={formData.compCode}
              disabled={!isEditing}
              onChange={(v) => updateForm({ compCode: v })}
            />
            <FieldRenderer
              label="Company Name"
              required
              type="text"
              value={formData.compName}
              disabled={!isEditing}
              onChange={(v) => updateForm({ compName: v })}
            />
            <div className="grid grid-cols-2 gap-3">
              <FieldRenderer
                label="Classification"
                required
                type="select"
                value={formData.classification}
                onChange={(v) => updateForm({ classification: v })}
                options={[
                  { value: "VAT REG", label: "VAT REG" },
                  { value: "NON-VAT", label: "NON-VAT REG" },
                ]}
              />
              <FieldRenderer
                label="RDO Code"
                required
                type="text"
                value={formData.rdoCode}
                onChange={(v) => updateForm({ rdoCode: v })}
                maxLength={getMax("TCON_RDOCODE")}
              />
            </div>
            <FieldRenderer
              label="Company Email"
              required
              type="text"
              value={formData.compEmail}
              onChange={(v) => updateForm({ compEmail: v })}
              maxLength={getMax("COMP_EMAIL")}
            />
            <FieldRenderer
              label="Branch"
              type="lookup"
              value={formData.branchName || formData.branchCode}
              onLookup={() => toggleModal("branch", true)}
            />
            <FieldRenderer
              label="Cut-Off"
              required
              type="lookup"
              value={
                formData.cutoffCode
                  ? `(${formData.cutoffCode}) - ${formData.cutoffName}`
                  : ""
              }
              onLookup={() => toggleModal("cutoff", true)}
            />
          </div>

          <div className="space-y-6">
            <FieldRenderer
              label="Currency"
              required
              labelWidth="w-56"
              type="lookup"
              value={
                formData.currencyCode
                  ? `(${formData.currencyCode}) - ${formData.currencyName}`
                  : ""
              }
              onLookup={() => toggleModal("currency", true)}
            />
            <FieldRenderer
              label="Disbursement Bank"
              required
              labelWidth="w-56"
              type="lookup"
              value={
                formData.disbursementBankCode
                  ? `(${formData.disbursementBankCode}) - ${formData.disbursementBankName}`
                  : ""
              }
              onLookup={() => toggleModal("disbBank", true)}
            />
            <FieldRenderer
              label="Deposit Bank"
              labelWidth="w-56"
              type="lookup"
              value={
                formData.depositBankCode
                  ? `(${formData.depositBankCode}) - ${formData.depositBankName}`
                  : ""
              }
              onLookup={() => toggleModal("depBank", true)}
            />
            <FieldRenderer
              label="Stale Check Days"
              labelWidth="w-56"
              type="number"
              placeholder="0.00"
              step="0.01"
              value={formData.staleCheckDueDays}
              onChange={(v) => updateForm({ staleCheckDueDays: v })}
              onBlur={(e) => {
                const val = parseFloat(e.target.value || 0);
                const sanitized = Math.max(0, val).toFixed(2);
                updateForm({ staleCheckDueDays: sanitized });
              }}
            />
            <FieldRenderer
              label="Global RC"
              labelWidth="w-56"
              type="lookup"
              value={
                formData.globalRespCenter
                  ? `(${formData.globalRespCenter}) - ${formData.globalRespCenterName}`
                  : ""
              }
              onLookup={() => {
                setRcType("global");
                toggleModal("rc", true);
              }}
            />
            <FieldRenderer
              label="Sales RC"
              labelWidth="w-56"
              type="lookup"
              value={
                formData.salesRespCenter
                  ? `(${formData.salesRespCenter}) - ${formData.salesRespCenterName}`
                  : ""
              }
              onLookup={() => {
                setRcType("sales");
                toggleModal("rc", true);
              }}
            />
          </div>
        </div>
      </div>

      <div className="global-ref-tab-div-ui mt-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <FieldRenderer
            label="BIR AC No."
            labelWidth="w-56"
            type="text"
            classname="global-ref-textbox-ui"
            value={formData.birAcNo}
            onChange={(v) => updateForm({ birAcNo: v })}
            maxLength={getMax("BIR_ACNO")}
          />
          <FieldRenderer
            label="BIR Release No."
            labelWidth="w-56"
            type="text"
            classname="global-ref-textbox-ui"
            value={formData.birReleaseNo}
            onChange={(v) => updateForm({ birReleaseNo: v })}
            maxLength={getMax("BIR_RELEASENO")}
          />
          {/* <FieldRenderer label="Date Issued" labelWidth="w-56" type="date" classname="global-ref-textbox-ui" value={formData.birAcDateIssued} onChange={(v) => updateForm({ birAcDateIssued: v })} /> */}

          <div className="relative w-full">
            <div
              className={`flex items-stretch global-ref-textbox-ui global-ref-textbox-enabled`}
            >
              <DateFormatInput
                id="birAcDateIssued"
                className="peer flex-grow bg-transparent border-none px-3 focus:outline-none cursor-pointer"
                value={formData.birAcDateIssued || ""}
                updateState={updateForm}
              />
            </div>
            <label
              htmlFor="birAcDateIssued"
              className="global-ref-floating-label global-ref-label-enabled"
            >
              Date Issued
            </label>
          </div>
        </div>
      </div>

      <div className="global-ref-tab-div-ui mt-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <FieldRenderer
            label="2307 Payor Name"
            labelWidth="w-56"
            type="text"
            value={formData.payor2307Name}
            onChange={(v) => updateForm({ payor2307Name: v })}
            maxLength={getMax("PAYOR_2307_NAME")}
          />
          <FieldRenderer
            label="2307 Payor TIN"
            labelWidth="w-56"
            type="text"
            value={formData.payor2307TIN}
            onChange={(v) => updateForm({ payor2307TIN: v })}
            maxLength={getMax("PAYOR_2307_TIN")}
          />
          <FieldRenderer
            label="2307 Payor Position"
            labelWidth="w-56"
            type="text"
            value={formData.payor2307Position}
            onChange={(v) => updateForm({ payor2307Position: v })}
            maxLength={getMax("PAYOR_2307_POSITION")}
          />
        </div>
      </div>
    </div>
  );
};

export default Company;
