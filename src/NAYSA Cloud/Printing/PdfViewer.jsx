import { useEffect, useRef, useState } from "react";

/** Standalone route used by report.js so the address bar stays on /pdf-viewer. */
export default function PdfViewer() {
  const [src, setSrc] = useState(null);
  const [error, setError] = useState(null);
  const objectUrlRef = useRef(null);

  useEffect(() => {
    const opener = window.opener;

    if (!opener) {
      setError("This report preview must be opened from NAYSA Financials.");
      return undefined;
    }

    const handleMessage = (event) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== opener ||
        event.data?.type !== "naysa-pdf-viewer-data"
      ) {
        return;
      }

      const blob = event.data.blob;
      if (!(blob instanceof Blob)) {
        setError("The report preview did not receive a valid PDF file.");
        return;
      }

      const objectUrl = URL.createObjectURL(blob);
      objectUrlRef.current = objectUrl;
      setSrc(objectUrl);
      document.title = "Report Preview";
    };

    window.addEventListener("message", handleMessage);
    opener.postMessage(
      { type: "naysa-pdf-viewer-ready" },
      window.location.origin
    );

    return () => {
      window.removeEventListener("message", handleMessage);
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  if (error) {
    return (
      <main className="flex h-screen items-center justify-center bg-slate-950 p-6 text-white">
        <div className="max-w-lg rounded-lg bg-slate-900 p-6 text-center shadow-xl">
          <h1 className="mb-2 text-lg font-semibold">Unable to open report</h1>
          <p className="text-sm text-slate-300">{error}</p>
          <button
            type="button"
            onClick={() => window.close()}
            className="mt-5 rounded bg-slate-700 px-4 py-2 hover:bg-slate-600"
          >
            Close
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="h-screen w-screen bg-slate-950 text-white">
      <section className="flex h-full items-center justify-center">
        {src ? (
          <iframe
            title="PDF report"
            src={`${src}#toolbar=1&navpanes=0`}
            className="h-full w-full border-0"
          />
        ) : (
          <p className="text-sm text-slate-300">Preparing report preview...</p>
        )}
      </section>
    </main>
  );
}
