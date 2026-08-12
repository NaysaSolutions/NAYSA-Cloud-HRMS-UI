import React from "react";
import { ArrowLeft, ExternalLink, Info, ShieldCheck, Sparkles, Ticket } from "lucide-react";
import { useNavigate } from "react-router-dom";

const DEFAULT_FRESHDESK_URL =
  "https://nsihelpdesk.freshdesk.com/support/tickets/new";

const SupportTicket = ({ freshdeskUrl = DEFAULT_FRESHDESK_URL }) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-full w-full bg-slate-50 px-1 pb-3 pt-6 dark:bg-slate-950 sm:px-2 lg:px-3">
      <div className="w-full">
        <div className="mb-4 flex items-start gap-3 px-2">
          <button
            type="button"
            onClick={() => navigate("/help-support")}
            className="mt-1 rounded-full p-2 text-blue-600 transition hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-500/10"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Support Ticket
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Submit a ticket or view your existing tickets in our support portal.
            </p>
          </div>
        </div>

        <section className="relative w-full overflow-hidden rounded-[24px] border border-slate-200 bg-white px-5 py-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:px-6 lg:px-7">
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-1/4 h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl" />

          <div className="relative grid gap-6 xl:grid-cols-[1.08fr_0.92fr] xl:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-blue-700 dark:border-blue-900/60 dark:bg-blue-500/10 dark:text-blue-300">
                <Sparkles className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-[0.14em]">
                  NAYSA Support Portal
                </span>
              </div>

              <h2 className="mt-5 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
                Need technical assistance?
              </h2>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-500 dark:text-slate-400 sm:text-base">
                Create a support ticket, attach supporting details, and monitor
                the progress of your concern through our Freshdesk portal.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
                    <Ticket className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                      Submit a concern
                    </div>
                    <div className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                      Provide complete details and attachments.
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                      Track your ticket
                    </div>
                    <div className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                      Review updates and support responses.
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  window.open(freshdeskUrl, "_blank", "noopener,noreferrer")
                }
                className="mt-7 inline-flex min-w-[260px] items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-200/70 transition hover:-translate-y-0.5 hover:bg-blue-700 dark:shadow-none"
              >
                Open Support Portal
                <ExternalLink className="h-4 w-4" />
              </button>
            </div>

            <div className="relative">
              <div className="mx-auto flex min-h-[330px] w-full max-w-none flex-col items-center justify-center rounded-[22px] border border-slate-200 bg-gradient-to-br from-slate-50 to-blue-50 px-6 py-8 text-center shadow-inner dark:border-slate-800 dark:from-slate-950 dark:to-blue-950/40">
                <div className="flex h-28 w-28 items-center justify-center rounded-[28px] bg-blue-600 text-white shadow-xl shadow-blue-200/60 dark:shadow-none">
                  <Ticket className="h-14 w-14" strokeWidth={1.7} />
                </div>

                <h3 className="mt-6 text-xl font-black text-slate-900 dark:text-white">
                  Support made simple
                </h3>

                <p className="mt-3 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">
                  Use one portal to create new requests and review your existing tickets.
                </p>

                <div className="mt-6 flex max-w-md items-start gap-3 rounded-2xl border border-blue-200 bg-white/80 px-4 py-3 text-left backdrop-blur dark:border-blue-900 dark:bg-slate-900/80">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-300" />
                  <p className="text-xs leading-5 text-slate-600 dark:text-slate-300">
                    You will be redirected to the NAYSA Freshdesk portal.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default SupportTicket;