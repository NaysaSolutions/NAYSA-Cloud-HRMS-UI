import React, { useCallback, useState } from "react";
import { CheckCircle2, Clipboard, RotateCcw, ScanLine } from "lucide-react";
import BarcodeQrReaderModal from "@/NAYSA Cloud/Lookup/SearchGlobalQRBarCodeReader.jsx";

const ElectronScannerPage = () => {
  const [scannerOpen, setScannerOpen] = useState(true);
  const [scannedValue, setScannedValue] = useState("");
  const [scanMeta, setScanMeta] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleScan = useCallback((value, meta = {}) => {
    setScannedValue(String(value || ""));
    setScanMeta(meta);
    setCopied(false);
  }, []);

  const handleCopy = async () => {
    if (!scannedValue) return;

    try {
      await navigator.clipboard.writeText(scannedValue);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-5 py-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-blue-200">
              <ScanLine size={20} />
              <span className="text-xs font-semibold uppercase tracking-[0.2em]">
                NAYSA Scanner
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-semibold">QR / Barcode Scanner</h1>
          </div>

          <button
            type="button"
            onClick={() => setScannerOpen(true)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            <ScanLine size={16} />
            Scan
          </button>
        </div>

        <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.06] p-5 shadow-2xl">
          <div className="flex items-center gap-2 text-sm font-medium text-white/70">
            <CheckCircle2 size={17} className={scannedValue ? "text-emerald-300" : "text-white/30"} />
            Last scanned value
          </div>

          <div className="mt-4 min-h-[88px] rounded-lg border border-white/10 bg-black/30 p-4">
            {scannedValue ? (
              <div className="break-all text-lg font-medium text-white">{scannedValue}</div>
            ) : (
              <div className="text-sm text-white/45">No scan yet.</div>
            )}
          </div>

          {scanMeta && (
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/60">
              {scanMeta.type && <span className="rounded-full bg-white/10 px-3 py-1">Type: {scanMeta.type}</span>}
              {scanMeta.engine && <span className="rounded-full bg-white/10 px-3 py-1">Engine: {scanMeta.engine}</span>}
              {scanMeta.source && <span className="rounded-full bg-white/10 px-3 py-1">Source: {scanMeta.source}</span>}
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCopy}
              disabled={!scannedValue}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-white px-4 text-sm font-medium text-slate-900 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Clipboard size={16} />
              {copied ? "Copied" : "Copy"}
            </button>

            <button
              type="button"
              onClick={() => {
                setScannedValue("");
                setScanMeta(null);
                setCopied(false);
              }}
              disabled={!scannedValue}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-white/15 px-4 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RotateCcw size={16} />
              Clear
            </button>
          </div>
        </div>
      </div>

      <BarcodeQrReaderModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleScan}
        title="Scan QR or Barcode"
      />
    </div>
  );
};

export default ElectronScannerPage;
