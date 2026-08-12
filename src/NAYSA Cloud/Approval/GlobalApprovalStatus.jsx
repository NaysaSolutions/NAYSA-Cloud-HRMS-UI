import React, { useMemo, useState } from "react";
import {
  Check,
  CheckCircle2,
  Clock3,
  FileText,
  Info,
  User,
  X,
  XCircle,
} from "lucide-react";

const EMPTY_DATA = {};

const valueOrDash = (value) => {
  const text = String(value ?? "").trim();
  return text || "-";
};

const normalizeStatus = (status) => String(status || "").trim().toLowerCase();

const formatDocLabel = (docType) => {
  const type = String(docType || "Document").trim();
  return type || "Document";
};

const formatDateTime = (value) => {
  if (!value) return "-";

  const rawValue = String(value).trim();
  if (!rawValue) return "-";

  const date = new Date(rawValue);
  if (Number.isNaN(date.getTime())) return rawValue;

  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const getDataValue = (data, key) =>
  data?.[key] ?? data?.[key.toUpperCase()] ?? data?.[key.toLowerCase()] ?? "";

const ExpandableText = ({ value, limit = 90, className = "" }) => {
  const [expanded, setExpanded] = useState(false);
  const text = valueOrDash(value);
  const shouldTruncate = text !== "-" && text.length > limit;
  const displayText =
    shouldTruncate && !expanded ? `${text.slice(0, limit).trim()}...` : text;

  return (
    <p className={className}>
      {displayText}
      {shouldTruncate && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="ml-1 font-semibold text-sky-600 hover:text-sky-700"
        >
          {expanded ? "See less" : "See more"}
        </button>
      )}
    </p>
  );
};

const buildApprovalLevels = (data) =>
  [1, 2, 3, 4].map((level) => {
    const approvedDate = getDataValue(data, `app_date${level}`);
    const comment = getDataValue(data, `app_note${level}`);
    const approverName = getDataValue(data, `user_app${level}`);
    const isApproved = Boolean(String(approvedDate || "").trim());

    return {
      level,
      approverName,
      approvedDate,
      comment,
      isApproved,
    };
  });

const normalizeMaxAppLevel = (value) => {
  const level = Number(value);
  if (!Number.isFinite(level) || level <= 0) return 4;
  return Math.min(Math.max(Math.trunc(level), 1), 4);
};

const getStatusStyle = (status) => {
  const normalized = normalizeStatus(status);

  if (normalized.includes("disapprove") || normalized.includes("reject")) {
    return {
      wrapper: "border-red-200 bg-red-50 text-red-700",
      icon: XCircle,
    };
  }

  if (normalized.includes("approve")) {
    return {
      wrapper: "border-emerald-200 bg-emerald-50 text-emerald-700",
      icon: CheckCircle2,
    };
  }

  return {
    wrapper: "border-slate-200 bg-slate-100 text-slate-700",
    icon: Clock3,
  };
};

const ApprovalStatusBadge = ({ status }) => {
  const statusStyle = getStatusStyle(status);
  const StatusIcon = statusStyle.icon;

  return (
    <span
      className={`inline-flex min-h-6 max-w-full min-w-0 items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase leading-tight tracking-normal md:whitespace-nowrap ${statusStyle.wrapper}`}
    >
      <StatusIcon size={13} strokeWidth={2.2} className="shrink-0" />
      <span className="min-w-0 break-words">{valueOrDash(status)}</span>
    </span>
  );
};

const TimelineIcon = ({ isApproved }) => (
  <div
    className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-sm sm:h-9 sm:w-9 ${
      isApproved
        ? "bg-emerald-500 text-white"
        : "bg-slate-100 text-slate-500 ring-1 ring-slate-200"
    }`}
  >
    {isApproved ? <Check size={17} strokeWidth={2.4} /> : <User size={16} />}
  </div>
);

const ApprovalLevelCard = ({ approval, isLast }) => {
  const isApproved = approval.isApproved;

  return (
    <div className="relative grid grid-cols-[38px_minmax(0,1fr)] gap-2.5 sm:grid-cols-[46px_minmax(0,1fr)]">
      {!isLast && (
        <div
          className={`absolute left-4 top-8 h-[calc(100%+10px)] w-0.5 sm:left-[18px] sm:top-9 ${
            isApproved ? "bg-emerald-200" : "bg-slate-200"
          }`}
        />
      )}

      <TimelineIcon isApproved={isApproved} />

      <div
        className={`min-w-0 rounded-lg border p-2.5 sm:p-3 ${
          isApproved
            ? "border-emerald-200 bg-emerald-50/70"
            : "border-slate-200 bg-white"
        }`}
      >
        <div className="grid min-w-0 gap-2.5 md:grid-cols-[118px_125px_130px_minmax(0,1fr)_104px] md:items-start">
          <div className="min-w-0">
            <p
              className={`text-[11px] font-bold uppercase tracking-normal ${
                isApproved ? "text-emerald-700" : "text-slate-500"
              }`}
            >
              Level {approval.level}
            </p>
            <p className="mt-0.5 text-[12px] font-medium leading-5 text-slate-900">
              {isApproved ? "Completed" : "For Approval"}
            </p>
          </div>

          <div className="min-w-0">
            <p className="text-[11px] font-bold text-slate-600">
              {isApproved ? "Approved By" : "Approver"}
            </p>
            <p className="mt-0.5 break-words text-[12px] font-semibold leading-5 text-slate-950">
              {valueOrDash(approval.approverName)}
            </p>
          </div>

          <div className="min-w-0">
            <p className="text-[11px] font-bold text-slate-600">
              {isApproved ? "Date Approved" : "Date"}
            </p>
            <p className="mt-0.5 text-[12px] leading-5 text-slate-900">
              {formatDateTime(approval.approvedDate)}
            </p>
          </div>

          <div className="min-w-0">
            <p className="text-[11px] font-bold text-slate-600">Comment</p>
            <ExpandableText
              value={approval.comment}
              className="mt-0.5 whitespace-pre-wrap break-words text-[12px] leading-5 text-slate-900"
            />
          </div>

          <div className="min-w-0 md:pt-6">
            <span
              className={`inline-flex min-h-6 max-w-full min-w-0 items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase md:whitespace-nowrap ${
                isApproved
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {isApproved ? (
                <CheckCircle2 size={13} />
              ) : (
                <Clock3 size={13} />
              )}
              <span className="min-w-0 break-words md:break-normal">
                {isApproved ? "Approved" : "Pending"}
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const GlobalApprovalStatus = ({
  isOpen,
  onClose,
  docType = "PR",
  docNo = "00000001",
  docDate = "05/06/2026",
  status = "Approved",
  remarks = "",
  maxAppLevel = 4,
  data = EMPTY_DATA,
  closeOnBackdrop = true,
}) => {
  const documentLabel = formatDocLabel(docType);
  const approvalLevels = useMemo(
    () => buildApprovalLevels(data || EMPTY_DATA).slice(0, normalizeMaxAppLevel(maxAppLevel)),
    [data, maxAppLevel],
  );

  if (!isOpen) return null;

  const handleBackdropClick = () => {
    if (closeOnBackdrop) onClose?.();
  };

  return (
    <div
      className="fixed inset-0 z-[10040] flex items-center justify-center bg-slate-950/55 p-2 sm:p-4"
      onMouseDown={handleBackdropClick}
      role="presentation"
    >
      <section
        className="flex max-h-[calc(100dvh-8px)] w-full max-w-[1060px] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl sm:max-h-[92vh] sm:rounded-xl"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="global-approval-status-title"
      >
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-100 px-3 py-1.5 sm:px-4">
          <div className="min-w-0">
            <h2
              id="global-approval-status-title"
              className="global-lookup-headertext-ui truncate !text-[14px] !font-black !tracking-normal text-slate-950 sm:!text-[17px]"
            >
              {documentLabel} Approval Status
            </h2>
            <p className="hidden text-[10px] font-medium text-slate-500 sm:block">
              Approval tracking for the selected transaction.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white hover:text-rose-600"
            aria-label="Close approval status"
            title="Close"
          >
            <X size={16} />
          </button>
        </header>

        <div className="min-h-0 overflow-y-auto overflow-x-hidden bg-slate-50 px-2.5 py-2.5 sm:px-3 sm:py-3">
          <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm sm:p-3">
            <div className="grid min-w-0 gap-2.5 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(170px,1fr)]">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-slate-500">
                  Document No.
                </p>
                <p className="mt-0.5 break-words text-[12px] font-bold leading-5 text-slate-950">
                  {valueOrDash(docNo)}
                </p>
              </div>

              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-slate-500">
                  Document Type
                </p>
                <p className="mt-0.5 text-[12px] font-bold leading-5 text-slate-950">
                  {documentLabel}
                </p>
              </div>

              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-slate-500">
                  Document Date
                </p>
                <p className="mt-0.5 text-[12px] font-bold leading-5 text-slate-950">
                  {valueOrDash(docDate)}
                </p>
              </div>

              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-slate-500">
                  Current Status
                </p>
                <div className="mt-0.5">
                  <ApprovalStatusBadge status={status} />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-2.5 rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm sm:p-3">
            <div className="space-y-2.5">
              <div className="grid grid-cols-[38px_minmax(0,1fr)] gap-2.5 sm:grid-cols-[46px_minmax(0,1fr)]">
                <div className="relative">
                  <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-sky-500 text-white shadow-sm sm:h-9 sm:w-9">
                    <FileText size={16} />
                  </div>
                  <div className="absolute left-4 top-8 h-[calc(100%+10px)] w-0.5 bg-sky-100 sm:left-[18px] sm:top-9" />
                </div>

                <div className="rounded-lg border border-sky-100 bg-sky-50/60 p-2.5 sm:p-3">
                  <div className="grid min-w-0 gap-2.5 md:grid-cols-[220px_150px_135px_minmax(0,1fr)]">
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-normal text-sky-700">
                        Prepared
                      </p>
                      <p className="mt-0.5 text-[12px] font-medium leading-5 text-slate-900">
                        Document was prepared
                      </p>
                    </div>

                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-slate-600">
                        Document No.
                      </p>
                      <p className="mt-0.5 break-words text-[12px] font-semibold leading-5 text-slate-950">
                        {valueOrDash(docNo)}
                      </p>
                    </div>

                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-slate-600">Date</p>
                      <p className="mt-0.5 text-[12px] leading-5 text-slate-900">
                        {valueOrDash(docDate)}
                      </p>
                    </div>

                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-slate-600">
                        Remarks
                      </p>
                      <ExpandableText
                        value={remarks}
                        className="mt-0.5 whitespace-pre-wrap break-words text-[12px] leading-5 text-slate-900"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {approvalLevels.map((approval, index) => (
                <ApprovalLevelCard
                  key={approval.level}
                  approval={approval}
                  isLast={index === approvalLevels.length - 1}
                />
              ))}
            </div>

            <div className="mt-3 flex items-start gap-2 text-[11px] leading-5 text-slate-600">
              <Info size={14} className="mt-0.5 shrink-0" />
              <p className="min-w-0">
                The approval process will continue until the final approval
                level is completed.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default GlobalApprovalStatus;
