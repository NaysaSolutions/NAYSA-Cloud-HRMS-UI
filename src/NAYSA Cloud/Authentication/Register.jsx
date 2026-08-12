// import React, { useEffect, useState, useRef } from "react";
// import { FiUser, FiMail, FiLock, FiEye, FiEyeOff, FiUserPlus, FiGlobe } from "react-icons/fi";
// import Swal from "sweetalert2";
// import { apiClient, getTenant, setTenant } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";

// function normalizeCompaniesPayload(raw) {
//   const toArray = (x) =>
//     Array.isArray(x) ? x : x && typeof x === "object" ? Object.values(x) : [];
//   let arr = [];
//   if (Array.isArray(raw)) arr = raw;
//   else if (Array.isArray(raw?.data)) arr = raw.data;
//   else if (raw?.data && typeof raw.data === "object") arr = Object.values(raw.data);
//   else if (raw && typeof raw === "object") arr = Object.values(raw);



//   return arr.map((r) => {
//     const get = (o, ...keys) => keys.reduce((v, k) => (v ?? o?.[k]), undefined);
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

// export default function Register({ onRegister, onSwitchToLogin }) {
//   const [form, setForm] = useState({
//     USER_CODE: "",
//     USER_NAME: "",
//     EMAIL_ADD: "",
//     // PASSWORD: "",
//   });


//   const [companies, setCompanies] = useState([]);
//   const [companyCode, setCompanyCode] = useState(getTenant() || "");
//   const [loadingCompanies, setLoadingCompanies] = useState(true);

//   const [isLoading, setIsLoading] = useState(false);
//   const [showPwd, setShowPwd] = useState(false);
//   const [capsOn, setCapsOn] = useState(false);
//   const pwdRef = useRef(null);


//   useEffect(() => {
//     let alive = true;
//     (async () => {
//       try {
//         setLoadingCompanies(true);
//         const { data } = await apiClient.get("/companies");
//         const options = normalizeCompaniesPayload(data).filter((x) => x.code || x.database);

//         if (!alive) return;
//         setCompanies(options);


//         if (!companyCode && options.length === 1) {
//           setCompanyCode(options[0].code || options[0].database || "");
//         } else if (
//           companyCode &&
//           !options.some((o) => o.code === companyCode || o.database === companyCode)
//         ) {
//           if (options[0]) setCompanyCode(options[0].code || options[0].database || "");
//         }
//       } catch (e) {
//         await Swal.fire({
//           icon: "error",
//           title: "Unable to load companies",
//           text: e?.response?.data?.message || e?.message || "Please check /api/companies.",
//         });
//       } finally {
//         if (alive) setLoadingCompanies(false);
//       }
//     })();
//     return () => {
//       alive = false;
//     };
//   }, []); // once



//   useEffect(() => {
//     if (companyCode) setTenant(companyCode);
//   }, [companyCode]);

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setForm((s) => ({ ...s, [name]: value }));
//   };

//   const handleCaps = (e) =>
//     setCapsOn(e.getModifierState && e.getModifierState("CapsLock"));

//   const alertSwal = async (text) => {
//     await Swal.fire({ title: "Error", text, icon: "error", confirmButtonText: "OK" });
//     return false;
//   };

//   const validate = async () => {
//     if (!companyCode) return alertSwal("Please select a company.");
//     if (!form.USER_CODE.trim()) return alertSwal("User ID is required");
//     if (!form.USER_NAME.trim()) return alertSwal("Username is required");
//     if (!form.EMAIL_ADD.trim()) return alertSwal("Email is required");
//     if (!/\S+@\S+\.\S+/.test(form.EMAIL_ADD)) return alertSwal("Please enter a valid email address");
//     // if (form.PASSWORD.length < 6) return alertSwal("Password must be at least 6 characters long");
//     return true;
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setIsLoading(true);
//     try {
//       const ok = await validate();
//       if (!ok) return;


//       setTenant(companyCode);
//       const { data, status } = await apiClient.post("/register", {
//         USER_CODE: form.USER_CODE.trim(),
//         USER_NAME: form.USER_NAME.trim(),
//         EMAIL_ADD: form.EMAIL_ADD.trim(),
//         // PASSWORD: form.PASSWORD,
//       });

//       const success = data?.status === "success" || status === 201;
//       if (!success) throw new Error(data?.message || "Registration failed");

//       onRegister?.(
//         data?.data || {
//           USER_CODE: form.USER_CODE,
//           USER_NAME: form.USER_NAME,
//           EMAIL_ADD: form.EMAIL_ADD,
//         }
//       );

//       await Swal.fire({
//         icon: "success",
//         title: "Registration Submitted",
//         text: "Your registration is pending approval. You will receive an email once your account is approved.",
//         confirmButtonText: "OK",
//       });

//       onSwitchToLogin?.();
//     } catch (err) {
//       await Swal.fire({
//         icon: "error",
//         title: "Registration Failed",
//         text: err?.response?.data?.message || err?.message || "Something went wrong during registration",
//         confirmButtonText: "OK",
//       });
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//     <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(to_bottom,#7392b7,#d8e1e9)]">
//       {/* Decorative blobs */}
//       <div className="pointer-events-none absolute inset-0 -z-10">
//         <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-gradient-to-tr from-indigo-300/30 to-sky-200/30 blur-3xl" />
//         <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-gradient-to-tr from-purple-500/25 to-fuchsia-400/25 blur-3xl" />
//       </div>

//       <div className="mx-auto flex max-w-6xl flex-col items-center justify-start px-4 pt-6 md:pt-10 lg:pt-12 pb-24">
//         <div className="mb-4 md:mb-6 flex flex-col items-center text-center">
//           <img src="/naysa_logo.png" alt="NAYSA Logo" className="w-40 md:w-44 drop-shadow-md" />
//           <h1 className="mt-3 text-2xl font-bold tracking-tight text-blue-900 md:text-3xl">
//             NAYSA Financials Cloud
//           </h1>
//         </div>

//         <div className="w-full max-w-md rounded-2xl border border-white/40 bg-white/40 dark:bg-white/10 p-6 shadow-xl backdrop-blur-md">
//           <form onSubmit={handleSubmit} noValidate className="space-y-4 mt-3">
//             <label className="block">
//               <span className="mb-1 block text-sm font-medium text-slate-700">
//                 Company
//                 {!loadingCompanies && (
//                   <span className="ml-2 text-xs text-slate-500">({companies.length} found)</span>
//                 )}
//               </span>
//               <div className="relative">
//                 <FiGlobe className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
//                 <select
//                   value={companyCode}
//                   onChange={(e) => {
//                     const v = e.target.value;
//                     setCompanyCode(v);
//                     setTenant(v);
//                   }}
//                   disabled={loadingCompanies}
//                   className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-10 text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
//                   required
//                 >
//                   <option value="" disabled>
//                     {loadingCompanies ? "Loading companies…" : "Select a company"}
//                   </option>
//                   {companies.map((c) => {
//                     const value = c.code || c.database;
//                     const label = c.company || "(Unnamed company)";
//                     return (
//                       <option key={value || label} value={value}>
//                         {label}
//                       </option>
//                     );
//                   })}
//                 </select>
//               </div>
//             </label>

//             {/* USER_CODE */}
//             <label className="block">
//               <span className="mb-1 block text-sm font-medium text-slate-700">User ID</span>
//               <div className="relative">
//                 <FiUser className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
//                 <input
//                   type="text"
//                   name="USER_CODE"
//                   value={form.USER_CODE}
//                   onChange={handleChange}
//                   required
//                   className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-slate-900 shadow-sm outline-none ring-0 transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
//                   placeholder="Enter your user ID"
//                 />
//               </div>
//             </label>

//             {/* USER_NAME */}
//             <label className="block">
//               <span className="mb-1 block text-sm font-medium text-slate-700">Username</span>
//               <div className="relative">
//                 <FiUser className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
//                 <input
//                   type="text"
//                   name="USER_NAME"
//                   value={form.USER_NAME}
//                   onChange={handleChange}
//                   autoComplete="username"
//                   required
//                   className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-slate-900 shadow-sm outline-none ring-0 transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
//                   placeholder="Choose a username"
//                 />
//               </div>
//             </label>

//             {/* EMAIL_ADD */}
//             <label className="block">
//               <span className="mb-1 block text-sm font-medium text-slate-700">Email</span>
//               <div className="relative">
//                 <FiMail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
//                 <input
//                   type="email"
//                   name="EMAIL_ADD"
//                   value={form.EMAIL_ADD}
//                   onChange={handleChange}
//                   autoComplete="email"
//                   required
//                   className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-slate-900 shadow-sm outline-none ring-0 transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
//                   placeholder="you@example.com"
//                 />
//               </div>
//             </label>

//             {/* PASSWORD */}
//             {/* <label className="block">
//               <div className="mb-1 flex items-center justify-between">
//                 <span className="text-sm font-medium text-slate-700">Password</span>
//                 {capsOn && <span className="text-xs font-semibold text-white">Caps Lock is ON</span>}
//               </div>
//               <div className="relative">
//                 <FiLock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
//                 <input
//                   ref={pwdRef}
//                   type={showPwd ? "text" : "password"}
//                   name="PASSWORD"
//                   value={form.PASSWORD}
//                   onChange={handleChange}
//                   onKeyUp={handleCaps}
//                   onKeyDown={handleCaps}
//                   autoComplete="new-password"
//                   required
//                   className="w-full rounded-xl border border-slate-200 bg-white/90 py-3 pl-10 pr-12 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
//                   placeholder="••••••••"
//                 />
//                 <button
//                   type="button"
//                   onClick={() => setShowPwd((s) => !s)}
//                   className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
//                   aria-label={showPwd ? "Hide password" : "Show password"}
//                 >
//                   {showPwd ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
//                 </button>
//               </div>
//             </label> */}

//             {/* Submit */}
//             <button
//               type="submit"
//               disabled={
//                 isLoading ||
//                 loadingCompanies ||
//                 !companyCode ||
//                 !form.USER_CODE.trim() ||
//                 !form.USER_NAME.trim() ||
//                 !form.EMAIL_ADD.trim()
//               }
//               className="group relative inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 px-4 py-3 font-medium text-white shadow-lg shadow-sky-600/20 transition hover:from-sky-500 hover:to-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
//             >
//               {isLoading ? (
//                 <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
//                   <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" className="opacity-25" />
//                   <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0A12 12 0 002 12h2z" />
//                 </svg>
//               ) : (
//                 <>
//                   <FiUserPlus className="h-5 w-5" />
//                   <span>Register</span>
//                 </>
//               )}
//             </button>
//           </form>

//           <div className="mt-6 text-center">
//             <button onClick={onSwitchToLogin} className="text-sm text-slate-700 hover:underline">
//               Already have an account? <span className="text-sky-700">Log in</span>
//             </button>
//             <p className="mt-3 text-xs text-slate-500">© {new Date().getFullYear()} NAYSA. All rights reserved.</p>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

import React, { useEffect, useState, useRef } from "react";
import {
  FiUser,
  FiMail,
  FiChevronDown,
  FiUserPlus,
} from "react-icons/fi";
import { Building2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiClient, getTenant, setTenant } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import {
  useSwalErrorAlert,
  useSwalSuccessAlert,
  useSwalErrorAlertAPI,
} from "@/NAYSA Cloud/Global/behavior.jsx";
import Login from "./Login";

/* ─── Animation variants — same as Login ────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
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

/* ─── Helpers ────────────────────────────────────────────────────── */
function normalizeCompaniesPayload(raw) {
  let arr = [];
  if (Array.isArray(raw)) arr = raw;
  else if (Array.isArray(raw?.data)) arr = raw.data;
  else if (raw?.data && typeof raw.data === "object") arr = Object.values(raw.data);
  else if (raw && typeof raw === "object") arr = Object.values(raw);
  return arr.map((r) => {
    const get = (o, ...keys) => keys.reduce((v, k) => (v ?? o?.[k]), undefined);
    const code     = get(r, "code", "CODE", "Code") ?? get(r, "database", "DATABASE", "Database") ?? "";
    const company  = get(r, "company", "COMPANY", "Company") ?? get(r, "database", "DATABASE", "Database") ?? get(r, "code", "CODE", "Code") ?? "";
    const database = get(r, "database", "DATABASE", "Database") ?? "";
    return {
      code:     String(code || "").trim(),
      company:  String(company || "").trim(),
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
function Field({ label, hint, children }) {
  return (
    <motion.div variants={fadeUp}>
      {label && (
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </span>
      )}
      {children}
      {hint && <div className="mt-1 min-h-[16px] text-xs">{hint}</div>}
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

const inputErrorCls =
  "w-full rounded-xl border border-red-400 bg-white py-3 pl-10 pr-4 " +
  "text-sm text-slate-900 placeholder:text-slate-400 outline-none shadow-sm " +
  "transition-colors focus:border-red-500 focus:ring-2 focus:ring-red-400/20 " +
  "disabled:opacity-50 disabled:cursor-not-allowed";

/* ════════════════════════════════════════════════════════════════════
   Register
   ════════════════════════════════════════════════════════════════════ */
export default function Register({ onRegister, onSwitchToLogin }) {
  const [showLogin, setShowLogin] = useState(false);

  const [form, setForm] = useState({
    USER_CODE: "",
    USER_NAME: "",
    EMAIL_ADD: "",
  });

  const [companies, setCompanies] = useState([]);
  const [companyCode, setCompanyCode] = useState(getTenant() || "");
  const [loadingCompanies, setLoadingCompanies] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [checkingUserCode, setCheckingUserCode] = useState(false);
  const [userCodeExists, setUserCodeExists] = useState(false);
  const [debouncedUserCode, setDebouncedUserCode] = useState("");

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
        if (!companyCode && options.length === 1) {
          setCompanyCode(options[0].code || options[0].database || "");
        } else if (
          companyCode &&
          !options.some((o) => o.code === companyCode || o.database === companyCode)
        ) {
          if (options[0]) setCompanyCode(options[0].code || options[0].database || "");
        }
      } catch (e) {
        useSwalErrorAlertAPI(
          "Unable to load companies",
          e?.response?.data?.message || e?.message || "Please check /api/companies."
        );
      } finally {
        if (alive) setLoadingCompanies(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (companyCode) setTenant(companyCode);
  }, [companyCode]);

  /* ── Debounce User Code ── */
  useEffect(() => {
    const t = setTimeout(() => setDebouncedUserCode(form.USER_CODE.trim()), 500);
    return () => clearTimeout(t);
  }, [form.USER_CODE]);

  /* ── Check user code existence ── */
  const checkUserCodeAlreadyExists = async (userCode) => {
    const trimmed = String(userCode || "").trim();
    if (!trimmed || !companyCode) return false;
    try {
      setCheckingUserCode(true);
      setTenant(companyCode);
      const { data } = await apiClient.get("/getUser", { params: { USER_CODE: trimmed } });
      let foundUser = null;
      if (data?.data && Array.isArray(data.data) && data.data[0]?.result) {
        try {
          const parsed = JSON.parse(data.data[0].result);
          if (Array.isArray(parsed) && parsed.length > 0) foundUser = parsed[0];
        } catch {}
      } else if (data?.result) {
        try {
          const parsed = JSON.parse(data.result);
          if (Array.isArray(parsed) && parsed.length > 0) foundUser = parsed[0];
        } catch {}
      } else if (Array.isArray(data) && data.length > 0) {
        foundUser = data[0];
      }
      return !!foundUser;
    } catch {
      return false;
    } finally {
      setCheckingUserCode(false);
    }
  };

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (!companyCode || !debouncedUserCode) {
        setCheckingUserCode(false);
        setUserCodeExists(false);
        return;
      }
      const exists = await checkUserCodeAlreadyExists(debouncedUserCode);
      if (!active) return;
      setUserCodeExists(exists);
    };
    run();
    return () => { active = false; };
  }, [debouncedUserCode, companyCode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
    if (name === "USER_CODE") setUserCodeExists(false);
  };

  const alertSwal = (text) => {
    useSwalErrorAlert("Error", text);
    return false;
  };

  const validate = () => {
    if (!companyCode)              return alertSwal("Please select a company.");
    if (!form.USER_CODE.trim())    return alertSwal("User ID is required.");
    if (!form.USER_NAME.trim())    return alertSwal("Username is required.");
    if (!form.EMAIL_ADD.trim())    return alertSwal("Email is required.");
    if (!/\S+@\S+\.\S+/.test(form.EMAIL_ADD)) return alertSwal("Please enter a valid email address.");
    if (userCodeExists)            return alertSwal(`User ID "${form.USER_CODE.trim()}" already exists. Please use a different User ID.`);
    return true;
  };

  const goToLogin = () => {
    if (typeof onSwitchToLogin === "function") { onSwitchToLogin(); return; }
    setShowLogin(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    try {
      setTenant(companyCode);
      const { data, status } = await apiClient.post("/register", {
        USER_CODE: form.USER_CODE.trim(),
        USER_NAME: form.USER_NAME.trim(),
        EMAIL_ADD: form.EMAIL_ADD.trim(),
      });
      const success = data?.status === "success" || status === 201;
      if (!success) throw new Error(data?.message || "Registration failed");
      onRegister?.(data?.data || { USER_CODE: form.USER_CODE.trim(), USER_NAME: form.USER_NAME.trim(), EMAIL_ADD: form.EMAIL_ADD.trim() });
      useSwalSuccessAlert(
        "Registration Submitted",
        "Your registration is pending approval. You will receive an email once your account is approved."
      );
      goToLogin();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Something went wrong during registration";
      if (msg.toLowerCase().includes("user id already exists")) setUserCodeExists(true);
      useSwalErrorAlertAPI("Registration Failed", msg);
    } finally {
      setIsLoading(false);
    }
  };

  if (showLogin) {
  return (
    <Login
      onSwitchToRegister={() => setShowLogin(false)}
    />
  );
}

  /* ── User ID status hint ── */
  const userCodeHint = checkingUserCode ? (
    <span className="text-slate-400 flex items-center gap-1">
      <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" aria-hidden>
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" className="opacity-25" />
        <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0A12 12 0 002 12h2z" />
      </svg>
      Checking…
    </span>
  ) : form.USER_CODE.trim() && userCodeExists ? (
    <span className="text-red-500 flex items-center gap-1">
      <span>✕</span> This User ID already exists.
    </span>
  ) : form.USER_CODE.trim() && companyCode ? (
    <span className="text-emerald-600 flex items-center gap-1">
      <span>✓</span> User ID is available.
    </span>
  ) : null;

  return (
    <div
      className="relative min-h-screen overflow-hidden px-4 pt-6 pb-20 text-slate-900 sm:px-6 lg:px-8"
      style={{
        backgroundImage:
          "linear-gradient(rgba(2, 12, 32, 0.45), rgba(2, 12, 32, 0.58)), url('/NAYSABG.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Blobs */}
      <motion.div
        {...blob1}
        className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(99,102,241,.28) 0%, rgba(56,189,248,.18) 100%)" }}
      />
      <motion.div
        {...blob2}
        className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(168,85,247,.22) 0%, rgba(217,70,239,.18) 100%)" }}
      />

      <div className="relative mx-auto grid min-h-[calc(100vh-8.5rem)] w-full max-w-7xl items-center gap-8 lg:grid-cols-[1.08fr_.92fr]">
        {/* ── Left marketing side ── */}
        <motion.section
          initial={{ opacity: 0, x: -34 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="hidden lg:block"
        >
          <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-white/50 bg-white/16 px-6 py-2.5 text-xs font-extrabold uppercase tracking-[0.28em] text-white shadow-xl backdrop-blur-md">
            NAYSA-SOLUTIONS INCORPORATED
          </div>

          <h1 className="whitespace-nowrap text-4xl font-black uppercase leading-none tracking-[0.06em] text-white drop-shadow-[0_5px_18px_rgba(0,0,0,.45)] xl:text-5xl 2xl:text-6xl">
            WE MAKE LIFE EASIER
          </h1>

          <h2 className="mt-5 max-w-2xl text-2xl font-bold uppercase tracking-[0.18em] text-sky-100 drop-shadow-[0_3px_12px_rgba(0,0,0,.45)]">
            THROUGH BUSINESS APPLICATIONS
          </h2>

          <div className="my-7 h-1 w-28 rounded-full bg-sky-400 shadow-[0_0_22px_rgba(56,189,248,.8)]" />

          <p className="max-w-2xl text-base font-medium leading-8 text-white/95 drop-shadow-[0_2px_10px_rgba(0,0,0,.55)]">
            Powerful business applications built to streamline operations, support compliance, and help your team work faster with NAYSA Cloud.
          </p>
        </motion.section>

        {/* ── Register card side ── */}
        <div className="relative w-full max-w-md justify-self-center lg:justify-self-end">
          {/* Logo + Title */}
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
              className="mt-1 whitespace-nowrap text-2xl font-extrabold tracking-tight text-white drop-shadow-[0_4px_15px_rgba(0,0,0,.5)] md:text-3xl"
            >
              NAYSA Financials Cloud
            </motion.h1>
          </div>

        {/* ── Card ── */}
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
          {/* Top shimmer line */}
          <div
            className="absolute top-0 left-10 right-10 h-px rounded-full"
            style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,1), transparent)" }}
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
                    <span className="ml-1.5 font-normal normal-case tracking-normal text-slate-400">
                      ({companies.length} found)
                    </span>
                  )}
                </>
              }
            >
              <div className="relative">
                <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 z-10">
                  <Building2 size={14} className="text-slate-400" />
                </div>
                <select
                  value={companyCode}
                  onChange={(e) => {
                    const v = e.target.value;
                    setCompanyCode(v);
                    setTenant(v);
                    setUserCodeExists(false);
                  }}
                  disabled={loadingCompanies}
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
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <FiChevronDown size={14} />
                </span>
              </div>
            </Field>

            {/* User ID + Username */}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="User ID" hint={userCodeHint}>
                <InputBox icon={FiUser}>
                  <input
                    type="text"
                    name="USER_CODE"
                    value={form.USER_CODE}
                    onChange={handleChange}
                    placeholder="Choose a user ID"
                    className={userCodeExists ? inputErrorCls : inputCls}
                    required
                  />
                </InputBox>
              </Field>

              <Field label="User Name">
                <InputBox icon={FiUser}>
                  <input
                    type="text"
                    name="USER_NAME"
                    value={form.USER_NAME}
                    onChange={handleChange}
                    autoComplete="name"
                    placeholder="Your full name"
                    className={inputCls}
                    required
                  />
                </InputBox>
              </Field>
            </div>

            {/* Email */}
            <Field label="Email">
              <InputBox icon={FiMail}>
                <input
                  type="email"
                  name="EMAIL_ADD"
                  value={form.EMAIL_ADD}
                  onChange={handleChange}
                  autoComplete="email"
                  placeholder="you@example.com"
                  className={inputCls}
                  required
                />
              </InputBox>
            </Field>

            {/* Submit */}
            <motion.div variants={fadeUp} className="pt-1">
              <motion.button
                type="submit"
                disabled={
                  isLoading ||
                  loadingCompanies ||
                  checkingUserCode ||
                  !companyCode ||
                  !form.USER_CODE.trim() ||
                  !form.USER_NAME.trim() ||
                  !form.EMAIL_ADD.trim() ||
                  userCodeExists
                }
                whileHover={{ y: -1, boxShadow: "0 8px 20px rgba(29,78,216,.35)" }}
                whileTap={{ y: 0 }}
                className="w-full rounded-xl py-3 text-sm font-semibold text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: "linear-gradient(135deg,#0369a1 0%,#1d4ed8 100%)" }}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Spinner size={16} /> Registering…
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <FiUserPlus size={15} /> Register
                  </span>
                )}
              </motion.button>
            </motion.div>

          </motion.form>

          {/* Login link */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="mt-5 text-center"
          >
            <button
              type="button"
              onClick={goToLogin}
              className="text-sm text-slate-600 transition-all duration-300 hover:text-slate-800 hover:tracking-wide"
            >
              Already have an account?{" "}
              <span className="font-semibold text-sky-700 hover:text-sky-600">Sign in</span>
            </button>
          </motion.div>
        </motion.div>
      </div>
      </div>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 z-30 w-full">
        <div className="w-full border-t border-white/20 bg-slate-950/70 px-4 py-3 backdrop-blur-md shadow-lg">
          <p className="text-center text-xs font-semibold tracking-wide text-white sm:text-sm">
            © 2026 NAYSA-SOLUTIONS, INC. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}