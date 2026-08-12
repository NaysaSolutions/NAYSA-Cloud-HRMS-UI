// import React, { useEffect, useState, useRef } from "react";
// import {
//   FiUser,
//   FiLock,
//   FiEye,
//   FiEyeOff,
//   FiGlobe,
// } from "react-icons/fi";
// import { Fingerprint, ScanLine } from "lucide-react";
// import Swal from "sweetalert2";
// import { useNavigate } from "react-router-dom";
// import { useAuth } from "./AuthContext.jsx";
// import {
//   apiClient,
//   setTenant,
//   bioLoginOptionsPasswordless,
// } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
// import {
//   prepareLoginPublicKey,
//   serializeLoginCredential,
// } from "@/NAYSA Cloud/Authentication/webauthn.js";

// function normalizeCompaniesPayload(raw) {
//   let arr = [];
//   if (Array.isArray(raw)) arr = raw;
//   else if (Array.isArray(raw?.data)) arr = raw.data;
//   else if (raw?.data && typeof raw.data === "object") arr = Object.values(raw.data);
//   else if (raw && typeof raw === "object") arr = Object.values(raw);

//   return arr.map((r) => {
//     const get = (o, ...keys) => keys.reduce((v, k) => v ?? o?.[k], undefined);
//     const code =
//       get(r, "code", "CODE", "Code") ??
//       get(r, "database", "DATABASE", "Database") ??
//       "";
//     const company =
//       get(r, "company", "COMPANY", "Company") ??
//       get(r, "database", "DATABASE", "Database") ??
//       get(r, "code", "CODE", "Code") ??
//       "";
//     const database = get(r, "database", "DATABASE", "Database") ?? "";

//     return {
//       code: String(code || "").trim(),
//       company: String(company || "").trim(),
//       database: String(database || "").trim(),
//     };
//   });
// }

// export default function Login({ onSwitchToRegister }) {
//   const { login, loginWithBiometric } = useAuth();
//   const navigate = useNavigate();

//   const [form, setForm] = useState({ USER_CODE: "", PASSWORD: "" });
//   const [companies, setCompanies] = useState([]);
//   const [companyCode, setCompanyCode] = useState(
//     localStorage.getItem("companyCode") || ""
//   );
//   const [loadingCompanies, setLoadingCompanies] = useState(true);

//   const [isLoading, setIsLoading] = useState(false);
//   const [isBioLoading, setIsBioLoading] = useState(false);
//   const [showPwd, setShowPwd] = useState(false);
//   const [capsOn, setCapsOn] = useState(false);
//   const pwdRef = useRef(null);

//   useEffect(() => {
//     let alive = true;

//     (async () => {
//       try {
//         setLoadingCompanies(true);
//         const { data } = await apiClient.get("/companies");
//         const options = normalizeCompaniesPayload(data).filter(
//           (x) => x.code || x.database
//         );

//         if (!alive) return;
//         setCompanies(options);

//         if (!companyCode && options.length === 1) {
//           setCompanyCode(options[0].code || options[0].database || "");
//         } else if (
//           companyCode &&
//           !options.some((o) => o.code === companyCode || o.database === companyCode)
//         ) {
//           if (options[0]) {
//             setCompanyCode(options[0].code || options[0].database || "");
//           }
//         }
//       } catch (e) {
//         Swal.fire({
//           icon: "error",
//           title: "Unable to load companies",
//           text:
//             e?.response?.data?.message ||
//             e?.message ||
//             "Please check the /api/companies endpoint.",
//         });
//       } finally {
//         if (alive) setLoadingCompanies(false);
//       }
//     })();

//     return () => {
//       alive = false;
//     };
//   }, [companyCode]);

//   useEffect(() => {
//     if (companyCode) localStorage.setItem("companyCode", companyCode);
//   }, [companyCode]);

//   const setBioAuthInProgress = (value) => {
//     try {
//       if (value) sessionStorage.setItem("bioAuthInProgress", "1");
//       else sessionStorage.removeItem("bioAuthInProgress");
//     } catch {}
//   };

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setForm((s) => ({ ...s, [name]: value }));
//   };

//   const handleCaps = (e) =>
//     setCapsOn(e.getModifierState && e.getModifierState("CapsLock"));

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     if (!form.USER_CODE.trim() || !form.PASSWORD) return;

//     if (!companyCode) {
//       await Swal.fire({
//         icon: "warning",
//         title: "Select Company",
//         text: "Please choose a company before logging in.",
//       });
//       return;
//     }

//     setIsLoading(true);
//     try {
//       await login({
//         companyCode,
//         USER_CODE: form.USER_CODE.trim(),
//         PASSWORD: form.PASSWORD,
//       });

//       await Swal.fire({
//         toast: true,
//         position: "top-end",
//         icon: "success",
//         title: "Welcome back!",
//         showConfirmButton: false,
//         timer: 1800,
//         timerProgressBar: true,
//       });

//       navigate("/", { replace: true });
//     } catch (err) {
//       const status = err?.response?.status;
//       const code = err?.response?.data?.code;
//       const msg =
//         err?.response?.data?.message ||
//         err?.message ||
//         "Please try again.";

//       if (status === 403 && code === "PENDING") {
//         await Swal.fire({
//           icon: "info",
//           title: "Awaiting System Administrator Approval",
//           html: `
//             <p style="font-size: 14px; color: #1f2937;">
//               Your account is currently <strong>pending activation</strong>.<br/>
//               Please wait for the administrator to approve your account and send a temporary password.
//             </p>
//           `,
//           confirmButtonText: "OK",
//           confirmButtonColor: "#1e3a8a",
//           background: "#f9fafb",
//           iconColor: "#2563eb",
//         });
//         return;
//       }

//       if (status === 403 && code === "INACTIVE") {
//         await Swal.fire({
//           icon: "error",
//           title: "Account Inactive",
//           text:
//             msg ||
//             "Your account has been deactivated. Please contact the administrator.",
//           confirmButtonText: "OK",
//         });
//         return;
//       }

//       if (status === 429 && code === "SEAT_LIMIT") {
//         await Swal.fire({
//           icon: "warning",
//           title: "Login Limit Reached",
//           text:
//             msg || "Maximum concurrent users reached. Please try again later.",
//           confirmButtonText: "OK",
//         });
//         return;
//       }

//       await Swal.fire({
//         icon: "error",
//         title: "Login failed",
//         text: msg,
//         confirmButtonText: "OK",
//       });
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const handleBiometricLogin = async () => {
//     try {
//       if (!companyCode) {
//         await Swal.fire({
//           icon: "warning",
//           title: "Select Company",
//           text: "Please choose a company before logging in.",
//         });
//         return;
//       }

//       if (
//         !window.PublicKeyCredential ||
//         typeof navigator.credentials?.get !== "function"
//       ) {
//         await Swal.fire({
//           icon: "error",
//           title: "Biometric Login Not Supported",
//           text: "This browser or device does not support biometric login.",
//         });
//         return;
//       }

//       setBioAuthInProgress(true);
//       setIsBioLoading(true);
//       setTenant(companyCode);

//       const optionRes = await bioLoginOptionsPasswordless();

//       if (!optionRes?.success || !optionRes?.data) {
//         throw new Error(
//           optionRes?.message || "Failed to load biometric login options."
//         );
//       }

//       const publicKey = prepareLoginPublicKey(optionRes.data);

//       const credential = await navigator.credentials.get({ publicKey });

//       if (!credential) {
//         throw new Error("Biometric authentication was cancelled.");
//       }

//       const payload = {
//         credential: serializeLoginCredential(credential),
//       };

//       await loginWithBiometric({
//         companyCode,
//         payload,
//       });

//       await Swal.fire({
//         toast: true,
//         position: "top-end",
//         icon: "success",
//         title: "Welcome back!",
//         showConfirmButton: false,
//         timer: 1800,
//         timerProgressBar: true,
//       });

//       navigate("/", { replace: true });
//     } catch (err) {
//       const msg =
//         err?.response?.data?.message ||
//         err?.message ||
//         "Unable to login using biometrics.";

//       if (err?.name === "NotAllowedError") {
//         await Swal.fire({
//           icon: "info",
//           title: "Biometric Login Cancelled",
//           text: "Authentication was cancelled or timed out.",
//           confirmButtonText: "OK",
//         });
//         return;
//       }

//       await Swal.fire({
//         icon: "error",
//         title: "Biometric Login Failed",
//         text: msg,
//         confirmButtonText: "OK",
//       });
//     } finally {
//       setBioAuthInProgress(false);
//       setIsBioLoading(false);
//     }
//   };

//   return (
//     <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(to_bottom,#7392b7,#d8e1e9)]">
//       <div className="pointer-events-none absolute inset-0 -z-10">
//         <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-gradient-to-tr from-indigo-300/30 to-sky-200/30 blur-3xl" />
//         <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-gradient-to-tr from-purple-500/25 to-fuchsia-400/25 blur-3xl" />
//       </div>

//       <div className="mx-auto flex max-w-6xl flex-col items-center justify-start px-4 pt-6 pb-24 md:pt-10 lg:pt-12">
//         <div className="mb-3 flex flex-col items-center text-center md:mb-4">
//           <img
//             src="/naysa_logo.png"
//             alt="NAYSA Logo"
//             className="w-40 drop-shadow-md md:w-44"
//           />
//           <h1 className="mt-2 text-2xl font-bold tracking-tight text-blue-900 md:text-3xl">
//             NAYSA Financials Cloud
//           </h1>
//           <p className="mt-2 text-sm text-slate-700">
//             Sign in with your account or use biometrics for faster access.
//           </p>
//         </div>

//         <div className="w-full max-w-md rounded-2xl border border-white/40 bg-white/40 p-6 shadow-xl backdrop-blur-md dark:bg-white/10">
//           <form onSubmit={handleSubmit} noValidate className="mt-3 space-y-4">
//             <label className="block">
//               <span className="mb-1 block text-sm font-medium text-slate-700">
//                 Company
//                 {!loadingCompanies && (
//                   <span className="ml-2 text-xs text-slate-500">
//                     ({companies.length} found)
//                   </span>
//                 )}
//               </span>
//               <div className="relative">
//                 <FiGlobe className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
//                 <select
//                   value={companyCode}
//                   onChange={(e) => setCompanyCode(e.target.value)}
//                   disabled={loadingCompanies || isLoading || isBioLoading}
//                   className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-10 text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 disabled:cursor-not-allowed disabled:opacity-60"
//                   required
//                 >
//                   <option value="" disabled>
//                     {loadingCompanies ? "Loading companies…" : "Select a company"}
//                   </option>
//                   {companies.map((c) => {
//                     const value = c.code || c.database;
//                     const label = c.company || value || "(unnamed)";
//                     return (
//                       <option key={value || label} value={value}>
//                         {label}
//                       </option>
//                     );
//                   })}
//                 </select>
//               </div>
//             </label>

//             <label className="block">
//               <span className="mb-1 block text-sm font-medium text-slate-700">
//                 User ID
//               </span>
//               <div className="relative">
//                 <FiUser className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
//                 <input
//                   type="text"
//                   name="USER_CODE"
//                   autoComplete="username"
//                   value={form.USER_CODE}
//                   onChange={handleChange}
//                   className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
//                   placeholder="Enter your user ID"
//                 />
//               </div>
//             </label>

//             <label className="block">
//               <div className="mb-1 flex items-center justify-between">
//                 <span className="text-sm font-medium text-slate-700">
//                   Password
//                 </span>
//                 {capsOn && (
//                   <span className="text-xs font-semibold text-white">
//                     Caps Lock is ON
//                   </span>
//                 )}
//               </div>
//               <div className="relative">
//                 <FiLock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
//                 <input
//                   ref={pwdRef}
//                   type={showPwd ? "text" : "password"}
//                   name="PASSWORD"
//                   autoComplete="current-password"
//                   value={form.PASSWORD}
//                   onChange={handleChange}
//                   onKeyUp={handleCaps}
//                   onKeyDown={handleCaps}
//                   className="w-full rounded-xl border border-slate-200 bg-white/90 py-3 pl-10 pr-12 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
//                   placeholder="••••••••"
//                 />
//                 <button
//                   type="button"
//                   onClick={() => setShowPwd((s) => !s)}
//                   className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
//                   aria-label={showPwd ? "Hide password" : "Show password"}
//                 >
//                   {showPwd ? (
//                     <FiEyeOff className="h-5 w-5" />
//                   ) : (
//                     <FiEye className="h-5 w-5" />
//                   )}
//                 </button>
//               </div>
//             </label>

//             <div className="flex justify-end pt-1">
//               <button
//                 type="button"
//                 onClick={() => setShowForgot(true)}
//                 className="text-sm font-medium text-sky-700 hover:text-sky-600"
//               >
//                 Forgot password?
//               </button>
//             </div>

//             <button
//               type="submit"
//               disabled={
//                 isLoading ||
//                 isBioLoading ||
//                 loadingCompanies ||
//                 !companyCode ||
//                 !form.USER_CODE.trim() ||
//                 !form.PASSWORD
//               }
//               className="group relative inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 px-4 py-3 font-medium text-white shadow-lg shadow-sky-600/20 transition hover:from-sky-500 hover:to-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
//             >
//               {isLoading ? (
//                 <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
//                   <circle
//                     cx="12"
//                     cy="12"
//                     r="10"
//                     stroke="currentColor"
//                     strokeWidth="4"
//                     fill="none"
//                     className="opacity-25"
//                   />
//                   <path
//                     className="opacity-75"
//                     fill="currentColor"
//                     d="M4 12a8 8 0 018-8V0A12 12 0 002 12h2z"
//                   />
//                 </svg>
//               ) : (
//                 <>Log In</>
//               )}
//             </button>

//             <div className="pt-2">
//               <div className="mb-3 text-center text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
//                 or use biometrics
//               </div>

//               <button
//                 type="button"
//                 onClick={handleBiometricLogin}
//                 disabled={isLoading || isBioLoading || loadingCompanies || !companyCode}
//                 className="group w-full rounded-2xl border border-sky-200/80 bg-white/80 p-5 shadow-sm transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60"
//               >
//                 <div className="flex flex-col items-center justify-center gap-3">
//                   <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-sky-100 to-blue-200 shadow-inner">
//                     <ScanLine className="absolute h-12 w-12 text-sky-500/40" />
//                     <Fingerprint className="relative h-12 w-12 text-sky-700" />
//                   </div>

//                   <div className="text-center">
//                     <div className="text-base font-semibold text-slate-800">
//                       Login with Biometrics
//                     </div>
//                     <div className="mt-1 text-xs text-slate-500">
//                       Touch fingerprint or face recognition to sign in automatically
//                     </div>
//                   </div>

//                   {isBioLoading && (
//                     <svg className="h-5 w-5 animate-spin text-sky-700" viewBox="0 0 24 24" aria-hidden="true">
//                       <circle
//                         cx="12"
//                         cy="12"
//                         r="10"
//                         stroke="currentColor"
//                         strokeWidth="4"
//                         fill="none"
//                         className="opacity-25"
//                       />
//                       <path
//                         className="opacity-75"
//                         fill="currentColor"
//                         d="M4 12a8 8 0 018-8V0A12 12 0 002 12h2z"
//                       />
//                     </svg>
//                   )}
//                 </div>
//               </button>
//             </div>
//           </form>

//           <div className="mt-6 text-center">
//             <button
//               onClick={onSwitchToRegister}
//               className="text-sm text-slate-700 hover:underline"
//             >
//               Don’t have an account? <span className="text-sky-700">Register</span>
//             </button>
//             <p className="mt-3 text-xs text-slate-500">
//               © {new Date().getFullYear()} NAYSA. All rights reserved.
//             </p>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }
import React, { useEffect, useState, useRef } from "react";
import { FiUser, FiLock, FiEye, FiEyeOff, FiChevronDown, FiArrowRight } from "react-icons/fi";
import { Fingerprint, Building2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";
import {
  apiClient,
  setTenant,
  bioLoginOptionsPasswordless,
  ensureCsrf,
} from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import {
  prepareLoginPublicKey,
  serializeLoginCredential,
} from "@/NAYSA Cloud/Authentication/webauthn.js";
import {
  useSwalErrorAlert,
  useSwalSuccessAlert,
  useSwalWarningAlert,
} from "@/NAYSA Cloud/Global/behavior.jsx";
import ForgotPassword from "./ForgotPassword.jsx";

/* ─── Animation variants ─────────────────────────────────────────── */
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

const pulseRing = {
  animate: {
    scale: [1, 1.22, 1.22],
    opacity: [0.5, 0, 0],
    transition: { duration: 2.2, repeat: Infinity, ease: [0.215, 0.61, 0.355, 1] },
  },
};

const pulseRing2 = {
  animate: {
    scale: [1, 1.22, 1.22],
    opacity: [0.3, 0, 0],
    transition: { duration: 2.2, repeat: Infinity, ease: [0.215, 0.61, 0.355, 1], delay: 0.5 },
  },
};

const scanLine = {
  animate: {
    top: ["12%", "78%", "12%"],
    opacity: [0.9, 0.4, 0.9],
    transition: { duration: 2.2, repeat: Infinity, ease: "easeInOut" },
  },
};

const heroSlideIn = {
  hidden: { opacity: 0, x: -24 },
  show: { opacity: 1, x: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

const heroStagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.15 } },
};

/* ─── Helpers ────────────────────────────────────────────────────── */
function normalizeCompaniesPayload(raw) {
  let arr = [];
  if (Array.isArray(raw)) arr = raw;
  else if (Array.isArray(raw?.data)) arr = raw.data;
  else if (raw?.data && typeof raw.data === "object") arr = Object.values(raw.data);
  else if (raw && typeof raw === "object") arr = Object.values(raw);
  return arr.map((r) => {
    const get = (o, ...keys) => keys.reduce((v, k) => v ?? o?.[k], undefined);
    const code = get(r, "code", "CODE", "Code") ?? get(r, "database", "DATABASE", "Database") ?? "";
    const company = get(r, "company", "COMPANY", "Company") ?? get(r, "database", "DATABASE", "Database") ?? get(r, "code", "CODE", "Code") ?? "";
    const database = get(r, "database", "DATABASE", "Database") ?? "";
    return {
      code: String(code || "").trim(),
      company: String(company || "").trim(),
      database: String(database || "").trim(),
    };
  });
}

function Spinner({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="animate-spin" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" className="opacity-25" />
      <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0A12 12 0 002 12h2z" />
    </svg>
  );
}

/* ─── Field wrapper ──────────────────────────────────────────────── */
function Field({ label, right, children }) {
  return (
    <motion.div variants={fadeUp}>
      {(label || right) && (
        <div className="mb-1.5 flex items-center justify-between">
          {label && (
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
              {label}
            </span>
          )}
          {right}
        </div>
      )}
      {children}
    </motion.div>
  );
}

/* ─── Input box with animated focus underline ────────────────────── */
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

const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 2500,
  timerProgressBar: true,
  width: "22rem",
  customClass: {
    popup: "rounded-xl shadow-lg text-sm",
    title: "text-sm font-semibold",
  },
});

const showToast = (icon, title, text = "") => {
  Toast.fire({ icon, title, text });
};

const waitForLoginApproval = async (
  requestId,
  maxWaitMs = 60000,
  shouldCancel = () => false
) => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < maxWaitMs) {
    if (shouldCancel()) return "cancelled";

    const { data } = await apiClient.get(`/login/request-status/${requestId}`);

    if (shouldCancel()) return "cancelled";
    if (data?.status === "approved") return "approved";
    if (data?.status === "denied") return "denied";
    if (data?.status === "expired") return "expired";

    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  return shouldCancel() ? "cancelled" : "expired";
};

/* ════════════════════════════════════════════════════════════════════
   Login
   ════════════════════════════════════════════════════════════════════ */
export default function Login({ onSwitchToRegister }) {
  const { login, loginWithBiometric } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ USER_CODE: "", PASSWORD: "" });
  const [companies, setCompanies] = useState([]);
  const [companyCode, setCompanyCode] = useState(localStorage.getItem("companyCode") || "");
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isBioLoading, setIsBioLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [capsOn, setCapsOn] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const pwdRef = useRef(null);

  /* ── Load companies ── */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoadingCompanies(true);
        const { data } = await apiClient.get("/companies");
        const options = normalizeCompaniesPayload(data).filter((x) => x.code || x.database);
        if (!alive) return;
        setCompanies(options);
        setCompanyCode((currentCompanyCode) => {
          if (!currentCompanyCode && options.length === 1) {
            return options[0].code || options[0].database || "";
          }
          if (
            currentCompanyCode &&
            !options.some(
              (o) => o.code === currentCompanyCode || o.database === currentCompanyCode
            ) &&
            options[0]
          ) {
            return options[0].code || options[0].database || "";
          }
          return currentCompanyCode;
        });
      } catch (e) {
        useSwalErrorAlert(
          "Unable to load companies",
          e?.response?.data?.message || e?.message || "Please check the /api/companies endpoint."
        );
      } finally {
        if (alive) setLoadingCompanies(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (companyCode) localStorage.setItem("companyCode", companyCode);
  }, [companyCode]);

  const setBioAuthInProgress = (v) => {
    try {
      if (v) sessionStorage.setItem("bioAuthInProgress", "1");
      else sessionStorage.removeItem("bioAuthInProgress");
    } catch { }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };
  const handleCaps = (e) => setCapsOn(e.getModifierState && e.getModifierState("CapsLock"));

  /* ── Password login ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.USER_CODE.trim() || !form.PASSWORD) return;

    if (!companyCode) {
      showToast("warning", "Select Company", "Please choose a company before logging in.");
      return;
    }

    setTenant(companyCode);
    await ensureCsrf();
    setIsLoading(true);

    try {
      await login({
        companyCode,
        USER_CODE: form.USER_CODE.trim(),
        PASSWORD: form.PASSWORD,
      });

      showToast("success", "Welcome back!", "You have successfully signed in.");
      navigate("/", { replace: true });
    } catch (err) {
      const status = err?.response?.status;
      const code = err?.response?.data?.code;
      const msg = err?.response?.data?.message || err?.message || "Please try again.";

      const isApprovalRequired =
        status === 409 &&
        (code === "LOGIN_APPROVAL_REQUIRED" || code === "ACTIVE_SESSION");

      if (isApprovalRequired) {
        const requestId = err?.response?.data?.requestId;

        if (!requestId) {
          showToast(
            "error",
            "Login blocked",
            "Active session detected but no approval request was created."
          );
          return;
        }

        let approvalCancelled = false;

Swal.fire({
  title: "",
  html: `
    <div style="text-align:center;">
      <div style="height:36px;width:36px;margin:0 auto 10px;border-radius:999px;background:linear-gradient(135deg,#dbeafe,#bfdbfe);display:flex;align-items:center;justify-content:center;color:#1d4ed8;font-size:17px;font-weight:800;">
        ⏳
      </div>
      <div style="font-size:15px;font-weight:800;color:#0f172a;line-height:1.2;">
        Waiting for Approval
      </div>
      <div style="font-size:12px;color:#64748b;line-height:1.45;margin-top:8px;">
        A confirmation request was sent to the active session.
      </div>
    </div>
  `,
  width: "min(320px, calc(100vw - 28px))",
  padding: "0.9rem",
  background: "#ffffff",
  backdrop: "rgba(15, 23, 42, 0.30)",
  allowOutsideClick: false,
  allowEscapeKey: false,
  heightAuto: false,
  showCancelButton: true,
  showConfirmButton: false,
  cancelButtonText: "Cancel",
  buttonsStyling: false,
  customClass: {
    popup: "rounded-2xl shadow-2xl border border-slate-200",
    htmlContainer: "m-0",
    actions: "mt-3 w-full",
    cancelButton:
      "w-full rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200",
  },
}).then((res) => {
  if (res.dismiss) approvalCancelled = true;
});

const approvalStatus = await waitForLoginApproval(
  requestId,
  60000,
  () => approvalCancelled
);

Swal.close();
        

        if (approvalStatus === "approved") {
          try {
            await login({
              companyCode,
              USER_CODE: form.USER_CODE.trim(),
              PASSWORD: form.PASSWORD,
              approvalRequestId: requestId,
            });

            showToast("success", "Welcome back!", "You have successfully signed in.");
            navigate("/", { replace: true });
          } catch (approvedLoginErr) {
            showToast(
              "error",
              "Login failed",
              approvedLoginErr?.response?.data?.message ||
                approvedLoginErr?.message ||
                "Please try again."
            );
          }

          return;
        }

        if (approvalStatus === "denied") {
          showToast("error", "Login denied", "The active session denied your login request.");
          return;
        }

        if (approvalStatus === "cancelled") {
          showToast("info", "Login cancelled", "You cancelled the approval request.");
          return;
        }

        showToast("warning", "Approval expired", "No response was received from the active session.");
        return;
      }

      if (status === 403 && code === "PENDING") {
        showToast("info", "Awaiting Administrator Approval", "Your account is pending activation.");
        return;
      }

      if (status === 403 && code === "INACTIVE") {
        showToast("error", "Account Inactive", msg || "Your account has been deactivated.");
        return;
      }

      if (status === 403 && code === "LOCKED") {
        showToast("error", "Account Locked", msg || "Your account has been locked.");
        return;
      }

      if (status === 403 && code === "PASSWORD_EXPIRED") {
        showToast("warning", "Password Expired", msg || "Your password has expired.");
        navigate(
          `/change-password?user=${encodeURIComponent(form.USER_CODE.trim())}&mode=expired&company=${encodeURIComponent(companyCode)}`
        );
        return;
      }

      if (status === 429 && code === "SEAT_LIMIT") {
        showToast("warning", "Login Limit Reached", msg || "Maximum concurrent users reached.");
        return;
      }

      showToast("error", "Login failed", msg);
    } finally {
      setIsLoading(false);
    }
  };

  /* ── Biometric login ── */
  const handleBiometricLogin = async () => {
    try {
      if (!companyCode) {
        showToast("warning", "Select Company", "Please choose a company before logging in.");
        return;
      }

      if (!window.PublicKeyCredential || typeof navigator.credentials?.get !== "function") {
        showToast("error", "Biometric Login Not Supported", "This browser or device does not support biometric login.");
        return;
      }

      setBioAuthInProgress(true);
      setIsBioLoading(true);
      setTenant(companyCode);

      const optionRes = await bioLoginOptionsPasswordless();
      if (!optionRes?.success || !optionRes?.data) {
        throw new Error(optionRes?.message || "Failed to load biometric login options.");
      }

      const publicKey = prepareLoginPublicKey(optionRes.data);
      const credential = await navigator.credentials.get({ publicKey });
      if (!credential) throw new Error("Biometric authentication was cancelled.");

      await loginWithBiometric({
        companyCode,
        payload: { credential: serializeLoginCredential(credential) },
      });

      showToast("success", "Welcome back!", "Biometric authentication successful.");
      navigate("/", { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Unable to login using biometrics.";

      if (err?.name === "NotAllowedError") {
        showToast("info", "Biometric Login Cancelled", "Authentication was cancelled or timed out.");
        return;
      }

      showToast("error", "Biometric Login Failed", msg);
    } finally {
      setBioAuthInProgress(false);
      setIsBioLoading(false);
    }
  };

  /* ════════════════════════════════════════════════════════════════
     Render
     ════════════════════════════════════════════════════════════════ */
  return (
    <div
      className="relative min-h-screen overflow-hidden px-4 pt-6 pb-20 text-slate-900 sm:px-6 lg:px-8"
      style={{
        backgroundImage: "url('/NAYSABG.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Overlays */}
      <div className="pointer-events-none absolute inset-0 bg-slate-950/35" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-950/55 via-sky-950/25 to-blue-900/20" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_26%_18%,rgba(56,189,248,.25),transparent_28%),radial-gradient(circle_at_75%_30%,rgba(147,197,253,.16),transparent_26%)]" />

      <div className="relative mx-auto flex min-h-[calc(100vh-8.5rem)] w-full max-w-7xl items-center justify-center">
        <div className="grid w-full grid-cols-1 items-center gap-8 lg:grid-cols-[1.08fr_.92fr]">

          {/* ── Left brand / tagline (desktop only) ── */}
          <motion.section
            variants={heroStagger}
            initial="hidden"
            animate="show"
            className="hidden lg:block"
          >
            <motion.div
              variants={heroSlideIn}
              className="mb-6 inline-flex items-center gap-3 rounded-full border border-white/50 bg-white/16 px-6 py-2.5 text-xs font-extrabold uppercase tracking-[0.28em] text-white shadow-xl backdrop-blur-md"
            >
              NAYSA-SOLUTIONS INCORPORATED
            </motion.div>

            <motion.h1
              variants={heroSlideIn}
              className="whitespace-nowrap text-4xl font-black uppercase leading-none tracking-[0.06em] text-white drop-shadow-[0_5px_18px_rgba(0,0,0,.45)] xl:text-5xl 2xl:text-6xl"
            >
              WE MAKE LIFE EASIER
            </motion.h1>

            <motion.p
              variants={heroSlideIn}
              className="mt-5 max-w-2xl text-2xl font-bold uppercase tracking-[0.18em] text-sky-100 drop-shadow-[0_3px_12px_rgba(0,0,0,.45)]"
            >
              THROUGH BUSINESS APPLICATIONS
            </motion.p>

            <motion.div
              variants={heroSlideIn}
              className="my-7 h-1 w-28 rounded-full bg-sky-400 shadow-[0_0_22px_rgba(56,189,248,.8)]"
            />

            <motion.p
              variants={heroSlideIn}
              className="max-w-2xl text-base font-medium leading-8 text-white/95 drop-shadow-[0_2px_10px_rgba(0,0,0,.55)]"
            >
              Powerful business applications built to streamline operations, support compliance,
              and help your team work faster with NAYSA Cloud.
            </motion.p>
          </motion.section>

          {/* ── Login card ── */}
          <section className="flex items-center justify-center">
            <div className="relative w-full max-w-md">

              {/* Logo + title */}
              <div className="mb-4 flex flex-col items-center text-center">
                <motion.div {...floatAnim} className="mb-1">
                  <img
                    src="/naysa_logo.png"
                    alt="NAYSA Logo"
                    className="w-36 drop-shadow-[0_6px_18px_rgba(0,0,0,.35)] md:w-40"
                  />
                </motion.div>
                <motion.h1
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.05 }}
                  className="mt-1 text-2xl font-extrabold tracking-tight text-white drop-shadow-[0_4px_15px_rgba(0,0,0,.5)] md:text-3xl"
                >
                  NAYSA Financials Cloud
                </motion.h1>
              </div>

              {/* Card */}
              <motion.div
                initial={{ opacity: 0, x: 42, scale: 0.98 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -42, scale: 0.98 }}
                transition={{ duration: 0.45, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
                className="relative w-full rounded-3xl p-7"
                style={{
                  background: "rgba(255,255,255,0.90)",
                  border: "1px solid rgba(255,255,255,0.68)",
                  backdropFilter: "blur(18px)",
                  WebkitBackdropFilter: "blur(18px)",
                  boxShadow: "0 24px 70px rgba(2,6,23,.32), inset 0 1px 0 rgba(255,255,255,.9)",
                }}
              >
                <div
                  className="absolute left-10 right-10 top-0 h-px rounded-full"
                  style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,.95), transparent)" }}
                />

                <motion.form
                  onSubmit={handleSubmit}
                  noValidate
                  variants={staggerContainer}
                  initial="hidden"
                  animate="show"
                  className="space-y-4"
                >
                  {/* Company */}
                  <Field
                    label={
                      <>
                        Company
                        {!loadingCompanies && companies.length > 0 && (
                          <span className="ml-1.5 font-semibold normal-case tracking-normal text-slate-600">
                            ({companies.length} found)
                          </span>
                        )}
                      </>
                    }
                  >
                    <div className="relative">
                      <div className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2">
                        <Building2 size={14} className="text-slate-500" />
                      </div>
                      <select
                        value={companyCode}
                        onChange={(e) => setCompanyCode(e.target.value)}
                        disabled={loadingCompanies || isLoading || isBioLoading}
                        className={inputCls + " appearance-none cursor-pointer pr-9"}
                        required
                      >
                        <option value="" disabled>
                          {loadingCompanies ? "Loading companies…" : "Select a company"}
                        </option>
                        {companies.map((c) => {
                          const value = c.code || c.database;
                          const label = c.company || value || "(unnamed)";
                          return <option key={value || label} value={value}>{label}</option>;
                        })}
                      </select>
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                        <FiChevronDown size={14} />
                      </span>
                    </div>
                  </Field>

                  {/* User ID */}
                  <Field label="User ID">
                    <InputBox icon={FiUser}>
                      <input
                        type="text"
                        name="USER_CODE"
                        autoComplete="username"
                        value={form.USER_CODE}
                        onChange={handleChange}
                        placeholder="Enter your user ID"
                        className={inputCls}
                        required
                      />
                    </InputBox>
                  </Field>

                  {/* Password */}
                  <Field
                    label="Password"
                    right={
                      <AnimatePresence>
                        {capsOn && (
                          <motion.span
                            key="caps"
                            initial={{ opacity: 0, scale: 0.85 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.85 }}
                            className="rounded-full bg-sky-100 px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-sky-700"
                          >
                            CAPS LOCK ON
                          </motion.span>
                        )}
                      </AnimatePresence>
                    }
                  >
                    <InputBox icon={FiLock}>
                      <input
                        ref={pwdRef}
                        type={showPwd ? "text" : "password"}
                        name="PASSWORD"
                        autoComplete="current-password"
                        value={form.PASSWORD}
                        onChange={handleChange}
                        onKeyUp={handleCaps}
                        onKeyDown={handleCaps}
                        placeholder="Enter your password"
                        className={inputCls + " pr-12"}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd((s) => !s)}
                        className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-md p-1 text-slate-500 transition hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                        aria-label={showPwd ? "Hide password" : "Show password"}
                      >
                        {showPwd ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                      </button>
                    </InputBox>
                  </Field>

                  {/* Forgot password */}
                  <motion.div variants={fadeUp} className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowForgot(true)}
                      className="text-sm font-bold text-sky-700 transition hover:text-blue-700"
                    >
                      Forgot Password?
                    </button>
                  </motion.div>

                  {/* Sign In + Biometric row */}
                   <motion.div
                    variants={fadeUp}
                    className="grid grid-cols-[1fr_auto_auto] items-center"
                  >
                    <motion.button
                      type="submit"
                      disabled={isLoading || isBioLoading || loadingCompanies || !companyCode || !form.USER_CODE.trim() || !form.PASSWORD}
                      whileHover={{ y: -1 }}
                      whileTap={{ y: 0 }}
                      className="flex min-h-[46px] items-center justify-center gap-2 rounded-lg px-3 py-3 text-sm font-extrabold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
                      style={{ background: "linear-gradient(135deg,#0369a1 0%,#1d4ed8 100%)" }}
                    >
                      {isLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <Spinner size={16} /> Signing in…
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          Sign In <FiArrowRight size={15} />
                        </span>
                      )}
                    </motion.button>

                    <div className="mx-2 h-8 w-px bg-slate-400/60" />

                    <motion.button
                      type="button"
                      onClick={handleBiometricLogin}
                      disabled={isLoading || isBioLoading || loadingCompanies || !companyCode}
                      whileHover={{ y: -1 }}
                      whileTap={{ y: 0 }}
                      className="flex h-[46px] w-[54px] shrink-0 items-center justify-center rounded-lg bg-white/85 p-0 text-slate-800 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="Biometric Sign In"
                      title="Biometric Sign In"
                    >
                      {isBioLoading ? <Spinner size={18} /> : <Fingerprint size={24} className="text-sky-600" />}
                    </motion.button>
                  </motion.div>
                </motion.form>

                {/* Register link */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.4 }}
                  className="mt-5 text-center"
                >
                  <button
                    type="button"
                    onClick={onSwitchToRegister}
                    className="text-sm font-medium text-slate-700 transition-all duration-300 hover:text-slate-950 hover:tracking-wide"
                  >
                    Don't have an account? <span className="font-bold text-sky-700 hover:text-blue-700">Sign Up</span>
                  </button>
                </motion.div>
              </motion.div>
            </div>
          </section>
        </div>
      </div>

      <ForgotPassword
        open={showForgot}
        onClose={() => setShowForgot(false)}
        companies={companies}
        defaultCompanyCode={companyCode}
      />

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
}