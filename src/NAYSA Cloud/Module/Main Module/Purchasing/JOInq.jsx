import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Filter,
  FileText,
  Briefcase,
  Receipt,
  Wallet,
  Clock3,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  ChevronRight,
  X,
  LayoutList,
  Download,
  CalendarDays,
  Building2,
  Eye,
  Sparkles,
  BarChart3,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";
import { fetchData } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import PayeeMastLookupModal from "../../../Lookup/SearchVendMast";
import RCLookupModal from "../../../Lookup/SearchRCMast.jsx";

// ── Static stage field labels ─────────────────────────────────────────────────
const stageDetails = {
  jo: {
    fields: [
      { label: "JO Number", key: "joNo" },
      { label: "JO Date", key: "joDate" },
      { label: "Prepared By", key: "preparedBy" },
      { label: "Responsibility Center", key: "departmentDisplay" },
      { label: "Remarks", key: "remarks" },
    ],
  },
  apv: {
    fields: [
      { label: "JO Number", key: "joNo" },
      { label: "APV Number", key: "apvNo" },
      { label: "JO Amount", key: "joAmountDisplay" },
      { label: "AP Amount", key: "apAmountDisplay" },
    ],
  },
  cv: {
    fields: [
      { label: "APV Number", key: "apvNo" },
      { label: "CV Number", key: "cvNo" },
    ],
  },
};

const stageColor = {
  done: {
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
    header: "bg-emerald-50 border-emerald-200",
    dot: "bg-emerald-500",
  },
  active: {
    badge: "bg-amber-100 text-amber-700 border-amber-200",
    header: "bg-amber-50 border-amber-200",
    dot: "bg-amber-500",
  },
  todo: {
    badge: "bg-slate-100 text-slate-500 border-slate-200",
    header: "bg-slate-50 border-slate-200",
    dot: "bg-slate-300",
  },
};

const stageStatusLabel = {
  done: "Completed",
  active: "In Progress",
  todo: "Pending",
};

const safeArray = (value) => (Array.isArray(value) ? value : []);

const joinCodeName = (code, name) => [code, name].filter(Boolean).join(" - ");

const formatDateDisplay = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
};

const formatAmount = (value) => {
  const num = Number(value || 0);
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(num);
};

const formatNumber = (value, decimals = 2) => {
  const num = Number(value || 0);
  return new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
};

const splitDocs = (value) =>
  String(value || "")
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);

const uniqueBy = (arr, keyFn) => {
  const seen = new Set();
  return arr.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

// ── Normalize raw API response ────────────────────────────────────────────────
const normalizeJOInquiryRows = (response) => {
  const payload = response?.data;

  const candidates = [
    payload?.data,
    payload,
    response?.data?.data?.[0]?.result,
    response?.data?.[0]?.result,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;

    if (Array.isArray(candidate)) {
      if (Array.isArray(candidate?.[0]?.dt1)) return candidate[0].dt1;
      if (candidate?.[0]?.result) {
        try {
          const parsed = JSON.parse(candidate[0].result);
          return safeArray(parsed?.[0]?.dt1);
        } catch (error) {
          console.error("Failed to parse JO inquiry result row:", error);
        }
      }
      return candidate;
    }

    if (typeof candidate === "string") {
      try {
        const parsed = JSON.parse(candidate);
        if (Array.isArray(parsed?.[0]?.dt1)) return parsed[0].dt1;
        if (Array.isArray(parsed)) return parsed;
      } catch (error) {
        console.error("Failed to parse JO inquiry result string:", error);
      }
    }

    if (Array.isArray(candidate?.dt1)) return candidate.dt1;
  }

  return [];
};

// ── Flow state for JO (3-stage: JO → APV → CV) ───────────────────────────────
const getFlowState = (row) => {
  const hasAPV = !!row.apvNo;
  const hasCV = !!row.cvNo;

  return {
    jo: "done",
    apv: hasAPV ? "done" : "active",
    cv: hasCV ? "done" : hasAPV ? "active" : "todo",
  };
};

const getCurrentStatus = (flow) => {
  if (flow.cv === "done") return "Completed";
  if (flow.cv === "active") return "For CV";
  if (flow.apv === "active") return "For APV";
  return "Open JO";
};

const getProgress = (flow) => {
  const steps = ["jo", "apv", "cv"];
  const doneCount = steps.filter((key) => flow[key] === "done").length;
  return Math.round((doneCount / steps.length) * 100);
};

// ── Aggregate rows grouped by JO ──────────────────────────────────────────────
const aggregateJOInqRows = (rows) => {
  const groups = new Map();

  rows.forEach((item) => {
    const joNo = item.joNo || item.jo_no || "";
    const joId = item.joId || item.jo_id || "";
    const joDate = item.joDate || item.jo_date || "";
    const joStatus = item.joStatus || item.jo_status || "";
    const joStatusDesc = item.joStatusDesc || joStatus || "";
    const branchCode = item.branchCode || item.branch_code || "";
    const branchName = item.branchName || item.branch_name || "";
    const rcCode = item.rcCode || item.rc_code || "";
    const rcName = item.rcName || item.rc_name || "";
    const payeeCode = item.payeeCode || item.vend_code || "";
    const payeeName = item.payeeName || item.vend_name || "";
    const preparedBy = item.preparedBy || item.user_code || "";
    const preparedDate = item.preparedDate || item.date_stamp || "";
    const remarks = item.remarks || "";
    const prNo = item.prNo || item.pr_no || "";
    const joAmount = Number(item.joAmount || item.jo_amount || 0);
    const apAmount = Number(item.apAmount || item.ap_amount || 0);
    const advAmount = Number(item.advAmount || item.adv_amount || 0);
    const currCode = item.currCode || item.curr_code || "PHP";

    // Line detail fields
    const lineNo = item.lNo || item.line_no || "";
    const jobCode = item.jobCode || item.job_code || "";
    const scopeOfWork = item.scopeOfWork || item.scope_of_work || "";
    const specification = item.specification || "";
    const uomCode = item.uomCode || item.uom_code || "";
    const quantity = Number(item.quantity || 0);
    const unitPrice = Number(item.unitPrice || item.unit_price || 0);
    const lineAmount = Number(item.lineAmount || item.jo_amount || 0);
    const deliveryDate = item.deliveryDate || item.del_date || "";

    const apvNos = splitDocs(item.apvNo || item.apv_no);
    const cvNos = splitDocs(item.cvNo || item.cv_no);

    const groupKey = joId || `${branchCode}-${joNo}`;

    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        header: {
          joNo, joId, joDate, joStatus, joStatusDesc,
          branchCode, branchName, rcCode, rcName,
          payeeCode, payeeName,
          preparedBy, preparedDate, remarks,
          prNo, joAmount, apAmount, advAmount, currCode,
        },
        detailLines: [],
        apvNos: [],
        cvNos: [],
        totalJOAmount: 0,
        totalAPAmount: 0,
      });
    }

    const group = groups.get(groupKey);

    group.detailLines.push({
      lineNo, jobCode, scopeOfWork, specification,
      uomCode, quantity, unitPrice, lineAmount, deliveryDate,
    });

    group.apvNos.push(...apvNos);
    group.cvNos.push(...cvNos);
    group.totalJOAmount += joAmount;
    group.totalAPAmount += apAmount;
  });

  return Array.from(groups.values()).map((group) => {
    const {
      joNo, joId, joDate, joStatus, joStatusDesc,
      branchCode, branchName, rcCode, rcName,
      payeeCode, payeeName,
      preparedBy, preparedDate, remarks,
      prNo, joAmount, apAmount, advAmount, currCode,
    } = group.header;

    const apvNos = [...new Set(group.apvNos)];
    const cvNos = [...new Set(group.cvNos)];

    const uniqueDetailLines = uniqueBy(group.detailLines, (line) =>
      [line.jobCode || "", line.lineNo || "", Number(line.quantity || 0)].join("|"),
    );

    const lineDetails = uniqueDetailLines.map((line) => ({
      "Job Code": line.jobCode || "—",
      "Scope of Work": line.scopeOfWork || "—",
      UOM: line.uomCode || "—",
      Quantity: formatNumber(line.quantity, 4),
      "Unit Price": formatNumber(line.unitPrice, 4),
      Amount: formatNumber(line.lineAmount, 2),
      "Delivery Date": formatDateDisplay(line.deliveryDate),
    }));

    const joDocs = [
      {
        "JO Number": joNo,
        "JO Date": formatDateDisplay(joDate),
        Status: joStatusDesc || joStatus || "Open",
        "Ref PR": prNo || "—",
        Department: joinCodeName(rcCode, rcName) || rcCode,
        Payee: joinCodeName(payeeCode, payeeName) || "—",
        "Prepared By": preparedBy || "—",
        "Prepared Date": formatDateDisplay(preparedDate),
        "JO Amount": formatAmount(joAmount),
        Details: lineDetails,
      },
    ];

    const apvDocs = apvNos.map((apv) => ({
      "APV Number": apv,
      "Ref JO": joNo,
      "AP Amount": formatAmount(apAmount),
    }));

    const cvDocs = cvNos.map((cv) => ({
      "CV Number": cv,
      "Ref APV": apvNos[0] || "",
    }));

    const flow = getFlowState({
      apvNo: apvNos.join("\n"),
      cvNo: cvNos.join("\n"),
    });

    const currentStatus = getCurrentStatus(flow);
    const progress = getProgress(flow);

    return {
      id: joId || `${branchCode}-${joNo}`,
      joNo,
      joId,
      joDate: formatDateDisplay(joDate),
      joStatus,
      joStatusDesc,
      apvNo: apvNos.join("\n"),
      cvNo: cvNos.join("\n"),
      branch: branchCode,
      branchName,
      branchDisplay: joinCodeName(branchCode, branchName) || branchCode,
      department: rcCode,
      departmentName: rcName,
      departmentDisplay: joinCodeName(rcCode, rcName) || rcCode,
      payeeCode,
      payeeName,
      payeeDisplay: joinCodeName(payeeCode, payeeName) || "—",
      preparedBy,
      preparedDate: formatDateDisplay(preparedDate),
      remarks,
      prNo,
      joAmount,
      apAmount,
      advAmount,
      currCode,
      joAmountDisplay: formatAmount(joAmount),
      apAmountDisplay: formatAmount(apAmount),
      lineDetails: uniqueDetailLines,
      flow,
      currentStatus,
      progress,
      counts: {
        jo: 1,
        apv: apvNos.length,
        cv: cvNos.length,
      },
      stageDocs: {
        jo: joDocs,
        apv: apvDocs,
        cv: cvDocs,
      },
    };
  });
};

// ── DrilldownModal ─────────────────────────────────────────────────────────────
function DrilldownModal({ row, stageKey, stageList, onClose, onStage, onViewDocument }) {
  const stage = stageList.find((s) => s.key === stageKey);
  const stateKey = row.flow[stageKey];
  const sc = stageColor[stateKey];
  const Icon = stage.icon;
  const detail = stageDetails[stageKey];
  const extraDocs = row.stageDocs?.[stageKey] || [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      style={{ background: "rgba(15,23,42,0.6)" }}
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`shrink-0 border-b px-6 pb-5 pt-6 ${sc.header}`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-2xl border ${sc.badge}`}>
                <Icon size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-slate-900">{stage.label}</span>
                  <span className="text-slate-300">—</span>
                  <span className="text-sm text-slate-500">{stage.name}</span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${sc.badge}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
                    {stageStatusLabel[stateKey]}
                  </span>
                  <span className="font-mono text-[11px] text-slate-400">{row.joNo}</span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto bg-slate-50/50 px-6 py-5">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Transaction Info
            </p>
            <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white shadow-sm">
              {detail.fields.map((f) => (
                <div key={f.key} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-xs text-slate-500">{f.label}</span>
                  <span className="text-xs font-semibold text-slate-800">{row[f.key] || "—"}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {stage.name}
              </p>
              {extraDocs.length > 1 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-600">
                  <LayoutList size={10} /> {extraDocs.length} Records found
                </span>
              )}
            </div>

            {extraDocs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                <p className="text-xs text-slate-400">No documents generated yet for this stage.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {extraDocs.map((doc, idx) => (
                  <div key={idx} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    {extraDocs.length > 1 && (
                      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Document {idx + 1}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          {doc["JO Number"] || doc["APV Number"] || doc["CV Number"] || "—"}
                        </span>
                      </div>
                    )}

                    <div className="divide-y divide-slate-100">
                      {Object.entries(doc).map(([label, value]) => {
                        if (label === "Details") return null;

                        const isDocNumberRow =
                          label === "JO Number" ||
                          label === "APV Number" ||
                          label === "CV Number";

                        return (
                          <div key={label} className="flex items-center justify-between px-4 py-2.5">
                            <span className="text-xs text-slate-500">{label}</span>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs ${value === "—" || value === "Pending" ? "text-slate-400" : "font-semibold text-slate-800"}`}>
                                {value || "—"}
                              </span>
                              {isDocNumberRow && value && value !== "—" && value !== "Pending" && (
                                <button
                                  type="button"
                                  title="View Document"
                                  onClick={() => onViewDocument?.(row, stageKey, value)}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600"
                                >
                                  <Eye size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {Array.isArray(doc.Details) && doc.Details.length > 0 && (
                      <div className="border-t border-slate-100 bg-slate-50/60 p-3">
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          JO Line Details
                        </p>
                        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                          <table className="min-w-full text-[11px]">
                            <thead className="bg-slate-50 text-slate-400">
                              <tr>
                                {Object.keys(doc.Details[0] || {}).map((col) => (
                                  <th key={col} className="whitespace-nowrap px-3 py-2 text-left font-semibold">
                                    {col}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {doc.Details.map((line, lineIdx) => (
                                <tr key={lineIdx}>
                                  {Object.keys(doc.Details[0] || {}).map((col) => (
                                    <td key={col} className="whitespace-nowrap px-3 py-2 text-slate-700">
                                      {line[col] || "—"}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 border-t border-slate-200 bg-white px-6 py-4">
          <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Jump to stage
          </p>
          <div className="flex flex-wrap gap-2">
            {stageList.map((s) => {
              const isActive = s.key === stageKey;
              const sState = row.flow[s.key];
              const sc2 = stageColor[sState];
              const SIcon = s.icon;
              return (
                <button
                  key={s.key}
                  onClick={() => onStage(s.key)}
                  className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[11px] font-semibold transition-all ${
                    isActive
                      ? "bg-blue-600 text-white shadow-sm border-blue-400"
                      : `${sc2.badge} cursor-pointer hover:opacity-75`
                  }`}
                >
                  <SIcon size={11} />
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function JOInq() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [branchFilter, setBranchFilter] = useState("All");

  const getToday = () => new Date().toISOString().split("T")[0];
  const getThreeMonthsAgo = () => {
    const date = new Date();
    date.setMonth(date.getMonth() - 3);
    return date.toISOString().split("T")[0];
  };

  const [fromDate, setFromDate] = useState(getThreeMonthsAgo());
  const [toDate, setToDate] = useState(getToday());
  const [drilldown, setDrilldown] = useState(null);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [allBranchOptions, setAllBranchOptions] = useState([{ code: "All", display: "All" }]);
  const [selectedDepartment, setSelectedDepartment] = useState({ code: "", name: "" });
  const [selectedPayee, setSelectedPayee] = useState({ code: "", name: "" });
  const [lookupOpen, setLookupOpen] = useState(null);

  const navigate = useNavigate();

  const stageList = [
    { key: "jo", label: "JO", name: "Job Order", icon: Briefcase },
    { key: "apv", label: "APV", name: "Accounts Payable Voucher", icon: Receipt },
    { key: "cv", label: "CV", name: "Check Voucher", icon: Wallet },
  ];

  const handleViewDocument = (row, stageKey, selectedDocNo = "") => {
    const branchCode = row?.branch || row?.branchCode || "";

    const routeMap = {
      jo: { path: "/page/JO", param: "joNo", value: row.joNo },
      apv: { path: "/page/APV", param: "apvNo", value: row.apvNo },
      cv: { path: "/page/CV", param: "cvNo", value: row.cvNo },
    };

    const config = routeMap[stageKey];
    const docNo = String(selectedDocNo || config?.value || "").split("\n")[0].trim();

    if (!config || !docNo || !branchCode) {
      console.warn(`Missing data for navigation: ${stageKey}`, { stageKey, docNo, branchCode, row });
      return;
    }

    navigate(
      `${config.path}?${config.param}=${encodeURIComponent(docNo)}&branchCode=${encodeURIComponent(branchCode)}&viewDocument=true&viewOnly=Y&source=flowProgress`
    );
  };

  const fetchJOInquiry = async (selectedBranch = branchFilter) => {
    setLoading(true);
    try {
      const response = await fetchData("getJOInquiry", {
        json_data: {
          branchCode: selectedBranch === "All" ? "" : selectedBranch,
          payeeCode: selectedPayee.code,
          prNo: "",
          jobCode: "",
          joStatus: "",
          startingCutoff: fromDate ? fromDate.slice(0, 7).replace("-", "") : "",
          endingCutoff: toDate ? toDate.slice(0, 7).replace("-", "") : "",
          rcCode: selectedDepartment.code,
        },
      });

      const parsedRows = normalizeJOInquiryRows(response);
      console.log("JO Inquiry raw response:", response?.data);
      console.log("JO Inquiry parsed rows:", parsedRows);

      const aggregated = aggregateJOInqRows(parsedRows);
      setData(aggregated);

      if (selectedBranch === "All") {
        const seen = new Set();
        const branchOpts = [{ code: "All", display: "All" }];
        aggregated.forEach((row) => {
          if (row.branch && !seen.has(row.branch)) {
            seen.add(row.branch);
            branchOpts.push({ code: row.branch, display: row.branchDisplay || row.branch });
          }
        });
        setAllBranchOptions(branchOpts);
      }
    } catch (error) {
      console.error("Error fetching JO inquiry:", error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJOInquiry();
  }, [branchFilter, fromDate, selectedDepartment.code, selectedPayee.code, toDate]);

  const handleCloseDepartmentLookup = (selected) => {
    if (selected) setSelectedDepartment({ code: selected.rcCode || "", name: selected.rcName || "" });
    setLookupOpen(null);
  };

  const handleClosePayeeLookup = (selected) => {
    if (selected) setSelectedPayee({ code: selected.vendCode || "", name: selected.vendName || "" });
    setLookupOpen(null);
  };

  const summary = useMemo(() => {
    const total = data.length;
    const forAPV = data.filter((row) => row.currentStatus === "For APV").length;
    const forCV = data.filter((row) => row.currentStatus === "For CV").length;
    const completedCV = data.filter((row) => row.currentStatus === "Completed").length;

    return [
      {
        title: "Total JO",
        value: `${total}`,
        sub: "Loaded from JO inquiry",
        icon: Briefcase,
        color: "text-blue-600",
        bg: "bg-blue-50",
        border: "border-blue-100",
        trend: "Live data",
        trendUp: true,
      },
      {
        title: "For APV",
        value: `${forAPV}`,
        sub: "Needs accounting action",
        icon: Receipt,
        color: "text-amber-600",
        bg: "bg-amber-50",
        border: "border-amber-100",
        trend: "Monitor closely",
        trendUp: false,
      },
      {
        title: "For CV",
        value: `${forCV}`,
        sub: "Awaiting check release",
        icon: Wallet,
        color: "text-violet-600",
        bg: "bg-violet-50",
        border: "border-violet-100",
        trend: "Live data",
        trendUp: true,
      },
      {
        title: "Completed",
        value: `${completedCV}`,
        sub: "Released and posted",
        icon: CheckCircle2,
        color: "text-emerald-600",
        bg: "bg-emerald-50",
        border: "border-emerald-100",
        trend: "Live data",
        trendUp: true,
      },
    ];
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter((row) => {
      const matchesSearch = [
        row.joNo,
        row.payeeCode,
        row.payeeName,
        row.payeeDisplay,
        row.branch,
        row.branchName,
        row.branchDisplay,
        row.department,
        row.departmentName,
        row.departmentDisplay,
        row.preparedBy,
        row.currentStatus,
        row.prNo,
      ]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesStatus = statusFilter === "All" || row.currentStatus === statusFilter;
      const matchesBranch = branchFilter === "All" || row.branch === branchFilter;

      return matchesSearch && matchesStatus && matchesBranch;
    });
  }, [data, search, statusFilter, branchFilter]);

  const exportToCSV = () => {
    const headers = [
      "JO No", "JO Date", "Branch", "Department",
      "Payee Code", "Payee Name", "Ref PR",
      "JO Amount", "AP Amount",
      "Status", "APV No", "CV No", "Remarks",
    ];

    const escapeCell = (value) => {
      const cell = `${value ?? ""}`.replace(/"/g, '""');
      return `"${cell}"`;
    };

    const rows = filteredData.map((row) => [
      row.joNo, row.joDate, row.branchDisplay || row.branch,
      row.departmentDisplay || row.department,
      row.payeeCode, row.payeeName, row.prNo,
      row.joAmountDisplay, row.apAmountDisplay,
      row.currentStatus, row.apvNo, row.cvNo, row.remarks,
    ]);

    const csvContent = [headers, ...rows]
      .map((line) => line.map(escapeCell).join(","))
      .join("\n");

    const blob = new Blob([`\uFEFF${csvContent}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `jo-inquiry-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const statusConfig = {
    Completed: {
      cls: "bg-emerald-100 text-emerald-700 border border-emerald-200",
      dot: "bg-emerald-500",
    },
    "For APV": {
      cls: "bg-amber-100 text-amber-700 border border-amber-200",
      dot: "bg-amber-500",
    },
    "For CV": {
      cls: "bg-indigo-100 text-indigo-700 border border-indigo-200",
      dot: "bg-indigo-500",
    },
    "Open JO": {
      cls: "bg-slate-100 text-slate-600 border border-slate-200",
      dot: "bg-slate-400",
    },
  };

  const stageStepStyle = {
    done: { ring: "border-emerald-400 bg-emerald-500", text: "text-white" },
    active: { ring: "border-amber-400 bg-amber-500", text: "text-white" },
    todo: { ring: "border-slate-200 bg-white", text: "text-slate-300" },
  };

  const bottlenecks = useMemo(() => {
    const forAPV = data.filter((r) => r.currentStatus === "For APV").length;
    const forCV = data.filter((r) => r.currentStatus === "For CV").length;
    const open = data.filter((r) => r.currentStatus === "Open JO").length;

    return [
      {
        label: "Open JOs",
        count: open,
        detail: "No APV issued yet",
        color: "text-slate-600",
        border: "border-slate-200",
        bg: "bg-slate-50",
      },
      {
        label: "Awaiting APV",
        count: forAPV,
        detail: "JO delivered, APV pending",
        color: "text-amber-700",
        border: "border-amber-200",
        bg: "bg-amber-50",
      },
      {
        label: "Awaiting CV",
        count: forCV,
        detail: "APV ready, CV not released",
        color: "text-indigo-700",
        border: "border-indigo-200",
        bg: "bg-indigo-50",
      },
    ].filter((b) => b.count > 0);
  }, [data]);

  const completed = useMemo(() => {
    const done = data.filter((r) => r.currentStatus === "Completed").length;
    return [
      {
        label: "Fully Processed",
        count: done,
        detail: "JO → APV → CV complete",
        color: "text-emerald-700",
        border: "border-emerald-200",
        bg: "bg-emerald-50",
      },
    ].filter((c) => c.count > 0);
  }, [data]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#dbeafe_0,_transparent_28%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_45%,#f8fafc_100%)] p-3 font-sans text-slate-900 md:p-6">
      {loading && <LoadingSpinner />}
      <div className="mx-auto max-w-[2000px] space-y-5">

        {/* ── Hero Banner ── */}
        <section className="relative overflow-hidden rounded-[32px] border border-white/50 bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 p-6 text-white shadow-xl shadow-blue-950/10">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-1/3 h-36 w-36 rounded-full bg-cyan-300/20 blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-blue-100">
                <Sparkles size={13} /> End-to-End JO Procurement Monitoring
              </div>
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">JO Tracker</h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-blue-200">
                Monitor the full job order lifecycle from JO, APV, up to CV with live filters and document drilldown.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:min-w-[580px]">
              {summary.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="group flex flex-col gap-1 rounded-3xl border border-white/60 bg-white/95 p-4 shadow-sm shadow-blue-950/10 backdrop-blur transition hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-500">{item.title}</span>
                      <div className={`flex h-7 w-7 items-center justify-center rounded-xl border ${item.bg} ${item.border}`}>
                        <Icon size={14} className={item.color} />
                      </div>
                    </div>
                    <div className="text-2xl font-bold leading-none text-slate-900">{item.value}</div>
                    <div className={`mt-1 inline-flex items-center gap-1 text-[11px] font-medium ${item.trendUp ? "text-emerald-600" : "text-amber-600"}`}>
                      <TrendingUp size={11} />
                      {item.trend}
                    </div>
                    <div className="text-[11px] text-slate-400">{item.sub}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Flow Diagram + Filters ── */}
        <section className="grid gap-4 lg:grid-cols-[1.2fr_2fr]">
          {/* Left: JO Flow vertical diagram */}
          <div className="rounded-[30px] border border-white/70 bg-white/90 p-5 shadow-sm shadow-slate-200/70 ring-1 ring-slate-200/60 backdrop-blur">
            <div className="mb-5">
              <h2 className="text-base font-semibold text-slate-900">JO Flow</h2>
              <p className="mt-0.5 text-xs text-slate-500">JO &gt; APV &gt; CV lifecycle per transaction</p>
            </div>
            <div className="relative">
              <div className="absolute bottom-6 left-[21px] top-6 z-0 w-0.5 bg-slate-100" />
              <div className="relative z-10 space-y-3">
                {stageList.map((stage) => {
                  const Icon = stage.icon;
                  return (
                    <div key={stage.key} className="flex items-center gap-3">
                      <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full border-2 border-blue-600 bg-blue-600 text-white shadow-sm">
                        <Icon size={16} />
                      </div>
                      <div className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wide text-slate-900">{stage.label}</span>
                          <span className="text-xs text-slate-300">·</span>
                          <span className="text-xs text-slate-500">{stage.name}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Filters card */}
          <div className="flex flex-col justify-between rounded-[30px] border border-white/70 bg-white/90 p-5 shadow-sm shadow-slate-200/70 ring-1 ring-slate-200/60 backdrop-blur">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">JO Transaction Monitor</h2>
                <p className="mt-0.5 text-xs text-slate-500">Search and filter live JO records</p>
              </div>
              <button
                type="button"
                onClick={exportToCSV}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-blue-500 bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition hover:-translate-y-0.5 hover:bg-blue-700"
              >
                <Download size={15} />
                Export
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-3">
              {/* Row 1: Status + Branch */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="relative">
                  <Filter size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-10 w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 pl-9 pr-8 text-sm outline-none transition focus:border-blue-400 focus:bg-white"
                  >
                    <option>All</option>
                    <option>Completed</option>
                    <option>For APV</option>
                    <option>For CV</option>
                    <option>Open JO</option>
                  </select>
                </div>
                <div className="relative">
                  <Building2 size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select
                    value={branchFilter}
                    onChange={(e) => { setBranchFilter(e.target.value); fetchJOInquiry(e.target.value); }}
                    className="h-10 w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 pl-9 pr-8 text-sm outline-none transition focus:border-blue-400 focus:bg-white"
                  >
                    {allBranchOptions.map((branch) => (
                      <option key={branch.code} value={branch.code}>{branch.display}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Date range */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="relative">
                  <CalendarDays size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="h-10 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-9 pr-4 text-sm outline-none transition focus:border-blue-400 focus:bg-white"
                  />
                </div>
                <div className="relative">
                  <CalendarDays size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="h-10 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-9 pr-4 text-sm outline-none transition focus:border-blue-400 focus:bg-white"
                  />
                </div>
              </div>

              {/* Row 3: Lookup inputs */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="relative">
                  <Building2 size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={joinCodeName(selectedDepartment.code, selectedDepartment.name) || ""}
                    readOnly
                    placeholder="Department code / name"
                    className="h-10 w-full cursor-pointer rounded-2xl border border-slate-200 bg-slate-50 pl-9 pr-20 text-sm outline-none transition focus:border-blue-400 focus:bg-white"
                    onClick={() => setLookupOpen("department")}
                  />
                  {selectedDepartment.code && (
                    <button
                      type="button"
                      onClick={() => setSelectedDepartment({ code: "", name: "" })}
                      className="absolute right-11 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                      title="Clear department"
                    >
                      <X size={13} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setLookupOpen("department")}
                    className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-xl bg-blue-600 text-white transition hover:bg-blue-700"
                    title="Lookup department"
                  >
                    <Search size={13} />
                  </button>
                </div>

                <div className="relative">
                  <Wallet size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={joinCodeName(selectedPayee.code, selectedPayee.name) || ""}
                    readOnly
                    placeholder="Payee code / name"
                    className="h-10 w-full cursor-pointer rounded-2xl border border-slate-200 bg-slate-50 pl-9 pr-20 text-sm outline-none transition focus:border-blue-400 focus:bg-white"
                    onClick={() => setLookupOpen("payee")}
                  />
                  {selectedPayee.code && (
                    <button
                      type="button"
                      onClick={() => setSelectedPayee({ code: "", name: "" })}
                      className="absolute right-11 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                      title="Clear payee"
                    >
                      <X size={13} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setLookupOpen("payee")}
                    className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-xl bg-blue-600 text-white transition hover:bg-blue-700"
                    title="Lookup payee"
                  >
                    <Search size={13} />
                  </button>
                </div>
              </div>

              {/* Row 4: Search */}
              <div className="relative">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search JO no, payee, branch, department..."
                  className="h-10 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-9 pr-4 text-sm outline-none transition focus:border-blue-400 focus:bg-white"
                />
              </div>
            </div>

            {/* Active filter chips */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400">
                Showing <span className="font-semibold text-slate-700">{filteredData.length}</span> of{" "}
                <span className="font-semibold text-slate-700">{data.length}</span> transactions
              </span>
              {statusFilter !== "All" && (
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${statusConfig[statusFilter]?.cls}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${statusConfig[statusFilter]?.dot}`} />
                  {statusFilter}
                </span>
              )}
              {branchFilter !== "All" && (
                <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  {allBranchOptions.find((b) => b.code === branchFilter)?.display || branchFilter}
                </span>
              )}
              {selectedDepartment.code && (
                <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
                  {joinCodeName(selectedDepartment.code, selectedDepartment.name)}
                </span>
              )}
              {selectedPayee.code && (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                  {joinCodeName(selectedPayee.code, selectedPayee.name)}
                </span>
              )}
            </div>
          </div>
        </section>

        {/* ── Table ── */}
        <section className="overflow-hidden rounded-[30px] border border-white/70 bg-white/95 shadow-sm shadow-slate-200/70 ring-1 ring-slate-200/60 backdrop-blur">
          <div className="overflow-x-auto">
            <div className="max-h-[520px] overflow-y-auto">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur">
                  <tr className="border-b border-slate-200 bg-slate-50/95">
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">JO Details</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Payee</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Branch / RC</th>
                    <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">Amount</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Status</th>
                    <th className="min-w-[220px] px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Flow Progress
                      <span className="ml-2 text-[10px] font-normal normal-case text-slate-300">↑ click any stage</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-400">Loading records...</td></tr>
                  ) : filteredData.length === 0 ? (
                    <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-400">No records found.</td></tr>
                  ) : (
                    filteredData.map((row) => {
                      const sc = statusConfig[row.currentStatus] || {
                        cls: "bg-slate-100 text-slate-500 border border-slate-200",
                        dot: "bg-slate-400",
                      };
                      return (
                        <tr key={row.id} className="transition hover:bg-blue-50/40">
                          {/* JO Details */}
                          <td className="px-5 py-4">
                            <button
                              onClick={() => setDrilldown({ row, stageKey: "jo" })}
                              className="font-mono text-[13px] font-semibold text-blue-700 hover:underline"
                            >
                              {row.joNo}
                            </button>
                            <div className="mt-0.5 text-[11px] text-slate-400">{row.joDate}</div>
                            {row.prNo && (
                              <div className="mt-1 text-[11px] text-slate-400">PR: {row.prNo}</div>
                            )}
                          </td>

                          {/* Payee */}
                          <td className="max-w-[200px] px-5 py-4">
                            <div className="flex items-center gap-2">
                              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[9px] font-bold text-slate-600">
                                {(row.payeeName || row.payeeCode || "?").slice(0, 1).toUpperCase()}
                              </div>
                              <span className="truncate text-[11px] text-slate-500">
                                {row.payeeDisplay || row.payeeName || "—"}
                              </span>
                            </div>
                          </td>

                          {/* Branch / RC */}
                          <td className="max-w-[180px] px-5 py-4">
                            <div className="text-[13px] font-medium leading-snug text-slate-800">{row.branchDisplay || row.branch}</div>
                            <div className="mt-0.5 inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                              {row.departmentDisplay || row.department}
                            </div>
                          </td>

                          {/* Amount */}
                          <td className="px-5 py-4 text-right">
                            <div className="tabular-nums text-[15px] font-bold text-slate-900">{row.joAmountDisplay}</div>
                          </td>

                          {/* Status */}
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold ${sc.cls}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
                              {row.currentStatus}
                            </span>
                          </td>

                          {/* Flow */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-1">
                              {stageList.map((stage, idx) => {
                                const s = stageStepStyle[row.flow[stage.key]];
                                const Icon = stage.icon;
                                const stateKey = row.flow[stage.key];
                                const docCount = row.counts?.[stage.key] || 0;
                                return (
                                  <React.Fragment key={stage.key}>
                                    <button
                                      title={`View ${stage.name}`}
                                      onClick={() => setDrilldown({ row, stageKey: stage.key })}
                                      className="group relative flex cursor-pointer flex-col items-center gap-1 rounded-xl p-1 transition-all hover:scale-110 active:scale-95"
                                    >
                                      {docCount > 1 && (
                                        <span className="absolute -right-0.5 -top-1 z-10 flex h-[15px] w-[15px] items-center justify-center rounded-full border-2 border-white bg-blue-600 text-[8px] font-bold text-white shadow-sm">
                                          {docCount}
                                        </span>
                                      )}
                                      <div className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all ${s.ring} group-hover:ring-2 group-hover:ring-blue-200 group-hover:ring-offset-1`}>
                                        <Icon size={12} className={s.text} />
                                      </div>
                                      <span className={`text-[9px] font-bold ${
                                        stateKey === "todo" ? "text-slate-300"
                                        : stateKey === "active" ? "text-amber-600"
                                        : "text-emerald-600"
                                      }`}>
                                        {stage.label}
                                      </span>
                                    </button>
                                    {idx < stageList.length - 1 && (
                                      <div className={`mb-3.5 h-px w-3 shrink-0 ${
                                        row.flow[stageList[idx + 1].key] === "todo" ? "bg-slate-200" : "bg-emerald-300"
                                      }`} />
                                    )}
                                  </React.Fragment>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── Insight Cards ── */}
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-[30px] border border-white/70 bg-white/90 p-5 shadow-sm shadow-slate-200/70 ring-1 ring-slate-200/60 backdrop-blur">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-amber-200 bg-amber-50">
                <Clock3 size={15} className="text-amber-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Pending</h3>
                <p className="text-[11px] text-slate-400">Requires immediate attention</p>
              </div>
            </div>
            <div className="space-y-2.5">
              {bottlenecks.map((b, i) => (
                <div key={i} className={`flex items-start gap-3 rounded-2xl border ${b.border} ${b.bg} p-3`}>
                  <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-white ${b.border}`}>
                    <span className={`text-sm font-bold ${b.color}`}>{b.count}</span>
                  </div>
                  <div>
                    <div className={`text-xs font-semibold ${b.color}`}>{b.label}</div>
                    <div className="mt-0.5 text-[11px] text-slate-400">{b.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[30px] border border-white/70 bg-white/90 p-5 shadow-sm shadow-slate-200/70 ring-1 ring-slate-200/60 backdrop-blur">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50">
                <CheckCircle2 size={15} className="text-emerald-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Completed</h3>
                <p className="text-[11px] text-slate-400">Fully processed JOs</p>
              </div>
            </div>
            <div className="space-y-2.5">
              {completed.map((c, i) => (
                <div key={i} className={`flex items-start gap-3 rounded-2xl border ${c.border} ${c.bg} p-3`}>
                  <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-white ${c.border}`}>
                    <span className={`text-sm font-bold ${c.color}`}>{c.count}</span>
                  </div>
                  <div>
                    <div className={`text-xs font-semibold ${c.color}`}>{c.label}</div>
                    <div className="mt-0.5 text-[11px] text-slate-400">{c.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* ── Drilldown Modal ── */}
      {drilldown && (
        <DrilldownModal
          row={drilldown.row}
          stageKey={drilldown.stageKey}
          stageList={stageList}
          onClose={() => setDrilldown(null)}
          onStage={(key) => setDrilldown({ row: drilldown.row, stageKey: key })}
          onViewDocument={(row, stageKey, selectedDocNo) => handleViewDocument(row, stageKey, selectedDocNo)}
        />
      )}

      {/* ── Lookups ── */}
      {lookupOpen === "department" && (
        <RCLookupModal isOpen title="Select Department" onClose={handleCloseDepartmentLookup} />
      )}
      {lookupOpen === "payee" && (
        <PayeeMastLookupModal isOpen onClose={handleClosePayeeLookup} />
      )}
    </div>
  );
}