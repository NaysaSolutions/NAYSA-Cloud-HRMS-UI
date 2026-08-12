import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Filter,
  FileText,
  ShoppingCart,
  Briefcase,
  PackageCheck,
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
import RCLookupModal from "../../../Lookup/SearchRCMast.jsx";
import MSLookupModal from "../../../Lookup/SearchMSMast.jsx";

// ── static stage field labels only ───────────────────────────────────────────
const stageDetails = {
  pr: {
    fields: [
      { label: "PR Number", key: "prNo" },
      { label: "PR Date", key: "prDate" },
      { label: "Prepared By", key: "requestor" },
      { label: "Responsibility Center", key: "departmentDisplay" },
      { label: "Remarks", key: "remarks" },
    ],
  },
  po: {
    fields: [
      { label: "PR Number", key: "prNo" },
      { label: "PO Number", key: "poNo" },
      { label: "PR Qty", key: "prQuantityDisplay" },
      { label: "PO Qty", key: "poQtyDisplay" },
    ],
  },
  jo: {
    fields: [
      { label: "PR Number", key: "prNo" },
      { label: "JO Number", key: "joNo" },
      { label: "PR Qty", key: "prQuantityDisplay" },
    ],
  },
  rr: {
    fields: [
      { label: "Ref Number (PO/JO)", key: "poNo" },
      { label: "RR Number", key: "rrNo" },
      { label: "RR Qty", key: "rrQtyDisplay" },
    ],
  },
  apv: {
    fields: [
      { label: "RR Number", key: "rrNo" },
      { label: "APV Number", key: "apvNo" },
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

const normalizePRInquiryRows = (response) => {
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
          console.error("Failed to parse PR inquiry result row:", error);
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
        console.error("Failed to parse PR inquiry result string:", error);
      }
    }
    if (Array.isArray(candidate?.dt1)) return candidate.dt1;
  }
  return [];
};

const isJOFlow = (row = {}) => {
  const invTypes = String(row.invType || row.invTypes || "").toUpperCase();
  return invTypes.split(/[\n,|/ ]+/).includes("JO") || !!row.joNo;
};

const getStageKeys = (row = {}) =>
  isJOFlow(row) ? ["pr", "jo", "apv", "cv"] : ["pr", "po", "rr", "apv", "cv"];

const getFlowState = (row) => {
  const hasPO = !!row.poNo;
  const hasJO = !!row.joNo;
  const hasRR = !!row.rrNo;
  const hasAPV = !!row.apvNo;
  const hasCV = !!row.cvNo;

  if (isJOFlow(row)) {
    return {
      pr: "done",
      po: "todo",
      jo: hasJO ? "done" : "active",
      rr: "todo",
      apv: hasAPV ? "done" : hasJO ? "active" : "todo",
      cv: hasCV ? "done" : hasAPV ? "active" : "todo",
    };
  }

  return {
    pr: "done",
    po: hasPO ? "done" : "active",
    jo: "todo",
    rr: hasRR ? "done" : hasPO ? "active" : "todo",
    apv: hasAPV ? "done" : hasRR ? "active" : "todo",
    cv: hasCV ? "done" : hasAPV ? "active" : "todo",
  };
};

const getCurrentStatus = (flow, row = {}) => {
  if (
    row.prStatus === "X" ||
    String(row.prStatusDesc).toUpperCase() === "CANCELLED"
  ) {
    return "Cancelled";
  }

  const rrQty = Number(row.rrQty || row.totalRRQty || 0);
  const poQty = Number(row.poQty || row.totalPOQty || 0);

  if (flow.cv === "done") return "Completed";
  if (flow.cv === "active") return "For CV";
  if (flow.apv === "active") return "For APV";

  if (isJOFlow(row)) {
    if (flow.jo === "active") return "For JO";
    return "Open PR";
  }

  if (flow.rr === "done" && flow.apv !== "done") {
    if (poQty > 0 && rrQty > 0 && rrQty < poQty) return "Partial RR";
    return "For APV";
  }

  if (flow.rr === "active") return "For RR";
  if (flow.po === "active") return "For PO";
  return "Open PR";
};

const getProgress = (flow, row = {}) => {
  const steps = getStageKeys(row);
  const doneCount = steps.filter((key) => flow[key] === "done").length;
  return Math.min(100, Math.round((doneCount / steps.length) * 100));
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

const formatNumber = (value, decimals = 2) => {
  const num = Number(value || 0);
  return new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
};

const getBranchDisplay = (row) => {
  const code = String(row.branch || "").trim();
  const name = String(row.branchName || "").trim();
  return name && name !== code ? `${code} - ${name}` : code;
};

const aggregatePRInqRows = (rows) => {
  const groups = new Map();

  rows.forEach((item) => {
    const prNo = item.prNo || item.pr_no || "";
    const prId = item.prId || item.pr_id || "";
    const prDate = item.prDate || item.pr_date || "";
    const prStatus = item.prStatus || item.pr_status || "";
    const prStatusDesc =
      item.prStatusDesc || item.pr_stat_desc || prStatus || "";
    const branchCode =
      item.branchCode || item.branchcode || item.branch_code || "";
    const branchName = item.branchName || item.branch_name || "";
    const rcCode = item.rcCode || item.rc_code || "";
    const rcName =
      item.rcName || item.rc_name || item.rcDesc || item.rc_desc || "";
    const preparedBy =
      item.preparedBy ||
      item.prepared_by ||
      item.userCode ||
      item.user_code ||
      "";
    const preparedDate =
      item.preparedDate || item.prepared_date || item.date_stamp || "";
    const remarks = item.remarks || item.specs || item.item_specs || "";
    const prType = item.prType || item.pr_type || "";
    const delDate = item.delDate || item.del_date || "";

    const itemCode = item.itemCode || item.item_no || item.item_code || "";
    const itemName = item.itemName || item.item_desc || item.item_name || "";
    const uomCode = item.uomCode || item.uom_code || "";
    const invType = item.invType || item.inv_type || "";
    const itemSpecs = item.itemSpecs || item.item_specs || "";
    const prQty = item.prQuantity ?? item.pr_quantity ?? item.qty_needed ?? 0;
    const poQty = item.poQty ?? item.po_qty ?? 0;
    const rrQty = item.rrQty ?? item.rr_qty ?? 0;
    const prBalance = item.prBalance ?? item.pr_balance ?? 0;

    const poNos = splitDocs(item.poNo || item.po_no);
    const joNos = splitDocs(item.joNo || item.jo_no);
    const rrNos = splitDocs(item.rrNo || item.rr_no);
    const apvNos = splitDocs(item.apvNo || item.apv_no);
    const cvNos = splitDocs(item.cvNo || item.cv_no);

    const groupKey = prId || `${branchCode}-${prNo}`;

    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        header: {
          prNo,
          prId,
          prDate,
          prStatus,
          prStatusDesc,
          branchCode,
          branchName,
          rcCode,
          rcName,
          preparedBy,
          preparedDate,
          remarks,
          prType,
          delDate,
        },
        detailLines: [],
        poNos: [],
        joNos: [],
        rrNos: [],
        apvNos: [],
        cvNos: [],
        invTypes: [],
        totalPRQty: 0,
        totalPOQty: 0,
        totalRRQty: 0,
        totalPRBalance: 0,
      });
    }

    const group = groups.get(groupKey);

    group.detailLines.push({
      itemCode,
      itemName,
      uomCode,
      invType,
      itemSpecs,
      prQty,
      poQty,
      rrQty,
      prBalance,
      delDate,
      remarks: itemSpecs || remarks || "",
    });

    group.poNos.push(...poNos);
    group.joNos.push(...joNos);
    group.rrNos.push(...rrNos);
    group.apvNos.push(...apvNos);
    group.cvNos.push(...cvNos);
    if (invType) group.invTypes.push(invType);

    group.totalPRQty += Number(prQty || 0);
    group.totalPOQty += Number(poQty || 0);
    group.totalRRQty += Number(rrQty || 0);
    group.totalPRBalance += Number(prBalance || 0);
  });

  return Array.from(groups.values()).map((group) => {
    const {
      prNo,
      prId,
      prDate,
      prStatus,
      prStatusDesc,
      branchCode,
      branchName,
      rcCode,
      rcName,
      preparedBy,
      preparedDate,
      remarks,
      prType,
      delDate,
    } = group.header;

    const poNos = [...new Set(group.poNos)];
    const joNos = [...new Set(group.joNos)];
    const rrNos = [...new Set(group.rrNos)];
    const apvNos = [...new Set(group.apvNos)];
    const cvNos = [...new Set(group.cvNos)];
    const invTypes = [...new Set(group.invTypes)].join("/");

    const uniqueDetailLines = uniqueBy(group.detailLines, (line) =>
      [
        line.itemCode || "",
        line.itemName || "",
        line.uomCode || "",
        Number(line.prQty || 0),
        Number(line.poQty || 0),
        Number(line.rrQty || 0),
      ].join("|"),
    );

    const itemDetails = uniqueDetailLines.map((line) => ({
      "Item Code": line.itemCode,
      "Item Name": line.itemName,
      UOM: line.uomCode,
      "Inv Type": line.invType,
      "PR Qty": formatNumber(line.prQty, 6),
      "PO Qty": formatNumber(line.poQty, 6),
      "RR Qty": formatNumber(line.rrQty, 6),
      Balance: formatNumber(line.prBalance, 6),
      "Date Needed": formatDateDisplay(line.delDate || delDate),
      Specs: line.itemSpecs || "—",
    }));

    const prDocs = [
      {
        "PR Number": prNo,
        "PR Date": formatDateDisplay(prDate),
        Status: prStatusDesc || prStatus || "Open",
        Department: joinCodeName(rcCode, rcName) || rcCode,
        "Prepared By": preparedBy || "—",
        "Prepared Date": formatDateDisplay(preparedDate),
        "PR Type": prType || "—",
        Items: uniqueDetailLines.length,
        "Total PR Qty": formatNumber(group.totalPRQty, 6),
        Details: itemDetails,
      },
    ];

    const poDocs = poNos.map((po) => ({
      "PO Number": po,
      "Ref PR": prNo,
      "PO Qty": formatNumber(group.totalPOQty, 6),
      Items: uniqueDetailLines.length,
      Details: itemDetails,
    }));

    const joDocs = joNos.map((jo) => ({
      "JO Number": jo,
      "Ref PR": prNo,
      Items: uniqueDetailLines.length,
      Details: itemDetails,
    }));

    const rrDocs = rrNos.map((rr) => ({
      "RR Number": rr,
      "Ref PO": poNos[0] || joNos[0] || "",
      "RR Qty": formatNumber(group.totalRRQty, 6),
      Items: uniqueDetailLines.length,
      Details: itemDetails,
    }));

    // ── ✅ Added Details Mapping Array to APV Document rows ──
    const apvDocs = apvNos.map((apv) => ({
      "APV Number": apv,
      "Ref RR": rrNos[0] || joNos[0] || "",
      Items: uniqueDetailLines.length,
      Details: itemDetails,
    }));

    // ── ✅ Added Details Mapping Array to CV Document rows ──
    const cvDocs = cvNos.map((cv) => ({
      "CV Number": cv,
      "Ref APV": apvNos[0] || "",
      Items: uniqueDetailLines.length,
      Details: itemDetails,
    }));

    const flowSeed = {
      invTypes,
      poNo: poNos.join("\n"),
      joNo: joNos.join("\n"),
      rrNo: rrNos.join("\n"),
      apvNo: apvNos.join("\n"),
      cvNo: cvNos.join("\n"),
    };
    const flow = getFlowState(flowSeed);

    return {
      id: prId || `${branchCode}-${prNo}`,
      prNo,
      prId,
      prDate: formatDateDisplay(prDate),
      prStatus,
      prStatusDesc,
      poNo: poNos.join("\n"),
      joNo: joNos.join("\n"),
      branch: branchCode,
      branchName: branchName || branchCode,
      department: rcCode,
      departmentName: rcName,
      departmentDisplay: joinCodeName(rcCode, rcName) || rcCode,
      supplier: "",
      supplierCode: "",
      supplierDisplay: "—",
      amount: formatNumber(group.totalPRQty, 6),
      requestor: preparedBy || "—",
      preparedDate: formatDateDisplay(preparedDate),
      currentStatus: getCurrentStatus(flow, {
        ...flowSeed,
        prStatus,
        prStatusDesc,
        rrQty: group.totalRRQty,
        totalRRQty: group.totalRRQty,
        poQty: group.totalPOQty,
        totalPOQty: group.totalPOQty,
      }),
      aging: "0 day",
      agingDays: 0,
      remarks: remarks || "",
      progress: getProgress(flow, flowSeed),
      flow,
      invTypes,
      counts: {
        pr: prDocs.length,
        po: poDocs.length,
        jo: joDocs.length,
        rr: rrDocs.length,
        apv: apvDocs.length,
        cv: cvDocs.length,
      },
      stageDocs: {
        pr: prDocs,
        po: poDocs,
        jo: joDocs,
        rr: rrDocs,
        apv: apvDocs,
        cv: cvDocs,
      },
      detailLines: uniqueDetailLines,
      itemCode: uniqueDetailLines[0]?.itemCode || "",
      itemName: uniqueDetailLines[0]?.itemName || "",
      itemDisplay:
        joinCodeName(
          uniqueDetailLines[0]?.itemCode ||
            uniqueDetailLines[0]?.itemName ||
            "",
        ) ||
        uniqueDetailLines[0]?.itemCode ||
        "",
      uomCode: uniqueDetailLines[0]?.uomCode || "",
      prQuantityDisplay: formatNumber(group.totalPRQty, 6),
      poQtyDisplay: formatNumber(group.totalPOQty, 6),
      rrQtyDisplay: formatNumber(group.totalRRQty, 6),
      prBalanceDisplay: formatNumber(group.totalPRBalance, 6),
      rrNo: rrNos.join("\n"),
      apvNo: apvNos.join("\n"),
      cvNo: cvNos.join("\n"),
    };
  });
};

function DrilldownModal({
  row,
  stageKey,
  stageList,
  onClose,
  onStage,
  onViewDocument,
}) {
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
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-2xl border ${sc.badge}`}
              >
                <Icon size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-slate-900">
                    {stage.label}
                  </span>
                  <span className="text-slate-300">—</span>
                  <span className="text-sm text-slate-500">{stage.name}</span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${sc.badge}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
                    {stageStatusLabel[stateKey]}
                  </span>
                  <span className="font-mono text-[11px] text-slate-400">
                    {row.prNo}
                  </span>
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
                <div
                  key={f.key}
                  className="flex items-center justify-between px-4 py-2.5"
                >
                  <span className="text-xs text-slate-500">{f.label}</span>
                  <span className="text-xs font-semibold text-slate-800">
                    {row[f.key] || "—"}
                  </span>
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
                <p className="text-xs text-slate-400">
                  No documents generated yet for this stage.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {extraDocs.map((doc, idx) => (
                  <div
                    key={idx}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                  >
                    {extraDocs.length > 1 && (
                      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Document {idx + 1}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          {doc["PR Number"] ||
                            doc["PO Number"] ||
                            doc["JO Number"] ||
                            doc["RR Number"] ||
                            doc["APV Number"] ||
                            doc["CV Number"] ||
                            "—"}
                        </span>
                      </div>
                    )}
                    <div className="divide-y divide-slate-100">
                      {Object.entries(doc).map(([label, value]) => {
                        if (label === "Details") return null;
                        const isPoNumberRow = [
                          "PR Number",
                          "PO Number",
                          "JO Number",
                          "RR Number",
                          "APV Number",
                          "CV Number",
                        ].includes(label);
                        const isAdjustment =
                          label.includes("APCM") || label.includes("APDM");
                        const isNet = label.includes("Net Payable");

                        return (
                          <div
                            key={label}
                            className={`flex items-center justify-between px-4 py-2.5 ${isNet ? "bg-slate-50/50" : ""}`}
                          >
                            <span
                              className={`text-xs ${isAdjustment ? "font-medium text-amber-600" : "text-slate-500"}`}
                            >
                              {label}
                            </span>
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-xs ${value === "—" || value === "Pending" ? "text-slate-400" : isNet ? "text-[13px] font-bold text-slate-900" : "font-semibold text-slate-800"}`}
                              >
                                {value || "—"}
                              </span>
                              {isPoNumberRow &&
                                value &&
                                value !== "—" &&
                                value !== "Pending" && (
                                  <button
                                    type="button"
                                    title="View Document"
                                    onClick={() =>
                                      onViewDocument?.(row, stageKey, value)
                                    }
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
                          PR Item Details
                        </p>
                        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                          <table className="min-w-full text-[11px]">
                            <thead className="bg-slate-50 text-slate-400">
                              <tr>
                                {Object.keys(doc.Details[0] || {}).map(
                                  (col) => (
                                    <th
                                      key={col}
                                      className="whitespace-nowrap px-3 py-2 text-left font-semibold"
                                    >
                                      {col}
                                    </th>
                                  ),
                                )}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {doc.Details.map((line, lineIdx) => (
                                <tr key={lineIdx}>
                                  {Object.keys(doc.Details[0] || {}).map(
                                    (col) => (
                                      <td
                                        key={col}
                                        className="whitespace-nowrap px-3 py-2 text-slate-700"
                                      >
                                        {line[col] || "—"}
                                      </td>
                                    ),
                                  )}
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
            {stageList
              .filter((s) => getStageKeys(row).includes(s.key))
              .map((s) => {
                const isActive = s.key === stageKey;
                const sState = row.flow[s.key];
                const sc2 = stageColor[sState];
                const SIcon = s.icon;
                return (
                  <button
                    key={s.key}
                    onClick={() => onStage(s.key)}
                    className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[11px] font-semibold transition-all ${isActive ? "bg-blue-600 text-white shadow-sm border-blue-400" : `${sc2.badge} cursor-pointer hover:opacity-75`}`}
                  >
                    <SIcon size={11} /> {s.label}
                  </button>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PRInq() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [branchFilter, setBranchFilter] = useState("All");
  const getToday = () => new Date().toISOString().split("T")[0];
  const getThreeMonthsAgo = () => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return d.toISOString().split("T")[0];
  };

  const [fromDate, setFromDate] = useState(getThreeMonthsAgo());
  const [toDate, setToDate] = useState(getToday());
  const [drilldown, setDrilldown] = useState(null);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [allBranchOptions, setAllBranchOptions] = useState(["All"]);
  const [selectedItem, setSelectedItem] = useState({ code: "", name: "" });
  const [selectedDepartment, setSelectedDepartment] = useState({
    code: "",
    name: "",
  });
  const [invTypeFilter, setInvTypeFilter] = useState("All");
  const [lookupOpen, setLookupOpen] = useState(null);
  const navigate = useNavigate();

  const handleViewDocument = (row, stageKey, selectedDocNo = "") => {
    const branchCode = row?.branch || row?.branchCode || "";
    const routeMap = {
      pr: { path: "/page/PR", param: "prNo", value: row.prNo },
      po: { path: "/page/PO", param: "msajNo", value: row.poNo },
      jo: { path: "/page/JO", param: "joNo", value: row.joNo },
      rr: { path: "/page/RR", param: "rrNo", value: row.rrNo },
      apv: { path: "/page/APV", param: "apvNo", value: row.apvNo },
      cv: { path: "/page/CV", param: "cvNo", value: row.cvNo },
    };

    const config = routeMap[stageKey];
    const docNo = String(selectedDocNo || config?.value || "")
      .split("\n")[0]
      .trim();

    if (!config || !docNo || !branchCode) return;
    navigate(
      `${config.path}?${config.param}=${encodeURIComponent(docNo)}&branchCode=${encodeURIComponent(branchCode)}&viewDocument=true&viewOnly=Y&source=sourceFlow`,
    );
  };

  const stageList = [
    { key: "pr", label: "PR", name: "Purchase Requisition", icon: FileText },
    { key: "po", label: "PO", name: "Purchase Order", icon: ShoppingCart },
    { key: "jo", label: "JO", name: "Job Order", icon: Briefcase },
    { key: "rr", label: "RR", name: "Receiving Report", icon: PackageCheck },
    {
      key: "apv",
      label: "APV",
      name: "Accounts Payable Voucher",
      icon: Receipt,
    },
    { key: "cv", label: "CV", name: "Check Voucher", icon: Wallet },
  ];

  const fetchPRInquiry = async (selectedBranch = branchFilter) => {
    setLoading(true);
    try {
      const selectedBranchCode =
        selectedBranch === "All" ? "" : selectedBranch.split(" - ")[0].trim();

      const response = await fetchData("getPRInquiry", {
        json_data: {
          branchCode: selectedBranchCode,
          itemCode: selectedItem.code,
          prStatus: "",
          startingCutoff: fromDate ? fromDate.slice(0, 7).replace("-", "") : "",
          endingCutoff: toDate ? toDate.slice(0, 7).replace("-", "") : "",
          rcCode: selectedDepartment.code,
          vendCode: "",
          invType: invTypeFilter === "All" ? "" : invTypeFilter,
        },
      });
      const parsedRows = normalizePRInquiryRows(response);
      const aggregated = aggregatePRInqRows(parsedRows);
      setData(aggregated);

      if (selectedBranch === "All") {
        const formattedStrings = aggregated
          .map((row) => getBranchDisplay(row))
          .filter(Boolean);
        setAllBranchOptions(["All", ...new Set(formattedStrings)]);
      }
    } catch (error) {
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPRInquiry();
  }, [
    branchFilter,
    fromDate,
    selectedDepartment.code,
    selectedItem.code,
    invTypeFilter,
    toDate,
  ]);

  const summary = useMemo(() => {
    const total = data.length;
    const activePOJO = data.filter(
      (row) =>
        row.currentStatus === "For PO / JO" ||
        row.currentStatus === "For PO" ||
        row.currentStatus === "For JO",
    ).length;
    const forAPV = data.filter((row) => row.currentStatus === "For APV").length;
    const completedCV = data.filter(
      (row) => row.currentStatus === "Completed",
    ).length;

    return [
      {
        title: "Total PR",
        value: `${total}`,
        sub: "Loaded from PR inquiry",
        icon: FileText,
        color: "text-blue-600",
        bg: "bg-blue-50",
        border: "border-blue-100",
        trend: "Live data",
        trendUp: true,
      },
      {
        title: "For PO / JO",
        value: `${activePOJO}`,
        sub: "Ongoing requisitions",
        icon: FileText,
        color: "text-violet-600",
        bg: "bg-violet-50",
        border: "border-violet-100",
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
        title: "Completed CV",
        value: `${completedCV}`,
        sub: "Released and posted",
        icon: Wallet,
        color: "text-emerald-600",
        bg: "bg-emerald-50",
        border: "border-emerald-100",
        trend: "Live data",
        trendUp: true,
      },
    ];
  }, [data]);

  const bottlenecks = useMemo(() => {
    const pendingPOJO = data.filter(
      (x) =>
        x.currentStatus === "For PO / JO" ||
        x.currentStatus === "For PO" ||
        x.currentStatus === "For JO",
    ).length;
    const openPR = data.filter((x) => x.currentStatus === "Open PR").length;

    return [
      {
        count: pendingPOJO,
        label: "pending PO / JO approval",
        detail: "waiting subsequent order generation",
        color: "text-amber-700",
        bg: "bg-amber-50",
        border: "border-amber-200",
      },
      {
        count: openPR,
        label: "open requisition tasks",
        detail: "awaiting initialization stage",
        color: "text-slate-700",
        bg: "bg-slate-50",
        border: "border-slate-200",
      },
    ];
  }, [data]);

  const completed = useMemo(() => {
    const inProgressFulfillment = data.filter(
      (x) => x.currentStatus === "For RR" || x.currentStatus === "Partial RR",
    ).length;
    const accountingVouchers = data.filter(
      (x) => x.currentStatus === "For APV" || x.currentStatus === "For CV",
    ).length;

    return [
      {
        count: inProgressFulfillment,
        label: "pending item delivery",
        detail: "awaiting receiving reports (RR)",
        color: "text-sky-700",
        bg: "bg-sky-50",
        border: "border-sky-200",
      },
      {
        count: accountingVouchers,
        label: "vouchers processing",
        detail: "pending APV/CV settlement cycles",
        color: "text-emerald-700",
        bg: "bg-emerald-50",
        border: "border-emerald-200",
      },
    ];
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter((row) => {
      const matchesSearch = [
        row.prNo,
        row.supplier,
        row.supplierCode,
        row.supplierDisplay,
        row.branch,
        row.branchName,
        row.department,
        row.departmentName,
        row.departmentDisplay,
        row.requestor,
        row.currentStatus,
        row.itemCode,
        row.itemName,
        row.itemDisplay,
        row.invTypes,
      ]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesStatus =
        statusFilter === "All" || row.currentStatus === statusFilter;
      const matchesBranch =
        branchFilter === "All" || getBranchDisplay(row) === branchFilter;
      const matchesInvType =
        invTypeFilter === "All" ||
        String(row.invTypes || "")
          .toUpperCase()
          .split("/")
          .includes(invTypeFilter.toUpperCase());

      return matchesSearch && matchesStatus && matchesBranch && matchesInvType;
    });
  }, [data, search, statusFilter, branchFilter, invTypeFilter]);

  const branchOptions = allBranchOptions;

  const exportToExcel = () => {
    const headers = [
      "PR No",
      "PR Date",
      "Branch",
      "Department",
      "Item Code",
      "Item Name",
      "UOM",
      "PR Qty",
      "PO Qty",
      "RR Qty",
      "Balance",
      "Status",
      "PO No",
      "JO No",
      "RR No",
      "APV No",
      "CV No",
      "Remarks",
    ];
    const escapeCell = (value) => `"${`${value ?? ""}`.replace(/"/g, '""')}"`;
    const rows = filteredData.map((row) => [
      row.prNo,
      row.prDate,
      getBranchDisplay(row),
      row.departmentName || row.department,
      row.itemCode,
      row.itemName,
      row.uomCode,
      row.prQuantityDisplay,
      row.poQtyDisplay,
      row.rrQtyDisplay,
      row.prBalanceDisplay,
      row.currentStatus,
      row.poNo,
      row.joNo,
      row.rrNo,
      row.apvNo,
      row.cvNo,
      row.remarks,
    ]);
    const csvContent = [headers, ...rows]
      .map((line) => line.map(escapeCell).join(","))
      .join("\n");
    const blob = new Blob([`\uFEFF${csvContent}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pr-inquiry-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const statusConfig = {
    Cancelled: {
      cls: "bg-rose-100 text-rose-700 border border-rose-200",
      dot: "bg-rose-500",
    },
    Completed: {
      cls: "bg-emerald-100 text-emerald-700 border border-emerald-200",
      dot: "bg-emerald-500",
    },
    "For APV": {
      cls: "bg-violet-100 text-violet-700 border border-violet-200",
      dot: "bg-violet-500",
    },
    "For CV": {
      cls: "bg-indigo-100 text-indigo-700 border border-indigo-200",
      dot: "bg-indigo-500",
    },
    "Partial RR": {
      cls: "bg-sky-100 text-sky-700 border border-sky-200",
      dot: "bg-sky-500",
    },
    "For PO / JO": {
      cls: "bg-amber-100 text-amber-700 border border-amber-200",
      dot: "bg-amber-500",
    },
    "For PO": {
      cls: "bg-amber-100 text-amber-700 border border-amber-200",
      dot: "bg-amber-500",
    },
    "For JO": {
      cls: "bg-amber-100 text-amber-700 border border-amber-200",
      dot: "bg-amber-500",
    },
    "Open PR": {
      cls: "bg-slate-100 text-slate-600 border border-slate-200",
      dot: "bg-slate-400",
    },
    "For RR": {
      cls: "bg-sky-100 text-sky-700 border border-sky-200",
      dot: "bg-sky-500",
    },
  };

  const stageStepStyle = {
    done: { ring: "border-emerald-400 bg-emerald-500", text: "text-white" },
    active: { ring: "border-amber-400 bg-amber-500", text: "text-white" },
    todo: { ring: "border-slate-200 bg-white", text: "text-slate-300" },
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#dbeafe_0,_transparent_28%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_45%,#f8fafc_100%)] p-3 font-sans text-slate-900 md:p-6">
      {loading && <LoadingSpinner />}
      <div className="mx-auto max-w-[2000px] space-y-5">
        <section className="relative overflow-hidden rounded-[32px] border border-white/50 bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 p-6 text-white shadow-xl shadow-blue-950/10">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-1/3 h-36 w-36 rounded-full bg-cyan-300/20 blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-blue-100">
                <Sparkles size={13} /> End-to-End PR Procurement Monitoring
              </div>
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                PR Tracker
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-blue-200">
                Monitor the full procurement lifecycle from PR, PO, JO, RR, APV,
                up to CV with live filters and document drilldown.
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
                      <span className="text-xs font-medium text-slate-500">
                        {item.title}
                      </span>
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-xl border ${item.bg} ${item.border}`}
                      >
                        <Icon size={14} className={item.color} />
                      </div>
                    </div>
                    <div className="text-2xl font-bold leading-none text-slate-900">
                      {item.value}
                    </div>
                    <div
                      className={`mt-1 inline-flex items-center gap-1 text-[11px] font-medium ${item.trendUp ? "text-emerald-600" : "text-amber-600"}`}
                    >
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

        <section className="grid gap-4 lg:grid-cols-[1.2fr_2fr]">
          <div className="rounded-[30px] border border-white/70 bg-white/90 p-5 shadow-sm shadow-slate-200/70 ring-1 ring-slate-200/60 backdrop-blur">
            <div className="mb-5">
              <h2 className="text-base font-semibold text-slate-900">
                Procurement Flow
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                PR &gt; PO/JO &gt; RR &gt; APV &gt; CV lifecycle per transaction
              </p>
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
                          <span className="text-xs font-bold uppercase tracking-wide text-slate-900">
                            {stage.label}
                          </span>
                          <span className="text-xs text-slate-300">·</span>
                          <span className="text-xs text-slate-500">
                            {stage.name}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-[30px] border border-white/70 bg-white/90 p-5 shadow-sm shadow-slate-200/70 ring-1 ring-slate-200/60 backdrop-blur">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  PR Transaction Monitor
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Search and filter live procurement records
                </p>
              </div>
              <button
                type="button"
                onClick={exportToExcel}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-blue-500 bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition hover:-translate-y-0.5 hover:bg-blue-700"
              >
                <Download size={15} />
                Export
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="relative">
                  <Filter
                    size={15}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-10 w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 pl-9 pr-8 text-sm outline-none transition focus:border-blue-400 focus:bg-white"
                  >
                    <option>All</option>
                    <option>Cancelled</option>
                    <option>Completed</option>
                    <option>For APV</option>
                    <option>For CV</option>
                    <option>Partial RR</option>
                    <option>For RR</option>
                    <option>For PO / JO</option>
                    <option>For PO</option>
                    <option>For JO</option>
                    <option>Open PR</option>
                  </select>
                </div>
                <div className="relative">
                  <Building2
                    size={15}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <select
                    value={branchFilter}
                    onChange={(e) => setBranchFilter(e.target.value)}
                    className="h-10 w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 pl-9 pr-8 text-sm outline-none transition focus:border-blue-400 focus:bg-white"
                  >
                    {branchOptions.map((branch) => (
                      <option key={branch} value={branch}>
                        {branch}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="relative">
                  <CalendarDays
                    size={15}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="h-10 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-9 pr-4 text-sm outline-none transition focus:border-blue-400 focus:bg-white"
                  />
                </div>
                <div className="relative">
                  <CalendarDays
                    size={15}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="h-10 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-9 pr-4 text-sm outline-none transition focus:border-blue-400 focus:bg-white"
                  />
                </div>
              </div>
              <div className="grid gap-3 lg:grid-cols-3">
                <div className="relative">
                  <Search
                    size={15}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    value={
                      joinCodeName(selectedItem.code, selectedItem.name) || ""
                    }
                    readOnly
                    placeholder="Item code / name"
                    className="h-10 w-full cursor-pointer rounded-2xl border border-slate-200 bg-slate-50 pl-9 pr-20 text-sm outline-none transition focus:border-blue-400 focus:bg-white"
                    onClick={() => setLookupOpen("item")}
                  />
                  {selectedItem.code && (
                    <button
                      type="button"
                      onClick={() => setSelectedItem({ code: "", name: "" })}
                      className="absolute right-11 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                      title="Clear item"
                    >
                      <X size={13} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setLookupOpen("item")}
                    className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-xl bg-blue-600 text-white transition hover:bg-blue-700"
                  >
                    <Search size={13} />
                  </button>
                </div>
                <div className="relative">
                  <Building2
                    size={15}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    value={
                      joinCodeName(
                        selectedDepartment.code,
                        selectedDepartment.name,
                      ) || ""
                    }
                    readOnly
                    placeholder="Department code / name"
                    className="h-10 w-full cursor-pointer rounded-2xl border border-slate-200 bg-slate-50 pl-9 pr-20 text-sm outline-none transition focus:border-blue-400 focus:bg-white"
                    onClick={() => setLookupOpen("department")}
                  />
                  {selectedDepartment.code && (
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedDepartment({ code: "", name: "" })
                      }
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
                  >
                    <Search size={13} />
                  </button>
                </div>
                <div className="relative">
                  <SlidersHorizontal
                    size={15}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <select
                    value={invTypeFilter}
                    onChange={(e) => setInvTypeFilter(e.target.value)}
                    className="h-10 w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 pl-9 pr-8 text-sm outline-none transition focus:border-blue-400 focus:bg-white"
                  >
                    <option value="All">All Inv Types</option>
                    <option value="JO">JO</option>
                    <option value="MS">MS</option>
                    <option value="FG">FG</option>
                    <option value="RM">RM</option>
                  </select>
                </div>
              </div>
              <div className="relative">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search PR no, branch, department, item..."
                  className="h-10 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-9 pr-4 text-sm outline-none transition focus:border-blue-400 focus:bg-white"
                />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400">
                Showing{" "}
                <span className="font-semibold text-slate-700">
                  {filteredData.length}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-slate-700">
                  {data.length}
                </span>{" "}
                transactions
              </span>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[30px] border border-white/70 bg-white/95 shadow-sm shadow-slate-200/70 ring-1 ring-slate-200/60 backdrop-blur">
          <div className="overflow-x-auto">
            <div className="max-h-[520px] overflow-y-auto">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur">
                  <tr className="border-b border-slate-200 bg-slate-50/95">
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                      PR Details
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Branch
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Department
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Status
                    </th>
                    <th className="min-w-[300px] px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Flow Progress
                      <span className="ml-2 text-[10px] font-normal normal-case text-slate-300">
                        ↑ click any stage
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-5 py-10 text-center text-sm text-slate-400"
                      >
                        Loading records...
                      </td>
                    </tr>
                  ) : filteredData.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-5 py-10 text-center text-sm text-slate-400"
                      >
                        No records found.
                      </td>
                    </tr>
                  ) : (
                    filteredData.map((row) => {
                      const sc =
                        statusConfig[row.currentStatus] ||
                        statusConfig["Open PR"];
                      return (
                        <tr
                          key={row.id}
                          className="transition hover:bg-blue-50/40"
                        >
                          <td className="px-5 py-4">
                            <div className="font-mono text-[13px] font-semibold text-blue-700">
                              {row.prNo}
                            </div>
                            <div className="mt-0.5 text-[11px] text-slate-400">
                              {row.prDate}
                            </div>
                            <div className="mt-1.5 flex items-center gap-1.5">
                              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[9px] font-bold text-slate-600">
                                {(row.requestor || "U")
                                  .slice(0, 1)
                                  .toUpperCase()}
                              </div>
                              <span className="text-[11px] text-slate-500">
                                {row.requestor || "—"}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="text-[13px] font-medium text-slate-800">
                              {getBranchDisplay(row)}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="text-[13px] font-medium text-slate-800">
                              {row.departmentName || "—"}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold ${sc.cls}`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${sc.dot}`}
                              />
                              {row.currentStatus}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-1 flex-wrap">
                              {stageList
                                .filter((stage) =>
                                  getStageKeys(row).includes(stage.key),
                                )
                                .map((stage, idx, rowStages) => {
                                  const s = stageStepStyle[row.flow[stage.key]];
                                  const Icon = stage.icon;
                                  const stateKey = row.flow[stage.key];
                                  const docCount = row.counts?.[stage.key] || 0;
                                  return (
                                    <React.Fragment key={stage.key}>
                                      <button
                                        title={`View ${stage.name}`}
                                        onClick={() =>
                                          setDrilldown({
                                            row,
                                            stageKey: stage.key,
                                          })
                                        }
                                        className="group relative flex cursor-pointer flex-col items-center gap-1 rounded-xl p-1 transition-all hover:scale-110 active:scale-95"
                                      >
                                        {docCount > 1 && (
                                          <span className="absolute -right-0.5 -top-1 z-10 flex h-[15px] w-[15px] items-center justify-center rounded-full border-2 border-white bg-blue-600 text-[8px] font-bold text-white shadow-sm">
                                            {docCount}
                                          </span>
                                        )}
                                        <div
                                          className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all ${s.ring} group-hover:ring-2 group-hover:ring-blue-200 group-hover:ring-offset-1`}
                                        >
                                          <Icon size={12} className={s.text} />
                                        </div>
                                        <span
                                          className={`text-[9px] font-bold ${stateKey === "todo" ? "text-slate-300" : stateKey === "active" ? "text-amber-600" : "text-emerald-600"}`}
                                        >
                                          {stage.label}
                                        </span>
                                      </button>
                                      {idx < rowStages.length - 1 && (
                                        <div
                                          className={`mb-3.5 h-px w-3 shrink-0 ${row.flow[rowStages[idx + 1].key] === "todo" ? "bg-slate-200" : "bg-emerald-300"}`}
                                        />
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

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-[30px] border border-white/70 bg-white/90 p-5 shadow-sm shadow-slate-200/70 ring-1 ring-slate-200/60 backdrop-blur">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-amber-200 bg-amber-50">
                <Clock3 size={15} className="text-amber-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Pending & Approval
                </h3>
                <p className="text-[11px] text-slate-400">
                  Requires purchasing action allocation
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              {bottlenecks.map((b, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 rounded-2xl border ${b.border} ${b.bg} p-3`}
                >
                  <div
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-white ${b.border}`}
                  >
                    <span className={`text-sm font-bold ${b.color}`}>
                      {b.count}
                    </span>
                  </div>
                  <div>
                    <div className={`text-xs font-semibold ${b.color}`}>
                      {b.label}
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-400">
                      {b.detail}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[30px] border border-white/70 bg-white/90 p-5 shadow-sm shadow-slate-200/70 ring-1 ring-slate-200/60 backdrop-blur">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50">
                <CheckCircle2 size={12} className="text-emerald-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Fulfillment Progress
                </h3>
                <p className="text-[11px] text-slate-400">
                  Warehouse and Ledger pipeline audit
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              {completed.map((c, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 rounded-2xl border ${c.border} ${c.bg} p-3`}
                >
                  <div
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-white ${c.border}`}
                  >
                    <span className={`text-sm font-bold ${c.color}`}>
                      {c.count}
                    </span>
                  </div>
                  <div>
                    <div className={`text-xs font-semibold ${c.color}`}>
                      {c.label}
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-400">
                      {c.detail}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {drilldown && (
        <DrilldownModal
          row={drilldown.row}
          stageKey={drilldown.stageKey}
          stageList={stageList}
          onClose={() => setDrilldown(null)}
          onStage={(key) => setDrilldown({ row: drilldown.row, stageKey: key })}
          onViewDocument={(row, stageKey, selectedDocNo) => {
            handleViewDocument(row, stageKey, selectedDocNo);
          }}
        />
      )}

      {lookupOpen === "item" && (
        <MSLookupModal
          isOpen
          onClose={(s) => {
            setSelectedItem({
              code: s?.itemCode || s?.itemNo || "",
              name: s?.itemName || s?.itemDesc || "",
            });
            setLookupOpen(null);
          }}
        />
      )}
      {lookupOpen === "department" && (
        <RCLookupModal
          isOpen
          title="Select Department"
          onClose={(s) => {
            setSelectedDepartment({
              code: s?.rcCode || "",
              name: s?.rcName || "",
            });
            setLookupOpen(null);
          }}
        />
      )}
    </div>
  );
}
