// import React, { useMemo, useState, useEffect } from "react";
// import { useNavigate } from "react-router-dom";
// import {
//   apiClient,
//   setTenant,
//   getTenant,
// } from "@/NAYSA Cloud/Configuration/BaseURL";
// import Swal from "sweetalert2";
// import { FiLock, FiEye, FiEyeOff } from "react-icons/fi";

// /* ---------------- Password rules ---------------- */
// const REQUIREMENTS = [
//   { key: "len", test: (p) => p.length >= 8, label: "At least 8 characters" },
//   { key: "lower", test: (p) => /[a-z]/.test(p), label: "Contains a lowercase letter" },
//   { key: "upper", test: (p) => /[A-Z]/.test(p), label: "Contains an uppercase letter" },
//   { key: "digit", test: (p) => /\d/.test(p), label: "Contains a number" },
//   { key: "special", test: (p) => /[^A-Za-z0-9]/.test(p), label: "Contains a special character" },
//   { key: "spaces", test: (p) => !/\s/.test(p), label: "No spaces" },
// ];

// const ChangePassword = () => {
//   const navigate = useNavigate();

//   /* ---------------- URL params ---------------- */
//   const params = useMemo(() => new URLSearchParams(window.location.search), []);
//   const user = (params.get("user") || "").trim();
//   const mode = (params.get("mode") || "").trim(); // reset | release | ""
//   const companyFromLink = (params.get("company") || "").trim();

//   /* ---------------- MODE RULE ---------------- */
//   const requiresOldPassword = !["reset", "release"].includes(mode);

//   /* ---------------- State ---------------- */
//   const [oldPassword, setOldPassword] = useState("");
//   const [newPassword, setNewPassword] = useState("");
//   const [confirm, setConfirm] = useState("");
//   const [showOld, setShowOld] = useState(false);
//   const [showNew, setShowNew] = useState(false);
//   const [showConf, setShowConf] = useState(false);
//   const [loading, setLoading] = useState(false);

//   /* ---------------- Tenant from link ---------------- */
//   useEffect(() => {
//     if (companyFromLink) setTenant(companyFromLink);
//   }, [companyFromLink]);

//   const tenant = getTenant();

//   /* ---------------- Strength helpers ---------------- */
//   const baseReqsOk = REQUIREMENTS.every((r) => r.test(newPassword));

//   const extraRulesOk =
//     newPassword &&
//     newPassword.toLowerCase() !== "password" &&
//     newPassword.toLowerCase() !== user.toLowerCase() &&
//     (!requiresOldPassword || newPassword !== oldPassword);

//   const canSubmit =
//     !!user &&
//     !!tenant &&
//     baseReqsOk &&
//     extraRulesOk &&
//     confirm === newPassword &&
//     (!requiresOldPassword || !!oldPassword) &&
//     !loading;

//   /* ---------------- Submit ---------------- */
//   const handleSubmit = async (e) => {
//     e.preventDefault();

//     if (!user || !tenant) {
//       Swal.fire("Error", "Invalid or expired password link.", "error");
//       return;
//     }

//     setLoading(true);
//     try {
//       const { data } = await apiClient.post("/users/change-password", {
//         userCode: user,
//         oldPassword: requiresOldPassword ? oldPassword : null,
//         newPassword,
//         mode,
//       });

//       if (data?.status === "success") {
//         await Swal.fire("Success", "Password changed successfully.", "success");
//         navigate("/", { replace: true });
//       } else {
//         Swal.fire("Error", data?.message || "Password change failed.", "error");
//       }
//     } catch (err) {
//       Swal.fire(
//         "Error",
//         err?.response?.data?.message || err.message || "Request failed.",
//         "error"
//       );
//     } finally {
//       setLoading(false);
//     }
//   };

//   const reqItemClass = (ok) =>
//     `flex items-start gap-2 text-sm ${ok ? "text-green-600" : "text-gray-500"}`;

//   /* ---------------- UI (UNCHANGED DESIGN) ---------------- */
//   return (
//     <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(to_bottom,#7392b7,#d8e1e9)] px-4">
//       <div className="mx-auto flex max-w-6xl flex-col items-center justify-center py-8">
//         <div className="w-full max-w-md rounded-2xl border border-white/40 bg-white/40 p-4 shadow-xl backdrop-blur-md">
//           <div className="mb-3 flex flex-col items-center text-center">
//             <img src="/naysa_logo.png" alt="NAYSA Logo" className="w-28 drop-shadow-md" />
//             <h1 className="mt-2 text-lg font-bold text-blue-900">
//               NAYSA Financials Cloud
//             </h1>
//           </div>

//           <h2 className="text-xl font-semibold text-center">Change Password</h2>

//           <p className="text-xs text-center text-gray-500 mt-1">
//             User: <span className="font-medium">{user}</span> • Tenant:{" "}
//             <span className="font-medium">{tenant}</span>
//           </p>

//           <form onSubmit={handleSubmit} className="mt-4 space-y-3">

//             {/* OLD PASSWORD (only when required) */}
//             {requiresOldPassword && (
//               <label className="block">
//                 <span className="text-sm font-medium">Old Password</span>
//                 <div className="relative">
//                   <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
//                   <input
//                     type={showOld ? "text" : "password"}
//                     value={oldPassword}
//                     onChange={(e) => setOldPassword(e.target.value)}
//                     className="w-full rounded-xl border py-2 pl-10 pr-10"
//                     required
//                   />
//                   <button type="button" onClick={() => setShowOld(!showOld)}
//                     className="absolute right-3 top-1/2 -translate-y-1/2">
//                     {showOld ? <FiEyeOff /> : <FiEye />}
//                   </button>
//                 </div>
//               </label>
//             )}

//             {/* NEW PASSWORD */}
//             <label className="block">
//               <span className="text-sm font-medium">New Password</span>
//               <div className="relative">
//                 <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
//                 <input
//                   type={showNew ? "text" : "password"}
//                   value={newPassword}
//                   onChange={(e) => setNewPassword(e.target.value)}
//                   className="w-full rounded-xl border py-2 pl-10 pr-10"
//                   required
//                 />
//                 <button type="button" onClick={() => setShowNew(!showNew)}
//                   className="absolute right-3 top-1/2 -translate-y-1/2">
//                   {showNew ? <FiEyeOff /> : <FiEye />}
//                 </button>
//               </div>
//             </label>

//             {/* CONFIRM */}
//             <label className="block">
//               <span className="text-sm font-medium">Confirm Password</span>
//               <div className="relative">
//                 <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
//                 <input
//                   type={showConf ? "text" : "password"}
//                   value={confirm}
//                   onChange={(e) => setConfirm(e.target.value)}
//                   className="w-full rounded-xl border py-2 pl-10 pr-10"
//                   required
//                 />
//                 <button type="button" onClick={() => setShowConf(!showConf)}
//                   className="absolute right-3 top-1/2 -translate-y-1/2">
//                   {showConf ? <FiEyeOff /> : <FiEye />}
//                 </button>
//               </div>
//             </label>

//             {/* REQUIREMENTS LIST (UNCHANGED) */}
//             <div className="rounded-lg bg-gray-50 border p-3">
//               <div className="text-xs font-semibold mb-2">Password requirements</div>
//               <ul className="space-y-1">
//                 {REQUIREMENTS.map((r) => (
//                   <li key={r.key} className={reqItemClass(r.test(newPassword))}>
//                     <span className={`w-3 h-3 rounded-full ${r.test(newPassword) ? "bg-green-600" : "bg-gray-300"}`} />
//                     {r.label}
//                   </li>
//                 ))}
//               </ul>
//             </div>

//             <button
//               type="submit"
//               disabled={!canSubmit}
//               className={`w-full rounded-xl py-2 font-medium text-white ${
//                 canSubmit
//                   ? "bg-gradient-to-r from-sky-600 to-indigo-600"
//                   : "bg-gray-400 cursor-not-allowed"
//               }`}
//             >
//               {loading ? "Saving..." : "Change Password"}
//             </button>
//           </form>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default ChangePassword;
import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  apiClient,
  setTenant,
  getTenant,
} from "@/NAYSA Cloud/Configuration/BaseURL";
import { FiLock, FiEye, FiEyeOff } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import {
  useSwalErrorAlert,
  useSwalSuccessAlert,
} from "@/NAYSA Cloud/Global/behavior.jsx";

/* ─── Build requirements list from HS_SEC policy ────────────────── */
const buildRequirements = (policy) => {
  const reqs = [];

  // minimChar: minimum character length (0 = not enforced, but always show if > 0)
  const minLen = policy?.minimChar ?? 0;
  if (minLen > 0) {
    reqs.push({
      key: "len",
      test: (p) => p.length >= minLen,
      label: `At least ${minLen} character${minLen !== 1 ? "s" : ""}`,
    });
  }

  // upLow: must contain both uppercase AND lowercase letters
  if (policy?.upLow) {
    reqs.push({
      key: "upper",
      test: (p) => /[A-Z]/.test(p),
      label: "Contains an uppercase letter",
    });
    reqs.push({
      key: "lower",
      test: (p) => /[a-z]/.test(p),
      label: "Contains a lowercase letter",
    });
  }

  // letNum: must contain both letters AND numbers
  if (policy?.letNum) {
    reqs.push({
      key: "digit",
      test: (p) => /\d/.test(p),
      label: "Contains a number",
    });
  }

  // specChar: must contain a special character
  if (policy?.specChar) {
    reqs.push({
      key: "special",
      test: (p) => /[^A-Za-z0-9]/.test(p),
      label: "Contains a special character",
    });
  }

  // No spaces — always enforced
  reqs.push({
    key: "spaces",
    test: (p) => !/\s/.test(p),
    label: "No spaces",
  });

  return reqs;
};

/* ─── Animation variants — same as Login / Register ─────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

const floatAnim = {
  animate: {
    y: [0, -6, 0],
    transition: { duration: 3.5, repeat: Infinity, ease: "easeInOut" },
  },
};

const blob1 = {
  animate: {
    x: [0, 25, -18, 0],
    y: [0, -18, 14, 0],
    scale: [1, 1.04, 0.97, 1],
    transition: { duration: 14, repeat: Infinity, ease: "easeInOut" },
  },
};

const blob2 = {
  animate: {
    x: [0, -22, 18, 0],
    y: [0, 18, -12, 0],
    scale: [1, 1.03, 0.98, 1],
    transition: { duration: 18, repeat: Infinity, ease: "easeInOut" },
  },
};

/* ─── Spinner ────────────────────────────────────────────────────── */
function Spinner({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="animate-spin" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" className="opacity-25" />
      <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0A12 12 0 002 12h2z" />
    </svg>
  );
}

/* ─── Password input with animated focus underline ──────────────── */
function PasswordInput({ value, onChange, show, onToggle, placeholder = "••••••••", disabled }) {
  const [focused, setFocused] = useState(false);
  return (
    <div
      className="relative"
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    >
      <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 z-10">
        <FiLock
          size={14}
          className={focused ? "text-sky-500" : "text-slate-400"}
          style={{ transition: "color .2s" }}
        />
      </div>
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-11 text-sm text-slate-900 placeholder:text-slate-400 outline-none shadow-sm transition-colors focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 disabled:opacity-50 disabled:cursor-not-allowed"
        required
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 z-10 rounded-md p-1 text-slate-400 hover:text-slate-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/40"
        tabIndex={-1}
      >
        {show ? <FiEyeOff size={14} /> : <FiEye size={14} />}
      </button>
      <motion.span
        className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-xl origin-left"
        style={{ background: "linear-gradient(90deg,#38bdf8,#6366f1)" }}
        animate={{ scaleX: focused ? 1 : 0 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}

/* ─── Strength bar ───────────────────────────────────────────────── */
function StrengthBar({ password, requirements }) {
  const passed = requirements.filter((r) => r.test(password)).length;
  const pct = password ? (passed / requirements.length) * 100 : 0;
  const color =
    pct <= 33 ? "#ef4444" :
      pct <= 66 ? "#f59e0b" :
        pct <= 83 ? "#3b82f6" :
          "#22c55e";
  const label =
    !password ? "" :
      pct <= 33 ? "Weak" :
        pct <= 66 ? "Fair" :
          pct <= 83 ? "Good" :
            "Strong";

  return (
    <div className="mt-2">
      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        />
      </div>
      <AnimatePresence>
        {label && (
          <motion.p
            key={label}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-0.5 text-right text-[10px] font-semibold"
            style={{ color }}
          >
            {label}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   ChangePassword
   ════════════════════════════════════════════════════════════════════ */
const ChangePassword = () => {
  const navigate = useNavigate();

  /* URL params */
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const user = (params.get("user") || "").trim();
  const mode = (params.get("mode") || "").trim();
  const companyFromLink = (params.get("company") || "").trim();

  const requiresOldPassword = !["reset", "release", "unlock", "expired"].includes(mode);

  /* State */
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [loading, setLoading] = useState(false);
  const [policy, setPolicy] = useState(null);

  /* Derive requirements from fetched policy */
  const REQUIREMENTS = useMemo(() => buildRequirements(policy), [policy]);

  useEffect(() => {
    if (companyFromLink) setTenant(companyFromLink);

    // NEW: Scrub the URL completely clean so it only shows the domain
    if (window.location.search || window.location.pathname !== "/") {
      const cleanUrl = window.location.protocol + "//" + window.location.host + "/";
      window.history.replaceState({}, document.title, cleanUrl);
    }

    // Fetch HS_SEC password policy
    apiClient
      .get("/security/policy")
      .then(({ data }) => {
        if (data?.success && data?.data) setPolicy(data.data);
      })
      .catch(() => {
        // On failure, leave policy null → buildRequirements returns defaults (no-spaces only)
      });
  }, [companyFromLink]);

  const tenant = getTenant();

  /* Validation */
  const baseReqsOk = REQUIREMENTS.every((r) => r.test(newPassword));
  const extraRulesOk =
    newPassword &&
    newPassword.toLowerCase() !== "password" &&
    newPassword.toLowerCase() !== user.toLowerCase() &&
    (!requiresOldPassword || newPassword !== oldPassword);

  const canSubmit =
    !!user &&
    !!tenant &&
    baseReqsOk &&
    extraRulesOk &&
    confirm === newPassword &&
    (!requiresOldPassword || !!oldPassword) &&
    !loading;

  /* Confirm match indicator */
  const confirmMatch =
    confirm.length > 0
      ? confirm === newPassword
        ? "match"
        : "mismatch"
      : null;

  /* Submit */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user || !tenant) {
      useSwalErrorAlert("Error", "Invalid or expired password link.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await apiClient.post("/users/change-password", {
        userCode: user,
        oldPassword: requiresOldPassword ? oldPassword : null,
        newPassword,
        mode,
      });

      if (data?.status === "success") {
        useSwalSuccessAlert("Success", "Password changed successfully.");
        navigate("/", { replace: true });
      } else {
        useSwalErrorAlert("Error", data?.message || "Password change failed.");
      }
    } catch (err) {
      useSwalErrorAlert(
        "Error",
        err?.response?.data?.message || err.message || "Request failed."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative min-h-screen overflow-hidden px-4 pt-8 pb-20 text-slate-900"
      style={{
        backgroundImage:
          "linear-gradient(rgba(2,12,32,0.58), rgba(2,12,32,0.68)), url('/NAYSABG.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_35%_20%,rgba(56,189,248,0.18),transparent_38%),radial-gradient(circle_at_80%_65%,rgba(29,78,216,0.18),transparent_42%)]" />

      <main className="relative z-10 mx-auto flex min-h-[calc(100vh-7rem)] w-full max-w-7xl items-center justify-between gap-10">
        {/* Left marketing side */}
        <motion.section
          initial={{ opacity: 0, x: -28 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="hidden flex-1 text-white lg:block"
        >
          <div className="max-w-4xl">
            <div className="mb-8 inline-flex rounded-full border border-white/35 bg-slate-950/20 px-8 py-3 text-xs font-bold uppercase tracking-[0.42em] text-white shadow-lg backdrop-blur-sm">
              NAYSA-SOLUTIONS INCORPORATED
            </div>

            <h1 className="whitespace-nowrap text-5xl font-extrabold uppercase tracking-[0.18em] text-white drop-shadow-xl xl:text-6xl">
              WE MAKE LIFE EASIER
            </h1>

            <p className="mt-7 text-2xl font-bold uppercase tracking-[0.38em] text-white/85 drop-shadow-md xl:text-3xl">
              THROUGH BUSINESS APPLICATIONS
            </p>

            <div className="mt-10 h-1 w-36 rounded-full bg-sky-400 shadow-[0_0_22px_rgba(56,189,248,0.75)]" />

            <p className="mt-10 max-w-4xl text-lg font-semibold leading-9 text-white drop-shadow-lg xl:text-xl">
              Powerful business applications built to streamline operations, support compliance,
              and help your team work faster with NAYSA Cloud.
            </p>
          </div>
        </motion.section>

        {/* Right form side */}
        <section className="flex w-full flex-1 justify-center lg:justify-end">
          <div className="w-full max-w-xl">
            <div className="mb-5 flex flex-col items-center text-center">
              <motion.div {...floatAnim} className="mb-2">
                <img src="/naysa_logo.png" alt="NAYSA Logo" className="w-28 drop-shadow-md md:w-32" />
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.05 }}
                className="text-2xl font-bold tracking-tight text-white drop-shadow-lg md:text-3xl"
              >
                NAYSA Financials Cloud
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="mt-1.5 text-sm font-medium text-white/75"
              >
                {mode === "reset" && "Reset your password to continue."}
                {mode === "release" && "Set a new password to unlock your account."}
                {mode === "expired" && "Your password has expired. Please set a new one to continue."}
                {mode === "unlock" && "Your account has been released. Please set a new password to continue."}
                {!mode && "Update your account password."}
              </motion.p>
            </div>

        {/* ── Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full rounded-[2rem] p-7 sm:p-8"
          style={{
            background: "rgba(255,255,255,0.92)",
            border: "1px solid rgba(255,255,255,0.8)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            boxShadow: "0 24px 70px rgba(2,12,32,.28), inset 0 1px 0 rgba(255,255,255,.85)",
          }}
        >
          {/* Top shimmer line */}
          <div
            className="absolute top-0 left-10 right-10 h-px rounded-full"
            style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,1), transparent)" }}
          />

          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.15, duration: 0.35 }}
            className="relative mb-5"
          >
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-sky-400/20 via-indigo-400/20 to-cyan-400/20 blur-lg" />

            <div className="relative overflow-hidden rounded-2xl border border-white/70 bg-white/70 px-4 py-3 backdrop-blur-md shadow-[0_10px_30px_rgba(56,189,248,0.12)]">
              <div className="absolute top-0 left-0 h-full w-1.5 bg-gradient-to-b from-sky-500 to-indigo-500" />

              <div className="flex items-start gap-3 pl-2">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-500 text-white shadow-md">
                  <FiLock size={16} />
                </div>

                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-sky-700">
                    Secure Password Update
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-700">
                    Hi <span className="font-semibold text-slate-900">{user}</span>,{" "}
                    {mode === "admin_add" ? (
                      <>
                        use your <span className="font-semibold text-indigo-700">temporary password</span>{" "}
                        to create a new password and continue.
                      </>
                    ) : mode === "release" ? (
                      "your account is approved! Please set your new password below to activate your account."
                    ) : mode === "reset" ? (
                      "please securely set your new password below."
                    ) : (
                      "please enter your current password to set a new one."
                    )}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.form
            onSubmit={handleSubmit}
            noValidate
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="space-y-4"
          >

            {/* Old password */}
            <AnimatePresence>
              {requiresOldPassword && (
                <motion.div key="old" variants={fadeUp}>
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Old Password
                  </span>
                  <PasswordInput
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    show={showOld}
                    onToggle={() => setShowOld((s) => !s)}
                    disabled={loading}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* New password */}
            <motion.div variants={fadeUp}>
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                New Password
              </span>
              <PasswordInput
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                show={showNew}
                onToggle={() => setShowNew((s) => !s)}
                disabled={loading}
              />
              {/* Strength bar */}
              {newPassword && <StrengthBar password={newPassword} requirements={REQUIREMENTS} />}
            </motion.div>

            {/* Confirm password */}
            <motion.div variants={fadeUp}>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Confirm Password
                </span>
                <AnimatePresence mode="wait">
                  {confirmMatch === "match" && (
                    <motion.span
                      key="match"
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.85 }}
                      transition={{ duration: 0.18 }}
                      className="text-[10px] font-bold text-emerald-600"
                    >
                      ✓ Passwords match
                    </motion.span>
                  )}
                  {confirmMatch === "mismatch" && (
                    <motion.span
                      key="mismatch"
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.85 }}
                      transition={{ duration: 0.18 }}
                      className="text-[10px] font-bold text-red-500"
                    >
                      ✕ Does not match
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              <PasswordInput
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                show={showConf}
                onToggle={() => setShowConf((s) => !s)}
                disabled={loading}
              />
            </motion.div>

            {/* Requirements checklist */}
            <motion.div
              variants={fadeUp}
              className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5"
            >
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Password requirements
              </p>
              <ul className="space-y-1.5">
                {REQUIREMENTS.map((r) => {
                  const ok = r.test(newPassword);
                  return (
                    <motion.li
                      key={r.key}
                      animate={{ opacity: newPassword ? 1 : 0.55 }}
                      className="flex items-center gap-2 text-xs"
                    >
                      <motion.span
                        animate={{
                          backgroundColor: ok ? "#22c55e" : "#cbd5e1",
                          scale: ok ? [1, 1.25, 1] : 1,
                        }}
                        transition={{ duration: 0.25 }}
                        className="flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded-full"
                      >
                        {ok && (
                          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                            <path d="M1.5 4L3 5.5L6.5 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </motion.span>
                      <span className={ok ? "text-slate-700 font-medium" : "text-slate-400"}>
                        {r.label}
                      </span>
                    </motion.li>
                  );
                })}
              </ul>
            </motion.div>

            {/* Submit */}
            <motion.div variants={fadeUp}>
              <motion.button
                type="submit"
                disabled={!canSubmit}
                whileHover={canSubmit ? { y: -1, boxShadow: "0 8px 20px rgba(29,78,216,.35)" } : {}}
                whileTap={canSubmit ? { y: 0 } : {}}
                className="w-full rounded-xl py-3 text-sm font-semibold text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: "linear-gradient(135deg,#0369a1 0%,#1d4ed8 100%)" }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Spinner size={16} /> Saving…
                  </span>
                ) : "Change Password"}
              </motion.button>
            </motion.div>

          </motion.form>

        </motion.div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 z-30 w-full">
        <div className="w-full border-t border-white/20 bg-slate-950/75 px-4 py-3 backdrop-blur-md shadow-lg">
          <p className="text-center text-xs font-semibold tracking-wide text-white sm:text-sm">
            © 2026 NAYSA-SOLUTIONS, INC. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default ChangePassword;