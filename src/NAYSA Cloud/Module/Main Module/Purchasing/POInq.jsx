import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Filter,
  FileText,
  ShoppingCart,
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
import PayeeMastLookupModal from "../../../Lookup/SearchVendMast";
import RCLookupModal from "../../../Lookup/SearchRCMast.jsx";
import MSLookupModal from "../../../Lookup/SearchMSMast.jsx";


// ── static stage field labels only ───────────────────────────────────────────
const stageDetails = {
  pr: {
    fields: [
      { label: "PO Number", key: "prNo" },
      { label: "PO Date", key: "prDate" },
      { label: "Prepared By", key: "requestor" },
      { label: "Responsibility Center", key: "department" },
      { label: "Remarks", key: "remarks" },
    ],
  },
  po: {
    fields: [
      { label: "Supplier", key: "supplier" },
      { label: "Amount", key: "amount" },
    ],
  },
  rr: {
    fields: [{ label: "Supplier", key: "supplier" }],
  },
  apv: {
    fields: [{ label: "Supplier", key: "supplier" }],
  },
  cv: {
    fields: [{ label: "Supplier", key: "supplier" }],
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

const joinCodeName = (code, name) =>
  [code, name].filter(Boolean).join(" - ");

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

const parseJsonValue = (value) => {
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const extractResultArray = (response) => {
  const candidates = [
    response?.data?.data,
    response?.data,
    response,
  ];

  for (const candidate of candidates) {
    const payload = parseJsonValue(candidate);
    const firstRow = Array.isArray(payload) ? payload[0] : payload;
    const resultPayload = parseJsonValue(firstRow?.result);
    const container = resultPayload || firstRow;

    if (Array.isArray(container?.dt1)) return container.dt1;
    if (Array.isArray(container?.[0]?.dt1)) return container[0].dt1;
  }

  return [];
};

const getFlowState = (row) => {
  const hasPO = !!row.poNo;
  const hasRR = !!row.rrNo;
  const hasAPV = !!row.apvNo;
  const hasCV = !!row.cvNo;

  return {
    pr: "done",
    po: hasPO ? "done" : "todo",
    rr: hasRR ? "done" : hasPO ? "active" : "todo",
    apv: hasAPV ? "done" : hasRR ? "active" : "todo",
    cv: hasCV ? "done" : hasAPV ? "active" : "todo",
  };
};

const getCurrentStatus = (flow, row = {}) => {
  // ── 1. ADD THIS CHECK FOR CANCELLED STATUS ──
  if (
    row.poStatus === "X" ||
    String(row.poStatusDesc).toUpperCase() === "CANCELLED"
  ) {
    return "Cancelled";
  }

  const rrQty = Number(row.rrQty || row.totalRRQty || 0);
  const poQty = Number(row.poQuantity || row.totalPOQty || row.qty || 0);

  if (flow.cv === "done") return "Completed";
  if (flow.apv === "active") return "For APV";

  // Has RR but not yet APV
  if (flow.rr === "done" && flow.apv !== "done") {
    if (poQty > 0 && rrQty > 0 && rrQty < poQty) return "Partial RR";
    return "For APV";
  }

  // Has PO but no RR yet
  if (flow.rr === "active") return "For RR";

  if (flow.po === "active") return "For PO Approval";
  return "Draft PR";
};

const getProgress = (flow) => {
  const steps = ["pr", "po", "rr", "apv", "cv"];
  const doneCount = steps.filter((key) => flow[key] === "done").length;
  return Math.round((doneCount / steps.length) * 100);
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

const aggregatePOInqRows = (rows) => {
  const groups = new Map();

  rows.forEach((item) => {
    const poNo = item.poNo || item.po_no || "";
    const poDate = item.poDate || item.po_date || "";
    const vendName = item.vendName || item.vend_name || "";
    const vendCode = item.vendCode || item.vend_code || "";
    const branchCode = item.branchCode || item.branchcode || item.branch_code || "";
    const branchName = item.branchName || item.branch_name || item.branchDesc || item.branch_desc || "";
    const rcCode = item.rcCode || item.rc_code || "";
    const rcName =
      item.rcName || item.rc_name || item.rcDesc || item.rc_desc || "";
    const preparedBy =
      item.preparedBy ||
      item.prepared_by ||
      item.userCode ||
      item.user_code ||
      "";
    const remarks = item.remarks || item.specs || item.item_specs || "";
    const poStatus = item.poStatus || item.po_status || "";
    const poStatusDesc =
      item.poStatusDesc || item.po_stat_desc || poStatus || "";
    const delDate = item.delDate || item.del_date || "";

    const itemCode = item.itemCode || item.item_no || item.item_code || "";
    const itemName = item.itemName || item.item_desc || item.item_name || "";
    const uomCode = item.uomCode || item.uom_code || "";
    const qty = item.poQuantity ?? item.qty_order ?? item.po_quantity ?? 0;
    const rrQty = item.rrQty ?? item.rr_qty ?? 0;
    const unitCost = item.unitCost ?? item.unit_price ?? item.unit_cost ?? 0;
    const grossAmount =
      item.grossAmount ?? item.gross_amt ?? item.gross_amount ?? 0;
    const vatAmount = item.vatAmount ?? item.vat_amt ?? item.vat_amount ?? 0;
    const discAmount =
      item.discAmount ?? item.disc_amt ?? item.disc_amount ?? 0;
    const netAmount = item.netAmount ?? item.net_amt ?? item.net_amount ?? 0;

    const rrNos = splitDocs(item.rrNo || item.rr_no);
    const apvNos = splitDocs(item.apvNo || item.apv_no);
    const cvNos = splitDocs(item.cvNo || item.cv_no);

    const groupKey = `${branchCode}-${poNo}`;

    

    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        header: {
          poNo,
          poDate,
          poStatus,
          poStatusDesc,
          vendName,
          vendCode,
          branchCode,
          branchName,
          rcCode,
          rcName,
          preparedBy,
          remarks,
          delDate,
        },
        detailLines: [],
        rrNos: [],
        apvNos: [],
        cvNos: [],
        totalNetAmount: 0,
        totalGrossAmount: 0,
        totalVatAmount: 0,
        totalDiscAmount: 0,
        totalRRQty: 0,
      });
    }

    const group = groups.get(groupKey);

    group.detailLines.push({
      itemCode,
      itemName,
      uomCode,
      qty,
      rrQty,
      unitCost,
      grossAmount,
      vatAmount,
      discAmount,
      netAmount,
      remarks: remarks || "",
    });

    group.rrNos.push(...rrNos);
    group.apvNos.push(...apvNos);
    group.cvNos.push(...cvNos);

    group.totalNetAmount += Number(netAmount || 0);
    group.totalGrossAmount += Number(grossAmount || 0);
    group.totalVatAmount += Number(vatAmount || 0);
    group.totalDiscAmount += Number(discAmount || 0);
    group.totalRRQty += Number(rrQty || 0);
  });

  return Array.from(groups.values()).map((group) => {
    const {
      poNo,
      poDate,
      poStatus,
      poStatusDesc,
      vendName,
      vendCode,
      branchCode,
      branchName,
      rcCode,
      rcName,
      preparedBy,
      remarks,
      delDate,
    } = group.header;

    const rrNos = [...new Set(group.rrNos)];
    const apvNos = [...new Set(group.apvNos)];
    const cvNos = [...new Set(group.cvNos)];

    const uniqueDetailLines = uniqueBy(group.detailLines, (line) =>
      [
        line.itemCode || "",
        line.itemName || "",
        line.uomCode || "",
        Number(line.qty || 0),
        Number(line.unitCost || 0),
        Number(line.netAmount || 0),
      ].join("|"),
    );

    const poDocs = poNo
      ? [
          {
            "PO Number": poNo,
            "PO Date": formatDateDisplay(poDate),
            Supplier: vendName,
            Amount: formatAmount(group.totalNetAmount),
            Status: poStatusDesc,
            Items: uniqueDetailLines.length,
            Details: uniqueDetailLines.map((line) => ({
              "Item Code": line.itemCode,
              "Item Name": line.itemName,
              UOM: line.uomCode,
              Qty: line.qty,
              "Unit Cost": formatAmount(line.unitCost),
              "Gross Amount": formatAmount(line.grossAmount),
              "VAT Amount": formatAmount(line.vatAmount),
              "Disc Amount": formatAmount(line.discAmount),
              "Net Amount": formatAmount(line.netAmount),
              Remarks: line.remarks || "—",
            })),
          },
        ]
      : [];

    const rrDocs = rrNos.map((rr) => ({
      "RR Number": rr,
      "Ref PO": poNo,
      Date: formatDateDisplay(delDate || poDate),
      Supplier: vendName,
      Qty: group.totalRRQty,
      Items: uniqueDetailLines.length,
      Details: uniqueDetailLines.map((line) => ({
        "Item Code": line.itemCode,
        "Item Name": line.itemName,
        UOM: line.uomCode,
        Qty: line.rrQty,
      })),
    }));

    const apvDocs = apvNos.map((apv) => ({
      "APV Number": apv,
      Supplier: vendName,
      "Gross Amt": formatAmount(group.totalGrossAmount),
      "VAT Amount": formatAmount(group.totalVatAmount),
      "Disc Amount": formatAmount(group.totalDiscAmount),
      "Net Payable": formatAmount(group.totalNetAmount),
      Items: uniqueDetailLines.length,
    }));

    const cvDocs = cvNos.map((cv) => ({
      "CV Number": cv,
      "Ref APV": apvNos[0] || "",
      Supplier: vendName,
      Amount: formatAmount(group.totalNetAmount),
      Items: uniqueDetailLines.length,
    }));

    const flow = getFlowState({
      poNo,
      rrNo: rrNos.join("\n"),
      apvNo: apvNos.join("\n"),
      cvNo: cvNos.join("\n"),
    });

    return {
      id: `${branchCode}-${poNo}`,
      prNo: poNo,
      prDate: formatDateDisplay(poDate),
      supplier: vendName,
      supplierCode: vendCode,
      supplierDisplay: joinCodeName(vendCode, vendName) || vendName,
      branch: branchCode,
      branchCode: branchCode,
      branchName: branchName,
      branchDisplay: joinCodeName(branchCode, branchName) || branchCode,
      department: rcCode,
      departmentName: rcName,
      departmentDisplay: joinCodeName(rcCode, rcName) || rcCode,
      amount: formatAmount(group.totalNetAmount),
      requestor: preparedBy || "—",
      currentStatus: getCurrentStatus(flow, {
  rrQty: group.totalRRQty,
  totalRRQty: group.totalRRQty,
  totalPOQty: uniqueDetailLines.reduce(
    (sum, line) => sum + Number(line.qty || 0),
    0,
  ),
  poStatus,
  poStatusDesc,
}),
      aging: "0 day",
      agingDays: 0,
      remarks: remarks || "",
      progress: getProgress(flow),
      flow,
      counts: {
        po: poDocs.length,
        rr: rrDocs.length,
        apv: apvDocs.length,
        cv: cvDocs.length,
      },
      stageDocs: {
        pr: [],
        po: poDocs,
        rr: rrDocs,
        apv: apvDocs,
        cv: cvDocs,
      },
      detailLines: uniqueDetailLines,
      itemCode: uniqueDetailLines[0]?.itemCode || "",
      itemName: uniqueDetailLines[0]?.itemName || "",
      itemDisplay:
        joinCodeName(
          uniqueDetailLines[0]?.itemCode || "",
          uniqueDetailLines[0]?.itemName || "",
        ) ||
        uniqueDetailLines[0]?.itemCode ||
        "",
      uomCode: uniqueDetailLines[0]?.uomCode || "",
      rrNo: rrNos.join("\n"),
      apvNo: apvNos.join("\n"),
      cvNo: cvNos.join("\n"),
    };
  });
};

const mapPOInqRow = (item) => {
  const poNo = item.poNo || item.po_no || "";
  const poDate = item.poDate || item.po_date || "";
  const poStatus = item.poStatus || item.po_status || "";
  const poStatusDesc = item.poStatusDesc || item.po_stat_desc || poStatus || "";
  const vendName = item.vendName || item.vend_name || "";
  const vendCode = item.vendCode || item.vend_code || "";
  const branchCode = item.branchCode || item.branchcode || item.branch_code || "";
  const branchName = item.branchName || item.branch_name || item.branchDesc || item.branch_desc || "";
  const rcCode = item.rcCode || item.rc_code || "";
  const rcName = item.rcName || item.rc_name || item.rcDesc || item.rc_desc || "";
  const itemCode = item.itemCode || item.item_no || item.item_code || "";
  const itemName = item.itemName || item.item_desc || item.item_name || "";
  const uomCode = item.uomCode || item.uom_code || "";
  const qty = item.poQuantity ?? item.qty_order ?? item.po_quantity ?? 0;
  const rrQty = item.rrQty ?? item.rr_qty ?? 0;
  const grossAmount =
    item.grossAmount ?? item.gross_amt ?? item.gross_amount ?? 0;
  const vatAmount = item.vatAmount ?? item.vat_amt ?? item.vat_amount ?? 0;
  const discAmount = item.discAmount ?? item.disc_amt ?? item.disc_amount ?? 0;
  const netAmount = item.netAmount ?? item.net_amt ?? item.net_amount ?? 0;
  const unitCost = item.unitCost ?? item.unit_price ?? item.unit_cost ?? 0;
  const preparedBy =
    item.preparedBy ||
    item.prepared_by ||
    item.userCode ||
    item.user_code ||
    "";
  const remarks = item.remarks || "";
  const delDate = item.delDate || item.del_date || "";
  const rrNos = splitDocs(item.rrNo || item.rr_no);
  const apvNos = splitDocs(item.apvNo || item.apv_no);
  const cvNos = splitDocs(item.cvNo || item.cv_no);

  const poDocs = poNo
    ? [
        {
          "PO Number": poNo,
          "PO Date": formatDateDisplay(poDate),
          Supplier: vendName,
          Amount: formatAmount(netAmount),
          Status: poStatusDesc,
        },
      ]
    : [];

  const rrDocs = rrNos.map((rr) => ({
    "RR Number": rr,
    "Ref PO": poNo,
    Date: formatDateDisplay(delDate || poDate),
    Supplier: vendName,
    Qty: rrQty,
  }));

  const apvDocs = apvNos.map((apv) => ({
    "APV Number": apv,
    Supplier: vendName,
    "Gross Amt": formatAmount(grossAmount),
    "VAT Amount": formatAmount(vatAmount),
    "Disc Amount": formatAmount(discAmount),
    "Net Payable": formatAmount(netAmount),
  }));

  const cvDocs = cvNos.map((cv) => ({
    "CV Number": cv,
    "Ref APV": apvNos[0] || "",
    Supplier: vendName,
    Amount: formatAmount(netAmount),
  }));

  const flow = getFlowState({
    poNo,
    rrNo: rrNos.join("\n"),
    apvNo: apvNos.join("\n"),
    cvNo: cvNos.join("\n"),
  });

  return {
    id: `${branchCode}-${poNo}-${itemCode}-${uomCode}`,
    prNo: poNo,
    prDate: formatDateDisplay(poDate),
    supplier: vendName,
    supplierCode: vendCode,
    supplierDisplay: joinCodeName(vendCode, vendName) || vendName,
    branch: branchCode,
    branchName: branchName,
    branchDisplay: joinCodeName(branchCode, branchName) || branchCode,
    department: rcCode,
    departmentName: rcName,
    departmentDisplay: joinCodeName(rcCode, rcName) || rcCode,
    amount: formatAmount(netAmount),
    requestor: preparedBy || "—",
    currentStatus: getCurrentStatus(flow, {
  rrQty,
  poQuantity: qty,
  poStatus,
  poStatusDesc,
}),
    aging: "0 day",
    agingDays: 0,
    remarks: remarks || "",
    progress: getProgress(flow),
    flow,
    counts: {
      po: poDocs.length,
      rr: rrDocs.length,
      apv: apvDocs.length,
      cv: cvDocs.length,
    },
    stageDocs: {
      pr: [],
      po: poDocs,
      rr: rrDocs,
      apv: apvDocs,
      cv: cvDocs,
    },
    poNo,
    poDate: formatDateDisplay(poDate),
    poStatus,
    poStatusDesc,
    rcCode,
    itemCode,
    itemName,
    itemDisplay: joinCodeName(itemCode, itemName) || itemCode,
    uomCode,
    poQuantity: qty,
    rrQty,
    unitCost,
    grossAmount,
    vatAmount,
    discAmount,
    netAmount,
    rrNo: rrNos.join("\n"),
    apvNo: apvNos.join("\n"),
    cvNo: cvNos.join("\n"),
  };
};

// ── DrilldownModal ───────────────────────────────────────────────────────────
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
                          {doc["PO Number"] ||
                            doc["RR Number"] ||
                            doc["APV Number"] ||
                            doc["CV Number"] ||
                            "—"}
                        </span>
                      </div>
                    )}

                    <div className="divide-y divide-slate-100">
                      {Object.entries(doc).map(([label, value]) => {
                        if (
                          extraDocs.length > 1 &&
                          [
                            "PO Number",
                            "RR Number",
                            "APV Number",
                            "CV Number",
                          ].includes(label)
                        ) {
                          return null;
                        }

                        if (label === "Details") {
                          return null;
                        }

                        const isAdjustment =
                          label.includes("APCM") || label.includes("APDM");
                        const isNet = label.includes("Net Payable");

                        const isPoNumberRow = label === "PO Number";

                        return (
                          <div
                            key={label}
                            className={`flex items-center justify-between px-4 py-2.5 ${
                              isNet ? "bg-slate-50/50" : ""
                            }`}
                          >
                            <span
                              className={`text-xs ${
                                isAdjustment
                                  ? "font-medium text-amber-600"
                                  : "text-slate-500"
                              }`}
                            >
                              {label}
                            </span>

                            <div className="flex items-center gap-2">
                              <span
                                className={`text-xs ${
                                  value === "—" || value === "Pending"
                                    ? "text-slate-400"
                                    : isNet
                                      ? "text-[13px] font-bold text-slate-900"
                                      : "font-semibold text-slate-800"
                                }`}
                              >
                                {value || "—"}
                              </span>

                              {isPoNumberRow && (
                                <button
                                  type="button"
                                  title="View Document"
                                  onClick={() =>
                                    onViewDocument?.(
                                      row,
                                      stageKey,
                                      String(value || ""),
                                    )
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

// ── Main component ───────────────────────────────────────────────────────────
export default function POInq() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [branchFilter, setBranchFilter] = useState("All");
  const getToday = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

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
  const [allBranchOptions, setAllBranchOptions] = useState([
    { value: "All", label: "All" },
  ]);
  const [selectedItem, setSelectedItem] = useState({ code: "", name: "" });
  const [selectedDepartment, setSelectedDepartment] = useState({
    code: "",
    name: "",
  });
  const [selectedPayee, setSelectedPayee] = useState({ code: "", name: "" });
  const [lookupOpen, setLookupOpen] = useState(null);

  const navigate = useNavigate();

  const handleViewPODocument = (row, selectedPoNo = "") => {
    const poNo = selectedPoNo || row?.poNo || row?.prNo || "";
    const branchCode = row?.branchCode || "";

    if (!poNo || !branchCode) return;

    navigate(
      `/page/PO?poNo=${encodeURIComponent(poNo)}&branchCode=${encodeURIComponent(branchCode)}&viewOnly=Y`,
    );
  };

  const stageList = [
    { key: "po", label: "PO", name: "Purchase Order", icon: ShoppingCart },
    { key: "rr", label: "RR", name: "Receiving Report", icon: PackageCheck },
    {
      key: "apv",
      label: "APV",
      name: "Accounts Payable Voucher",
      icon: Receipt,
    },
    { key: "cv", label: "CV", name: "Check Voucher", icon: Wallet },
  ];

  const fetchPOInquiry = async (selectedBranch = branchFilter) => {
    setLoading(true);

    try {
      const response = await fetchData("getPOInquiry", {
        json_data: {
          branchCode: selectedBranch === "All" ? "" : selectedBranch,
          itemCode: selectedItem.code,
          poStatus: "",
          startingDate: fromDate,
          endingDate: toDate,
          startingCutoff: fromDate ? fromDate.slice(0, 7).replace("-", "") : "",
          endingCutoff: toDate ? toDate.slice(0, 7).replace("-", "") : "",
          rcCode: selectedDepartment.code,
          vendCode: selectedPayee.code,
          invType: "",
        },
      });

      if (response?.success === false || response?.data?.success === false) {
        throw new Error(
          response?.message ||
            response?.data?.message ||
            "Unable to retrieve PO Inquiry records.",
        );
      }

      const parsedRows = extractResultArray(response);
      const aggregated = aggregatePOInqRows(parsedRows);
      setData(aggregated);

      if (selectedBranch === "All") {
        const seenBranchCodes = new Set();
        const options = aggregated.reduce(
          (list, row) => {
            if (!row.branchCode || seenBranchCodes.has(row.branchCode)) return list;
            seenBranchCodes.add(row.branchCode);
            list.push({ value: row.branchCode, label: row.branchDisplay || bCode });
            return list;
          },
          [{ value: "All", label: "All" }],

        );
        setAllBranchOptions(options);
      }
    } catch (error) {
      console.error("Error fetching PO inquiry:", error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPOInquiry();
  }, [
    branchFilter,
    fromDate,
    selectedDepartment.code,
    selectedItem.code,
    selectedPayee.code,
    toDate,
  ]);

  const handleCloseItemLookup = (selected) => {
    if (selected) {
      setSelectedItem({
        code: selected.itemCode || selected.itemNo || "",
        name: selected.itemName || selected.itemDesc || "",
      });
    }
    setLookupOpen(null);
  };

  const handleCloseDepartmentLookup = (selected) => {
    if (selected) {
      setSelectedDepartment({
        code: selected.rcCode || "",
        name: selected.rcName || "",
      });
    }
    setLookupOpen(null);
  };

  const handleClosePayeeLookup = (selected) => {
    if (selected) {
      setSelectedPayee({
        code: selected.vendCode || "",
        name: selected.vendName || "",
      });
    }
    setLookupOpen(null);
  };

  const summary = useMemo(() => {
    const total = data.length;
    const activePO = data.filter(
      (row) =>
        row.currentStatus === "For PO Approval" ||
        row.currentStatus === "Partial RR",
    ).length;
    const forAPV = data.filter((row) => row.currentStatus === "For APV").length;
    const completedCV = data.filter(
      (row) => row.currentStatus === "Completed",
    ).length;

    return [
      {
        title: "Total PO",
        value: `${total}`,
        sub: "Loaded from inquiry",
        icon: FileText,
        color: "text-blue-600",
        bg: "bg-blue-50",
        border: "border-blue-100",
        trend: "Live data",
        trendUp: true,
      },
      {
        title: "Active PO",
        value: `${activePO}`,
        sub: "Ongoing purchases",
        icon: ShoppingCart,
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

  const filteredData = useMemo(() => {
    return data.filter((row) => {
      const matchesSearch = [
        row.prNo,
        row.supplier,
        row.supplierCode,
        row.supplierDisplay,
        row.branch,
        row.department,
        row.departmentName,
        row.departmentDisplay,
        row.requestor,
        row.currentStatus,
        row.itemCode,
        row.itemName,
        row.itemDisplay,
      ]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "All" || row.currentStatus === statusFilter;
      const matchesBranch =
        branchFilter === "All" || (row.branchCode || row.branch) === branchFilter;

      return matchesSearch && matchesStatus && matchesBranch;
    });
  }, [data, search, statusFilter, branchFilter]);

  const branchOptions = allBranchOptions;
  const selectedBranchLabel =
    branchOptions.find((option) => option.value === branchFilter)?.label ||
    branchFilter;

  const exportToExcel = () => {
    const headers = [
      "PO No",
      "PO Date",
      "Branch",
      "Supplier",
      "RC Code",
      "Item Code",
      "Item Name",
      "UOM",
      "Amount",
      "Status",
      "RR No",
      "APV No",
      "CV No",
      "Remarks",
    ];

    const escapeCell = (value) => {
      const cell = `${value ?? ""}`.replace(/"/g, '""');
      return `"${cell}"`;
    };

    const rows = filteredData.map((row) => [
      row.prNo,
      row.prDate,
      row.branchDisplay || row.branch,
      row.supplier,
      row.departmentDisplay || row.department,
      row.itemCode,
      row.itemName,
      row.uomCode,
      row.amount,
      row.currentStatus,
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
    link.download = `po-inquiry-${new Date().toISOString().slice(0, 10)}.csv`;
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
    "Partial RR": {
      cls: "bg-sky-100 text-sky-700 border border-sky-200",
      dot: "bg-sky-500",
    },
    "For PO Approval": {
      cls: "bg-amber-100 text-amber-700 border border-amber-200",
      dot: "bg-amber-500",
    },
    "Draft PR": {
      cls: "bg-slate-100 text-slate-600 border border-slate-200",
      dot: "bg-slate-400",
    },
    "For RR": {
  cls: "bg-sky-100 text-sky-700 border border-sky-200",
  dot: "bg-sky-500",
},
  };

  const agingConfig = (d) =>
    d === 0
      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
      : d <= 2
        ? "bg-amber-50 text-amber-700 border border-amber-200"
        : "bg-red-50 text-red-700 border border-red-200";

  const agingIcon = (d) =>
    d === 0 ? (
      <CheckCircle2 size={12} />
    ) : d <= 2 ? (
      <Clock3 size={12} />
    ) : (
      <AlertCircle size={12} />
    );

  const progressColor = (p) =>
    p === 100
      ? "bg-emerald-500"
      : p >= 60
        ? "bg-blue-500"
        : p >= 30
          ? "bg-amber-500"
          : "bg-slate-400";

  const stageStepStyle = {
    done: { ring: "border-emerald-400 bg-emerald-500", text: "text-white" },
    active: { ring: "border-amber-400 bg-amber-500", text: "text-white" },
    todo: { ring: "border-slate-200 bg-white", text: "text-slate-300" },
  };

  const bottlenecks = useMemo(() => {
    const poApproval = data.filter(
      (x) => x.currentStatus === "For PO Approval",
    ).length;
    const partialRR = data.filter(
      (x) => x.currentStatus === "Partial RR",
    ).length;

    return [
      {
        count: poApproval,
        label: "pending PO approval",
        detail: "waiting next transaction stage",
        color: "text-amber-700",
        bg: "bg-amber-50",
        border: "border-amber-200",
      },
      {
        count: partialRR,
        label: "partial RR pending",
        detail: "awaiting APV or completion",
        color: "text-sky-700",
        bg: "bg-sky-50",
        border: "border-sky-200",
      },
    ];
  }, [data]);

  const completed = useMemo(() => {
    const completedCV = data.filter(
      (x) => x.currentStatus === "Completed",
    ).length;
    const forAPV = data.filter((x) => x.currentStatus === "For APV").length;

    return [
      {
        count: completedCV,
        label: "PO cycles completed",
        detail: "with CV released",
        color: "text-emerald-700",
        bg: "bg-emerald-50",
        border: "border-emerald-200",
      },
      {
        count: forAPV,
        label: "APV in process",
        detail: "for accounting posting",
        color: "text-emerald-700",
        bg: "bg-emerald-50",
        border: "border-emerald-200",
      },
    ];
  }, [data]);


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
                <Sparkles size={13} /> End-to-End Procurement Monitoring
              </div>
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                PO Tracker
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-blue-200">
                Monitor the full procurement lifecycle from PO to CV with clearer priorities, live filters, and document drilldown.
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
                      className={`mt-1 inline-flex items-center gap-1 text-[11px] font-medium ${
                        item.trendUp ? "text-emerald-600" : "text-amber-600"
                      }`}
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
                5-stage lifecycle per transaction
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
                  Transaction Monitor
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
                    <option>Completed</option>
                    <option>Cancelled</option>
                    <option>For APV</option>
                    <option>Partial RR</option>
                    <option>For RR</option>
                    <option>For PO Approval</option>
                    <option>Draft PR</option>
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
                      <option key={branch.value} value={branch.value}>
                        {branch.label}
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
                    title="Lookup item"
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
                    title="Lookup department"
                  >
                    <Search size={13} />
                  </button>
                </div>

                <div className="relative">
                  <Wallet
                    size={15}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    value={
                      joinCodeName(selectedPayee.code, selectedPayee.name) || ""
                    }
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

              <div className="relative">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search PO no, supplier, branch, item..."
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

              {statusFilter !== "All" && (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${statusConfig[statusFilter]?.cls}`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${statusConfig[statusFilter]?.dot}`}
                  />
                  {statusFilter}
                </span>
              )}

              {branchFilter !== "All" && (
                <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  {selectedBranchLabel}
                </span>
              )}

              {selectedItem.code && (
                <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700">
                  {joinCodeName(selectedItem.code, selectedItem.name)}
                </span>
              )}

              {selectedDepartment.code && (
                <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
                  {joinCodeName(
                    selectedDepartment.code,
                    selectedDepartment.name,
                  )}
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

        <section className="overflow-hidden rounded-[30px] border border-white/70 bg-white/95 shadow-sm shadow-slate-200/70 ring-1 ring-slate-200/60 backdrop-blur">
          <div className="overflow-x-auto">
            <div className="max-h-[520px] overflow-y-auto">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur">
                  <tr className="border-b border-slate-200 bg-slate-50/95">
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                      PO Details
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Supplier / Branch / RC
                    </th>
                    <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Amount
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Status
                    </th>
                    <th className="min-w-[260px] px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
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
                        colSpan={6}
                        className="px-5 py-10 text-center text-sm text-slate-400"
                      >
                        Loading records...
                      </td>
                    </tr>
                  ) : filteredData.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-5 py-10 text-center text-sm text-slate-400"
                      >
                        No records found.
                      </td>
                    </tr>
                  ) : (
                    filteredData.map((row) => {
                      const sc = statusConfig[row.currentStatus];

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

                          <td className="max-w-[200px] px-5 py-4">
                            <div className="text-[13px] font-medium leading-snug text-slate-800">
                              {row.supplierDisplay || row.supplier}
                            </div>
                            <div className="mt-0.5 inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                            {row.branchDisplay || row.branch} -{" "}
                            {row.departmentDisplay || row.department}
                            </div>
                          
                          </td>

                          <td className="px-5 py-4 text-right">
                            <div className="tabular-nums text-[15px] font-bold text-slate-900">
                              {row.amount}
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
                                        className={`text-[9px] font-bold ${
                                          stateKey === "todo"
                                            ? "text-slate-300"
                                            : stateKey === "active"
                                              ? "text-amber-600"
                                              : "text-emerald-600"
                                        }`}
                                      >
                                        {stage.label}
                                      </span>
                                    </button>

                                    {idx < stageList.length - 1 && (
                                      <div
                                        className={`mb-3.5 h-px w-3 shrink-0 ${
                                          row.flow[stageList[idx + 1].key] ===
                                          "todo"
                                            ? "bg-slate-200"
                                            : "bg-emerald-300"
                                        }`}
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
                  Pending
                </h3>
                <p className="text-[11px] text-slate-400">
                  Requires immediate attention
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
                <CheckCircle2 size={15} className="text-emerald-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Today's Completed
                </h3>
                <p className="text-[11px] text-slate-400">As of end of day</p>
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
          onViewDocument={(row, stageKey, selectedPoNo) => {
            if (stageKey !== "po") return;
            handleViewPODocument(row, selectedPoNo);
          }}
        />
      )}

      {lookupOpen === "item" && (
        <MSLookupModal isOpen onClose={handleCloseItemLookup} />
      )}

      {lookupOpen === "department" && (
        <RCLookupModal
          isOpen
          title="Select Department"
          onClose={handleCloseDepartmentLookup}
        />
      )}

      {lookupOpen === "payee" && (
        <PayeeMastLookupModal isOpen onClose={handleClosePayeeLookup} />
      )}
    </div>
  );
}
