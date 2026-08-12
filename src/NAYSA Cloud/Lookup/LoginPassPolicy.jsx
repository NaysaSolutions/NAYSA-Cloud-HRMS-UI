import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faShieldHalved,
  faSave,
  faTimes,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";
import {
  useSwalErrorAlert,
  useSwalSuccessAlert,
} from "@/NAYSA Cloud/Global/behavior.jsx";

// ─── Default state ────────────────────────────────────────────────────────────
const DEFAULT_POLICY = {
  minimChar: 0,
  passExp: 0,
  passHis: 0,
  upLow: false,
  letNum: false,
  specChar: false,
  maxLog: 0,
};

// ─── Component ────────────────────────────────────────────────────────────────
const LoginPassPolicy = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const [policy, setPolicy] = useState(DEFAULT_POLICY);

  // ── Fetch existing policy ────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ["loginPassPolicy"],
    queryFn: async () => {
      const { data } = await apiClient.get("/security/policy");
      if (data?.data) return data.data;
      if (Array.isArray(data) && data.length > 0) return data[0];
      return null;
    },
    enabled: isOpen,
  });

  useEffect(() => {
    if (data) {
      setPolicy({
        minimChar: data.minimChar ?? 0,
        passExp:   data.passExp   ?? 0,
        passHis:   data.passHis   ?? 0,
        upLow:     data.upLow    === true || data.upLow    === 1,
        letNum:    data.letNum   === true || data.letNum   === 1,
        specChar:  data.specChar === true || data.specChar === 1,
        maxLog:    data.maxLog    ?? 0,
      });
    }
  }, [data]);

  // ── Save mutation ────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      return apiClient.post("/security/policy/upsert", payload);
    },
    onSuccess: async (response) => {
      const res = response.data;
      if (res?.success === true || res?.data?.status === "success") {
        await queryClient.invalidateQueries({ queryKey: ["loginPassPolicy"] });
        await useSwalSuccessAlert("Saved!", "Login/Password policy updated successfully.");
        onClose();
      } else {
        await useSwalErrorAlert("Error!", res?.message || "Failed to save policy.");
      }
    },
    onError: async (error) => {
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        "Error saving policy.";
      await useSwalErrorAlert("Error!", msg);
    },
  });

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleChange = (field, value) => {
    setPolicy((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    saveMutation.mutate(policy);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40">
      <AnimatePresence>
        <motion.div
          key="login-policy-modal"
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.2 }}
          className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <FontAwesomeIcon
                icon={faShieldHalved}
                className="text-blue-600 text-lg"
              />
              <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                Login / Password Policy
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              title="Close"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>

          {/* Body */}
          {isLoading ? (
            <div className="flex items-center justify-center py-16 gap-3 text-gray-500">
              <FontAwesomeIcon icon={faSpinner} spin />
              <span className="text-sm">Loading policy...</span>
            </div>
          ) : (
            <div className="px-5 py-5 space-y-5">

              {/* Password Policy section */}
              <div>
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-3">
                  Password Policy
                </p>

                <div className="grid grid-cols-3 gap-3">
                  {/* Minimum Characters */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500 dark:text-gray-400">
                      Min Characters
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={policy.minimChar}
                      onChange={(e) =>
                        handleChange("minimChar", parseInt(e.target.value) || 0)
                      }
                      className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm text-center bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>

                  {/* Password Expiry */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500 dark:text-gray-400">
                      Expiry (Days)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={policy.passExp}
                      onChange={(e) =>
                        handleChange("passExp", parseInt(e.target.value) || 0)
                      }
                      className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm text-center bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>

                  {/* Password History */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500 dark:text-gray-400">
                      History (Days)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={policy.passHis}
                      onChange={(e) =>
                        handleChange("passHis", parseInt(e.target.value) || 0)
                      }
                      className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm text-center bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                </div>

                {/* Toggles */}
                <div className="mt-3 space-y-2.5">
                  {[
                    { field: "upLow", label: "Combination of uppercase and lowercase letters" },
                    { field: "letNum", label: "Combination of letters and numbers" },
                    { field: "specChar", label: "Inclusion of at least one special character" },
                  ].map(({ field, label }) => (
                    <div
                      key={field}
                      className="flex items-center justify-between gap-3 cursor-pointer group"
                      onClick={() => handleChange(field, !policy[field])}
                    >
                      <span className="text-xs text-gray-600 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors select-none">
                        {label}
                      </span>
                      <div
                        className={`relative flex-shrink-0 w-9 h-5 rounded-full transition-colors duration-200 ${
                          policy[field] ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
                            policy[field] ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-100 dark:border-gray-700" />

              {/* Log-In Policy section */}
              <div>
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-3">
                  Log-In Policy
                </p>

                <div className="flex flex-col gap-1 max-w-[140px]">
                  <label className="text-xs text-gray-500 dark:text-gray-400">
                    Max Login Attempts
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={policy.maxLog}
                    onChange={(e) =>
                      handleChange("maxLog", parseInt(e.target.value) || 0)
                    }
                    className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm text-center bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  <p className="text-[10px] text-gray-400 mt-0.5">0 = unlimited</p>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="px-4 py-2 text-xs rounded-lg bg-blue-600 text-white flex items-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saveMutation.isPending ? (
                <FontAwesomeIcon icon={faSpinner} spin />
              ) : (
                <FontAwesomeIcon icon={faSave} />
              )}
              Save Policy
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default LoginPassPolicy;