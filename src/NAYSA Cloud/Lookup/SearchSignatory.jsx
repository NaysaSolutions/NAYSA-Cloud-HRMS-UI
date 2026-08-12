import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { postRequest } from "@/NAYSA Cloud/Configuration/BaseURL";
import { useTopDocSign } from "@/NAYSA Cloud/Global/top1RefTable";
import { X, Printer, FileText, CheckCircle, ChevronDown, User } from "lucide-react";
import { useAuth } from "../Authentication/AuthContext.jsx";

const InputField = ({ label, name, value, onChange, disabled, isSaving }) => (
  <div className="flex flex-col space-y-1">
    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest dark:text-gray-500">
      {label}
    </label>
    <div className="relative group">
      <input
        type="text"
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled || isSaving}
        autoComplete="off"
        className={`w-full px-3 py-1.5 text-sm border rounded-md outline-none transition-all duration-200
          ${
            disabled
              ? "bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed dark:bg-gray-800/50 dark:border-gray-700"
              : "bg-white border-gray-300 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-200"
          }
        `}
      />
    </div>
  </div>
);

const DocumentSignatories = ({ isOpen, onClose, onCancel, params }) => {
  const { documentID, noReprints, docType, docNo } = params;
  const queryClient = useQueryClient();

  const hasLoadedInitialData = useRef(false);
  const cancelRef = useRef(null);

const { user } = useAuth();
const userName = user?.USER_NAME || user?.USER_CODE || "User";

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [form, setForm] = useState({
    preparedBy: userName,
    checkedBy: "",
    notedBy: "",
    approvedBy: "",
    documentID,
  });

  const canPickMode = useMemo(() => Number(noReprints) === 0, [noReprints]);

  const { data: serverData } = useQuery({
    queryKey: ["documentSignatories", documentID],
    queryFn: () => useTopDocSign(documentID),
    enabled: isOpen && !!documentID,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (serverData && !hasLoadedInitialData.current) {
      setForm((prev) => ({
        ...prev,
        preparedBy: serverData.preparedBy || userName,
        checkedBy: serverData.checkedBy || "",
        notedBy: serverData.notedBy || "",
        approvedBy: serverData.approvedBy || "",
      }));
      hasLoadedInitialData.current = true;
    }
  }, [serverData]);

  useEffect(() => {
    if (isOpen) {
      setDropdownOpen(false);
      cancelRef.current?.focus();
    } else {
      hasLoadedInitialData.current = false;
    }
  }, [isOpen]);

  const { mutate: saveSignatories, isLoading: isSaving } = useMutation({
    mutationFn: async (mode) => {
      const payload = { ...form, printMode: mode, docType };
      const response = await postRequest(
        "upsertDocSign",
        JSON.stringify(payload),
      );
      if (!response.success) throw new Error("Save failed");
      return mode;
    },
    onSuccess: (mode) => {
      queryClient.invalidateQueries(["documentSignatories", documentID]);
      onClose(mode);
    },
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-slate-900/40 z-50 p-4">
      <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-xl shadow-2xl border border-white/20 overflow-hidden animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="px-5 py-3 border-b dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/30">
          <div>
            <h2 className="text-md font-bold text-gray-800 dark:text-white tracking-tight">
              Document Signatories
            </h2>
            <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-1 font-bold uppercase tracking-wider">
              {docType} - {docNo}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md text-gray-400 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Vertical Body */}
        <div className="p-5 space-y-4">
          <InputField
            label="Prepared By"
            name="preparedBy"
            value={form.preparedBy}
            disabled
          />
          <InputField
            label="Checked By"
            name="checkedBy"
            value={form.checkedBy}
            onChange={handleChange}
            isSaving={isSaving}
          />
          <InputField
            label="Noted By"
            name="notedBy"
            value={form.notedBy}
            onChange={handleChange}
            isSaving={isSaving}
          />
          <InputField
            label="Approved By"
            name="approvedBy"
            value={form.approvedBy}
            onChange={handleChange}
            isSaving={isSaving}
          />
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800/40 border-t dark:border-gray-800 flex justify-end items-center gap-2">
          {/* Real Button Look for Cancel */}
          <button
            ref={cancelRef}
            onClick={onCancel}
            className="px-4 py-1.5 text-xs font-bold text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:border-gray-400 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 transition-all shadow-sm"
          >
            Cancel
          </button>

          <div className="relative">
            {canPickMode ? (
              <div className="relative">
                <button
                  disabled={isSaving}
                  onClick={() => setDropdownOpen((prev) => !prev)}
                  className="flex items-center justify-between gap-2 min-w-[120px] px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors rounded-md shadow-sm ring-1 ring-blue-600"
                >
                  <span className="flex items-center gap-1.5">
                    <Printer size={14} />
                    <span>{isSaving ? "Saving..." : "Preview"}</span>
                  </span>
                  <ChevronDown
                    size={14}
                    className={`transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 bottom-full mb-2 w-32 bg-white dark:bg-gray-900 rounded-lg shadow-xl border dark:border-gray-700 p-1 z-50 animate-in slide-in-from-bottom-1">
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        saveSignatories("Draft");
                      }}
                      className="flex items-center gap-2 w-full px-2 py-1.5 text-[11px] font-semibold text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-all"
                    >
                      <FileText size={12} className="text-blue-500" />
                      Draft
                    </button>
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        saveSignatories("Final");
                      }}
                      className="flex items-center gap-2 w-full px-2 py-1.5 text-[11px] font-semibold text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-all"
                    >
                      <CheckCircle size={12} className="text-blue-500" />
                      Final
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                disabled={isSaving}
                onClick={() => saveSignatories("Final")}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-all shadow-sm ring-1 ring-blue-600"
              >
                <Printer size={14} />
                <span>{isSaving ? "Saving..." : "Preview"}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentSignatories;
