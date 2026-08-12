import React, {
  useMemo,
  useState,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMagnifyingGlass,
  faRotateLeft,
  faList,
  faRoute,
} from "@fortawesome/free-solid-svg-icons";

import { fetchData } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import SearchGlobalReportTable from "@/NAYSA Cloud/Lookup/SearchGlobalReportTable.jsx";
import BranchLookupModal from "@/NAYSA Cloud/Lookup/SearchBranchRef";
import RCLookupModal from "@/NAYSA Cloud/Lookup/SearchRCMast.jsx";
import PayeeMastLookupModal from "@/NAYSA Cloud/Lookup/SearchVendMast";

import JOInq from "./JOInq";

const ENDPOINT = "getJOInquiry";

const TABS = [
  { key: "inquiry", label: "JO Inquiry", icon: faList },
  { key: "tracker", label: "JO Tracker", icon: faRoute },
];

const safeArray = (value) => (Array.isArray(value) ? value : []);

const joinCodeName = (code, name) => {
  const cleanCode = String(code || "").trim();
  const cleanName = String(name || "").trim();
  if (!cleanCode) return cleanName;
  if (!cleanName || cleanName === cleanCode) return cleanCode;
  return `${cleanCode} - ${cleanName}`;
};

const getToday = () => new Date().toISOString().split("T")[0];
const getThreeMonthsAgo = () => {
  const date = new Date();
  date.setMonth(date.getMonth() - 3);
  return date.toISOString().split("T")[0];
};

const dateToCutoff = (dateText) =>
  dateText ? String(dateText).slice(0, 7).replace("-", "") : "";

const formatDateDisplay = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
      });
};

// ── Column Configuration ───────────────────────────────────────────────────────
const defaultJOColumns = [
  { key: "joNo",         label: "JO Number",      visible: true, type: "text"   },
  { key: "joDate",       label: "JO Date",         visible: true, type: "date"   },
  { key: "branch",       label: "Branch",          visible: true, type: "text"   },
  { key: "payeeCode",    label: "Payee Code",      visible: true, type: "text"   },
  { key: "payeeName",    label: "Payee Name",      visible: true, type: "text"   },
  { key: "prNo",         label: "Ref PR",          visible: true, type: "text"   },
  { key: "joAmount",     label: "JO Amount",       visible: true, type: "number" },
  { key: "apAmount",     label: "AP Amount",       visible: true, type: "number" },
  { key: "status",       label: "Status",          visible: true, type: "text"   },
  { key: "apvNo",        label: "APV No",          visible: true, type: "text"   },
  { key: "cvNo",         label: "CV No",           visible: true, type: "text"   },
];

const normalizeJODetailRows = (rows = []) => {
  return safeArray(rows).map((item, index) => ({
    ...item,
    id: `${item.branchCode}-${item.joNo}-${index}`,
    joDate: formatDateDisplay(item.joDate),
    branch: item.branchCode || "",
    payeeCode: item.payeeCode || item.vend_code || "",
    payeeName: item.payeeName || item.vend_name || "",
    prNo: item.prNo || item.pr_no || "",
    status: item.joStatusDesc || (item.joCancelled === "Y" ? "Cancelled" : item.joStatus === "C" ? "Closed" : "Open"),
    joAmount: Number(item.joAmount || item.jo_amount || 0),
    apAmount: Number(item.apAmount || item.ap_amount || 0),
    apvNo: item.apvNo || item.apv_no || "",
    cvNo: item.cvNo || item.cv_no || "",
  }));
};

export default function JOInquiry() {
  const navigate = useNavigate();
  const { currentUserRow } = useAuth();

  const [activeTab, setActiveTab] = useState("inquiry");
  const [showLookup, setShowLookup] = useState(null);

  const [state, setState] = useState(() => ({
    branchCode: currentUserRow?.branchCode || "",
    branchName: currentUserRow?.branchName || "Head Office",
    statusFilter: "All",
    payeeCode: "",
    payeeName: "",
    rcCode: "",
    rcName: "",
    fromDate: getThreeMonthsAgo(),
    toDate: getToday(),
    joInquiryData: [],
    isLoading: false,
  }));

  const updateState = (u) => setState((p) => ({ ...p, ...u }));

  const fetchRecord = useCallback(async () => {
    updateState({ isLoading: true });
    try {
      // Maps to Sproc codes: O=Open, C=Closed, X=Cancelled
      const statusMap = { All: "", Open: "O", Closed: "C", Cancelled: "X" };

      const response = await fetchData(ENDPOINT, {
        json_data: {
          branchCode: state.branchCode,
          payeeCode: state.payeeCode,
          prNo: "",
          jobCode: "",
          joStatus: statusMap[state.statusFilter] || "",
          startingCutoff: dateToCutoff(state.fromDate),
          endingCutoff: dateToCutoff(state.toDate),
          rcCode: state.rcCode,
        },
      });

      const raw = response?.data?.[0]?.result;
      const parsed = raw ? JSON.parse(raw) : [];
      const rows = Array.isArray(parsed?.[0]?.dt1) ? parsed[0].dt1 : [];
      updateState({ joInquiryData: normalizeJODetailRows(rows) });
    } catch (err) {
      console.error("Fetch failed", err);
    } finally {
      updateState({ isLoading: false });
    }
  }, [state]);

  const handleReset = () => {
    updateState({
      payeeCode: "",
      payeeName: "",
      rcCode: "",
      rcName: "",
      statusFilter: "All",
      fromDate: getThreeMonthsAgo(),
      toDate: getToday(),
      joInquiryData: [],
    });
  };

  const handleViewDocument = (row) => {
    navigate(
      `/page/JO?joNo=${encodeURIComponent(row.joNo)}&branchCode=${encodeURIComponent(row.branchCode || row.branch)}&viewOnly=Y`
    );
  };

  return (
    <div className="global-ref-main-div-ui">
      {state.isLoading && <LoadingSpinner />}

      {/* ── Header ── */}
      <div className="global-ref-header-ui">
        <div className="w-full flex flex-col gap-3 md:grid md:grid-cols-3 md:items-center">
          <h1 className="global-ref-headertext-ui truncate">
            {TABS.find((t) => t.key === activeTab)?.label}
          </h1>

          {/* Tabs */}
          <div className="flex justify-center">
            <div className="flex border-b border-gray-200">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2 text-xs font-bold transition-all border-b-2 ${
                    activeTab === tab.key
                      ? "border-blue-600 text-blue-600 bg-blue-50/50"
                      : "border-transparent text-gray-500"
                  }`}
                >
                  <FontAwesomeIcon icon={tab.icon} className="mr-2" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            {activeTab === "inquiry" && (
              <>
                <button
                  onClick={fetchRecord}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md text-xs font-medium"
                >
                  <FontAwesomeIcon icon={faMagnifyingGlass} className="mr-2" /> Find
                </button>
                <button
                  onClick={handleReset}
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-xs font-medium border"
                >
                  <FontAwesomeIcon icon={faRotateLeft} className="mr-2" /> Reset
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="mt-44 sm:mt-24 px-0">
        {activeTab === "inquiry" ? (
          <>
            {/* Filter Panel */}
            <div className="global-tran-tab-div-ui">
              <div className="bg-white rounded-2xl shadow-sm border p-4 flex flex-col gap-4">

                {/* ROW 1: Branch, Payee, Status, From Date */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                  <div className="md:col-span-3">
                    <FieldRenderer
                      type="lookup"
                      label="Branch"
                      value={state.branchName}
                      onLookup={() => setShowLookup("branch")}
                    />
                  </div>
                  <div className="md:col-span-4">
                    <FieldRenderer
                      type="lookup"
                      label="Payee"
                      value={joinCodeName(state.payeeCode, state.payeeName)}
                      onLookup={() => setShowLookup("payee")}
                    />
                  </div>
                  <div className="md:col-span-2 relative">
                    <select
                      value={state.statusFilter}
                      onChange={(e) => updateState({ statusFilter: e.target.value })}
                      className="peer global-tran-textbox-ui"
                    >
                      <option value="All">All Status</option>
                      <option value="Open">Open</option>
                      <option value="Closed">Closed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                    <label className="global-tran-floating-label">Status</label>
                  </div>
                  <div className="md:col-span-3">
                    <FieldRenderer
                      type="date"
                      label="From"
                      value={state.fromDate}
                      onChange={(e) => updateState({ fromDate: e.target.value })}
                    />
                  </div>
                </div>

                {/* ROW 2: Department, To Date */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                  <div className="md:col-span-9">
                    <FieldRenderer
                      type="lookup"
                      label="Department"
                      value={joinCodeName(state.rcCode, state.rcName)}
                      onLookup={() => setShowLookup("rc")}
                    />
                  </div>
                  <div className="md:col-span-3">
                    <FieldRenderer
                      type="date"
                      label="To"
                      value={state.toDate}
                      onChange={(e) => updateState({ toDate: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Results Table */}
            <div className="global-tran-tab-div-ui mt-4">
              <div className="global-tran-table-main-div-ui overflow-x-auto">
                <SearchGlobalReportTable
                  columns={defaultJOColumns}
                  data={state.joInquiryData}
                  onRowAction={handleViewDocument}
                  rightActionLabel="View"
                />
              </div>
            </div>
          </>
        ) : (
          <JOInq />
        )}
      </div>

      {/* ── Lookup Modals ── */}
      {showLookup === "branch" && (
        <BranchLookupModal
          isOpen
          onClose={(b) => {
            if (b) updateState({ branchCode: b.branchCode, branchName: b.branchName });
            setShowLookup(null);
          }}
        />
      )}
      {showLookup === "rc" && (
        <RCLookupModal
          isOpen
          onClose={(r) => {
            if (r) updateState({ rcCode: r.rcCode, rcName: r.rcName });
            setShowLookup(null);
          }}
        />
      )}
      {showLookup === "payee" && (
        <PayeeMastLookupModal
          isOpen
          onClose={(v) => {
            if (v) updateState({ payeeCode: v.vendCode || "", payeeName: v.vendName || "" });
            setShowLookup(null);
          }}
        />
      )}
    </div>
  );
}