import React, { useRef } from "react";
import {
  Download,
  FileText,
  Maximize2,
  Minimize2,
  Printer,
  X,
} from "lucide-react";
import { useSupportDock } from "./SupportDockContext";

const FloatingSupportDock = () => {
  const previewRef = useRef(null);

  const {
    manual,
    isOpen,
    isMinimized,
    minimize,
    restore,
    close,
  } = useSupportDock();

  if (!isOpen || !manual) return null;

  const handleDownload = () => {
    if (!manual.url) return;

    const anchor = document.createElement("a");
    anchor.href = manual.url;
    anchor.download =
      manual.fileName?.split("/").pop() || "user-manual.pdf";

    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  const handlePrint = () => {
    if (!manual.url) return;

    try {
      const frameWindow = previewRef.current?.contentWindow;

      if (frameWindow) {
        frameWindow.focus();
        frameWindow.print();
        return;
      }
    } catch (error) {
      console.warn("Unable to print embedded PDF:", error);
    }

    window.open(manual.url, "_blank", "noopener,noreferrer");
  };

  if (isMinimized) {
    return (
      <button
        type="button"
        onClick={restore}
        className="fixed bottom-5 right-5 z-[998] flex max-w-[320px] items-center gap-3 rounded-2xl border border-blue-200 bg-white px-4 py-3 text-left shadow-2xl transition hover:-translate-y-0.5 hover:border-blue-300 dark:border-blue-900 dark:bg-slate-900"
        title="Restore user manual"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
          <FileText className="h-5 w-5" />
        </div>

        <div className="min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-wide text-blue-600 dark:text-blue-300">
            Support Manual
          </div>

          <div className="truncate text-sm font-semibold text-slate-800 dark:text-white">
            {manual.title || "User Manual"}
          </div>
        </div>

        <Maximize2 className="h-4 w-4 shrink-0 text-slate-400" />
      </button>
    );
  }

  return (
    <aside className="fixed bottom-4 right-4 top-20 z-[998] flex w-[min(520px,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <div className="min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-blue-600 dark:text-blue-300">
            Help &amp; Support
          </div>

          <h2 className="mt-1 truncate text-sm font-bold text-slate-900 dark:text-white">
            {manual.title || "User Manual"}
          </h2>

          <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
            {manual.fileName}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={minimize}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Minimize"
          >
            <Minimize2 className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={close}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <button
          type="button"
          onClick={handleDownload}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <Download className="h-4 w-4" />
          Download
        </button>

        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
        >
          <Printer className="h-4 w-4" />
          Print
        </button>
      </div>

      <div className="min-h-0 flex-1 bg-slate-100 dark:bg-slate-950">
        <iframe
          ref={previewRef}
          src={`${manual.url}#toolbar=1&navpanes=0&scrollbar=1`}
          title={manual.title || "User Manual Preview"}
          className="h-full w-full border-0"
        />
      </div>
    </aside>
  );
};

export default FloatingSupportDock;
