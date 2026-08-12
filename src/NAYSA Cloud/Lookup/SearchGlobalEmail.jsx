import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCompress,
  faEnvelope,
  faExpand,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";

import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

const SearchGlobalEmail = ({
  isOpen,
  defaultSubject = "",
  defaultBody = "",
  isSending = false,
  onClose,
  onSend,
  title = "Email Report",
  subtitle = "PDF and Excel files will be generated and attached automatically.",
  attachmentNote = "Attachments will be created after clicking Send Email.",
}) => {
  const [emailTo, setEmailTo] = useState("");
  const [emailCc, setEmailCc] = useState("");
  const [emailSubject, setEmailSubject] = useState(defaultSubject);
  const [emailBody, setEmailBody] = useState(defaultBody);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setEmailTo("");
    setEmailCc("");
    setEmailSubject(defaultSubject);
    setEmailBody(defaultBody);
    setIsMaximized(false);
  }, [isOpen, defaultSubject, defaultBody]);

  if (!isOpen) return null;

  const handleSend = () => {
    onSend?.({
      to: emailTo,
      cc: emailCc,
      subject: emailSubject,
      body: emailBody,
    });
  };

  const handleClose = () => {
    if (isSending) return;
    setIsMaximized(false);
    onClose?.();
  };

  return (
    <div className={`fixed inset-0 z-[1000000] flex items-center justify-center bg-slate-950/55 backdrop-blur-[2px] ${isMaximized ? "p-0" : "p-4"}`}>
      <div
        className={`grid grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden bg-white shadow-2xl transition-all duration-200 ${
          isMaximized ? "h-screen w-screen rounded-none" : "max-h-[92vh] w-full max-w-4xl rounded-2xl border border-white/60"
        }`}
      >
        <div className="border-b border-slate-200 bg-slate-100 px-5 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-200 bg-white/70 text-blue-700">
                <FontAwesomeIcon icon={faEnvelope} className="text-base" />
              </span>

              <div className="min-w-0">
                <h2 className="global-lookup-headertext-ui truncate text-[19px]">{title}</h2>
                <p className="mt-0.5 max-w-2xl truncate text-[9px] font-medium text-slate-700 sm:text-xs">{subtitle}</p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
              type="button"
              onClick={() => setIsMaximized((prev) => !prev)}
              disabled={isSending}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
              title={isMaximized ? "Restore" : "Maximize"}
            >
              <FontAwesomeIcon icon={isMaximized ? faCompress : faExpand} />
            </button>

              <button
              type="button"
              onClick={handleClose}
              disabled={isSending}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
              title="Close"
            >
              <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
          </div>
        </div>

        <div className="min-h-0 overflow-auto bg-slate-50 px-5 py-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
            <div className="space-y-3">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3">
                  <h3 className="text-sm font-bold text-slate-900">Recipients</h3>
                  <p className="text-[11px] font-medium text-slate-500">Separate multiple emails using comma or semicolon.</p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-600">Send To</label>
                    <input
                      type="text"
                      value={emailTo}
                      onChange={(e) => setEmailTo(e.target.value)}
                      placeholder="email1@company.com; email2@company.com"
                      className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      disabled={isSending}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-600">CC</label>
                    <input
                      type="text"
                      value={emailCc}
                      onChange={(e) => setEmailCc(e.target.value)}
                      placeholder="Optional"
                      className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      disabled={isSending}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="mb-3 text-sm font-bold text-slate-900">Message</h3>

                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-600">Subject</label>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      disabled={isSending}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-600">Body</label>
                    <textarea
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      rows={isMaximized ? 17 : 10}
                      className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm leading-6 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      disabled={isSending}
                    />
                  </div>
                </div>
              </div>
            </div>

            <aside className="space-y-3">
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
                <div className="mb-2 flex items-center gap-2 text-blue-700">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm">
                    <FontAwesomeIcon icon={faEnvelope} />
                  </span>
                  <div className="text-sm font-extrabold">Email Package</div>
                </div>
                <p className="text-xs font-medium leading-5 text-blue-800">{attachmentNote}</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">Attachments</div>

                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <span className="text-xs font-semibold text-slate-700">PDF Report</span>
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">Auto</span>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <span className="text-xs font-semibold text-slate-700">Excel Report</span>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Auto</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 text-[11px] leading-5 text-slate-500 shadow-sm">
                <span className="font-bold text-slate-700">Note:</span> Files are generated only when you click Send Email to ensure the latest report data is attached.
              </div>
            </aside>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-white px-5 py-3">
          <div className="text-[11px] font-medium text-slate-500">
            {isSending ? "Please wait while the email package is being prepared..." : "Review the recipients and message before sending."}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSending}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-65"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSend}
              disabled={isSending}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-blue-600 bg-blue-600 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-65"
            >
              <FontAwesomeIcon icon={faEnvelope} className="text-[12px]" />
              {isSending ? "Sending..." : "Send Email"}
            </button>
          </div>
        </div>
      </div>

      {isSending && (
        <div className="fixed inset-0 z-[1000002] flex flex-col items-center justify-center bg-white/50 backdrop-blur-[2px]">
          <LoadingSpinner />
          <div className="mt-3 rounded-full bg-white/95 px-4 py-1.5 text-xs font-semibold text-slate-700 shadow">
            Generating PDF and Excel, then sending email...
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchGlobalEmail;
