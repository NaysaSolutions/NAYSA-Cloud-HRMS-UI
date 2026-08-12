import React, { useState, useEffect, useRef } from "react";
import { FiX, FiUser, FiMail, FiArrowRight, FiCheckCircle } from "react-icons/fi";
import { Building2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  apiClient,
  setTenant,
} from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import {
  useSwalErrorAlert,
  useSwalSuccessAlert,
  useSwalWarningAlert,
} from "@/NAYSA Cloud/Global/behavior.jsx";

/* ─── Animation variants — same as Login ────────────────────────── */
const backdropVariants = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { duration: 0.22 } },
  exit:   { opacity: 0, transition: { duration: 0.18 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 28, scale: 0.97 },
  show:   { opacity: 1, y: 0,  scale: 1,    transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] } },
  exit:   { opacity: 0, y: 16, scale: 0.97, transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

/* ─── Input box matching Login's InputBox ────────────────────────── */
function InputBox({ icon: Icon, children }) {
  const [focused, setFocused] = useState(false);
  return (
    <div
      className="relative"
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    >
      <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 z-10">
        <Icon
          size={14}
          className={focused ? "text-sky-500" : "text-slate-400"}
          style={{ transition: "color .2s" }}
        />
      </div>
      {children}
      <motion.span
        className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-xl origin-left"
        style={{ background: "linear-gradient(90deg,#38bdf8,#6366f1)" }}
        animate={{ scaleX: focused ? 1 : 0 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 " +
  "text-sm text-slate-900 placeholder:text-slate-400 outline-none shadow-sm " +
  "transition-colors focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 " +
  "disabled:opacity-50 disabled:cursor-not-allowed";

/* ─── Spinner ────────────────────────────────────────────────────── */
function Spinner({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="animate-spin" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" className="opacity-25" />
      <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0A12 12 0 002 12h2z" />
    </svg>
  );
}

/* ════════════════════════════════════════════════════════════════════
   ForgotPassword
   Props:
     open        – boolean
     onClose     – () => void
     companies   – array of { code, company, database }
     defaultCompanyCode – pre-selected company code from login form
   ════════════════════════════════════════════════════════════════════ */
export default function ForgotPassword({ open, onClose, companies = [], defaultCompanyCode = "" }) {
  const [companyCode, setCompanyCode] = useState(defaultCompanyCode);
  const [userCode,    setUserCode]    = useState("");
  const [loading,     setLoading]     = useState(false);
  const [sent,        setSent]        = useState(false);

  const userInputRef = useRef(null);

  /* Sync company when parent changes (e.g. user picks company then clicks Forgot) */
  useEffect(() => {
    if (defaultCompanyCode) setCompanyCode(defaultCompanyCode);
  }, [defaultCompanyCode]);

  /* Reset state when modal opens/closes */
  useEffect(() => {
    if (open) {
      setSent(false);
      setUserCode("");
      // auto-focus user ID field after animation settles
      const t = setTimeout(() => userInputRef.current?.focus(), 350);
      return () => clearTimeout(t);
    }
  }, [open]);

  /* Close on Escape */
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!companyCode) {
      useSwalWarningAlert("Select Company", "Please choose a company first.");
      return;
    }
    if (!userCode.trim()) {
      useSwalWarningAlert("User ID Required", "Please enter your User ID.");
      return;
    }

    setLoading(true);
    try {
      setTenant(companyCode);
      const { data } = await apiClient.post("/users/request-password-reset", {
        userCode: userCode.trim(),
      });

      if (data?.status === "success") {
        setSent(true);
      } else {
        useSwalErrorAlert(
          "Request Failed",
          data?.message || "Unable to send reset link. Please try again."
        );
      }
    } catch (err) {
      useSwalErrorAlert(
        "Request Failed",
        err?.response?.data?.message || err?.message || "Unable to send reset link."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        /* Backdrop */
        <motion.div
          key="forgot-backdrop"
          variants={backdropVariants}
          initial="hidden"
          animate="show"
          exit="exit"
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          {/* Card */}
          <motion.div
            key="forgot-card"
            variants={cardVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            className="relative w-full max-w-sm rounded-2xl p-7"
            style={{
              background: "rgba(255,255,255,0.96)",
              border: "1px solid rgba(255,255,255,0.8)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              boxShadow: "0 24px 64px rgba(15,23,42,0.22), inset 0 1px 0 rgba(255,255,255,.9)",
            }}
          >
            {/* Top shimmer line */}
            <div
              className="absolute top-0 left-10 right-10 h-px rounded-full"
              style={{ background: "linear-gradient(90deg, transparent, rgba(56,189,248,.6), transparent)" }}
            />

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/40"
              aria-label="Close"
            >
              <FiX size={16} />
            </button>

            <AnimatePresence mode="wait">
              {/* ── SENT STATE ── */}
              {sent ? (
                <motion.div
                  key="sent"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col items-center text-center py-4"
                >
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.1 }}
                    className="mb-4 flex h-16 w-16 items-center justify-center rounded-full"
                    style={{ background: "linear-gradient(135deg,#d1fae5,#a7f3d0)" }}
                  >
                    <FiCheckCircle size={32} className="text-emerald-600" />
                  </motion.div>

                  <h2 className="text-lg font-bold text-slate-900">Check your email</h2>
                  <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                    If <span className="font-semibold text-slate-700">{userCode.trim()}</span> exists
                    in the system, a password reset link has been sent to the registered email address.
                  </p>
                  <p className="mt-1.5 text-xs text-slate-400">
                    Didn't receive it? Check your spam folder or contact your administrator.
                  </p>

                  <motion.button
                    type="button"
                    onClick={onClose}
                    whileHover={{ y: -1, boxShadow: "0 8px 20px rgba(29,78,216,.25)" }}
                    whileTap={{ y: 0 }}
                    className="mt-6 w-full rounded-xl py-3 text-sm font-semibold text-white shadow-md"
                    style={{ background: "linear-gradient(135deg,#0369a1 0%,#1d4ed8 100%)" }}
                  >
                    Back to Login
                  </motion.button>
                </motion.div>

              ) : (
                /* ── FORM STATE ── */
                <motion.div
                  key="form"
                  variants={stagger}
                  initial="hidden"
                  animate="show"
                  exit={{ opacity: 0 }}
                >
                  {/* Header */}
                  <motion.div variants={fadeUp} className="mb-5">
                    {/* Icon badge */}
                    <div
                      className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl"
                      style={{ background: "linear-gradient(135deg,#0369a1 0%,#1d4ed8 100%)", boxShadow: "0 8px 20px rgba(29,78,216,.25)" }}
                    >
                      <FiMail size={18} className="text-white" />
                    </div>
                    <h2 className="text-lg font-bold text-slate-900">Forgot your password?</h2>
                    <p className="mt-1 text-sm text-slate-500 leading-relaxed">
                      Enter your company and User ID. We'll send a password reset link to your registered email.
                    </p>
                  </motion.div>

                  <form onSubmit={handleSubmit} noValidate className="space-y-4">

                    {/* Company */}
                    <motion.div variants={fadeUp}>
                      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Company
                      </span>
                      <div className="relative">
                        <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 z-10">
                          <Building2 size={14} className="text-slate-400" />
                        </div>
                        <select
                          value={companyCode}
                          onChange={(e) => setCompanyCode(e.target.value)}
                          disabled={loading}
                          className={inputCls + " appearance-none cursor-pointer"}
                          required
                        >
                          <option value="" disabled>Select a company</option>
                          {companies.map((c) => {
                            const value = c.code || c.database;
                            const label = c.company || value || "(unnamed)";
                            return <option key={value || label} value={value}>{label}</option>;
                          })}
                        </select>
                      </div>
                    </motion.div>

                    {/* User ID */}
                    <motion.div variants={fadeUp}>
                      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                        User ID
                      </span>
                      <InputBox icon={FiUser}>
                        <input
                          ref={userInputRef}
                          type="text"
                          value={userCode}
                          onChange={(e) => setUserCode(e.target.value)}
                          placeholder="Enter your user ID"
                          disabled={loading}
                          autoComplete="username"
                          className={inputCls}
                        />
                      </InputBox>
                    </motion.div>

                    {/* Submit */}
                    <motion.div variants={fadeUp} className="pt-1">
                      <motion.button
                        type="submit"
                        disabled={loading || !companyCode || !userCode.trim()}
                        whileHover={(!loading && companyCode && userCode.trim()) ? { y: -1, boxShadow: "0 8px 20px rgba(29,78,216,.35)" } : {}}
                        whileTap={(!loading && companyCode && userCode.trim()) ? { y: 0 } : {}}
                        className="w-full rounded-xl py-3 text-sm font-semibold text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        style={{ background: "linear-gradient(135deg,#0369a1 0%,#1d4ed8 100%)" }}
                      >
                        {loading ? (
                          <><Spinner size={16} /> Sending…</>
                        ) : (
                          <><span>Send Reset Link</span><FiArrowRight size={15} /></>
                        )}
                      </motion.button>
                    </motion.div>

                    {/* Back to login */}
                    <motion.div variants={fadeUp} className="text-center">
                      <button
                        type="button"
                        onClick={onClose}
                        className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
                      >
                        ← Back to login
                      </button>
                    </motion.div>

                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}