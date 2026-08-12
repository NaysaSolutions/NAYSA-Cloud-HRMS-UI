import React, { useEffect, useState } from "react";

const ExportFileNameModal = ({
  isOpen,
  title = "Export File",
  defaultFileName = "",
  confirmText = "Export",
  onClose,
  onConfirm,
}) => {
  const [fileName, setFileName] = useState(defaultFileName);

  useEffect(() => {
    if (isOpen) setFileName(defaultFileName || "");
  }, [isOpen, defaultFileName]);

  const handleSubmit = () => {
    const trimmed = fileName.trim();
    if (trimmed) onConfirm(trimmed);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Ultra-light Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/10 animate-in fade-in duration-300" 
        onClick={onClose} 
      />

      {/* The "Command" Style Modal */}
      <div 
        className="relative w-full max-w-[360px] transform overflow-hidden rounded-2xl bg-white/90 shadow-[0_20px_70px_-10px_rgba(0,0,0,0.15)] ring-1 ring-slate-200 backdrop-blur-md animate-in zoom-in-95 duration-200"
        role="dialog"
      >
        {/* Progress/Header Hint */}
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5">
          <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
            {title}
          </span>
        </div>

        {/* Input Area */}
        <div className="p-4">
          <div className="group relative flex items-center">
            <input
              autoFocus
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="filename_v1"
              className="w-full bg-transparent py-1 pr-12 text-[15px] font-medium text-slate-800 placeholder:text-slate-300 outline-none"
            />
            
            {/* Visual Shortcut Hint */}
            <div className="absolute right-0 flex items-center gap-1.5 opacity-40 transition-opacity group-focus-within:opacity-100">
              <kbd className="flex h-5 items-center justify-center rounded border border-slate-200 bg-white px-1.5 font-sans text-[10px] font-medium text-slate-500 shadow-sm">
                ↵
              </kbd>
            </div>
          </div>
          
          {/* Subtle underline effect */}
          <div className="mt-1 h-[1px] w-full bg-slate-100 overflow-hidden">
            <div className="h-full w-full bg-blue-600 transition-all duration-500 ease-out group-focus-within:w-full" />
          </div>
        </div>

        {/* Minimalist Action Bar */}
        <div className="flex items-center justify-end gap-1 border-t border-slate-50 bg-slate-50/50 p-2">
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-[12px] font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!fileName.trim()}
            className="group relative flex items-center gap-1.5 overflow-hidden rounded-lg bg-blue-600 px-4 py-1.5 text-[12px] font-semibold text-white shadow-md transition-all hover:bg-blue-700 active:scale-95 disabled:opacity-30 disabled:grayscale"
          >
            <span>{confirmText}</span>
            <svg 
              className="w-3 h-3 opacity-60 transition-transform group-hover:translate-x-0.5" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportFileNameModal;