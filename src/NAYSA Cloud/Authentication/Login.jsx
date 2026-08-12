import React, { useEffect, useRef, useState } from "react";
import {
  FiArrowRight,
  FiChevronDown,
  FiEye,
  FiEyeOff,
  FiLock,
  FiUser,
} from "react-icons/fi";
import { Building2, Fingerprint } from "lucide-react";
import { motion } from "framer-motion";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";

import { useAuth } from "./AuthContext.jsx";
import ForgotPassword from "./ForgotPassword.jsx";

import {
  apiClient,
  setTenant,
  ensureCsrf,
  bioLoginOptionsPasswordless,
} from "@/NAYSA Cloud/Configuration/BaseURL.jsx";

import {
  prepareLoginPublicKey,
  serializeLoginCredential,
} from "@/NAYSA Cloud/Authentication/webauthn.js";

import { useSwalErrorAlert } from "@/NAYSA Cloud/Global/behavior.jsx";

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 " +
  "text-sm text-slate-900 placeholder:text-slate-400 outline-none shadow-sm " +
  "transition-colors focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 " +
  "disabled:cursor-not-allowed disabled:opacity-50";

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0 },
};

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

function showToast(icon, title, text = "") {
  Toast.fire({ icon, title, text });
}

function getPostLoginPath(loggedInUser) {
  return loggedInUser?.ACCOUNT_MODE === "LICENSE_ADMIN"
    ? "/heartstrong"
    : "/";
}

function Spinner({ size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className="animate-spin"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        fill="none"
        className="opacity-25"
      />
      <path
        fill="currentColor"
        className="opacity-75"
        d="M4 12a8 8 0 018-8V0A12 12 0 002 12h2z"
      />
    </svg>
  );
}

function normalizeCompaniesPayload(raw) {
  let arr = [];

  if (Array.isArray(raw)) arr = raw;
  else if (Array.isArray(raw?.data)) arr = raw.data;
  else if (raw?.data && typeof raw.data === "object") arr = Object.values(raw.data);
  else if (raw && typeof raw === "object") arr = Object.values(raw);

  return arr.map((row) => {
    const get = (obj, ...keys) =>
      keys.reduce((value, key) => value ?? obj?.[key], undefined);

    const code =
      get(row, "code", "CODE", "Code") ??
      get(row, "database", "DATABASE", "Database") ??
      "";

    const company =
      get(row, "company", "COMPANY", "Company") ??
      get(row, "database", "DATABASE", "Database") ??
      get(row, "code", "CODE", "Code") ??
      "";

    const database = get(row, "database", "DATABASE", "Database") ?? "";

    return {
      code: String(code || "").trim(),
      company: String(company || "").trim(),
      database: String(database || "").trim(),
    };
  });
}

async function waitForLoginApproval(
  requestId,
  maxWaitMs = 65000,
  shouldCancel = () => false
) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < maxWaitMs) {
    if (shouldCancel()) return "cancelled";

    try {
      const { data } = await apiClient.get(
        `/login/request-status/${requestId}`,
        { withCredentials: true }
      );

      if (shouldCancel()) return "cancelled";

      if (data?.status === "approved") return "approved";
      if (data?.status === "denied") return "denied";
      if (data?.status === "expired") return "expired";
    } catch (err) {
      console.warn("Approval status check failed:", err);
    }

    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  return shouldCancel() ? "cancelled" : "expired";
}

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

function InputBox({ icon: Icon, children }) {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2">
        <Icon size={14} className="text-slate-400" />
      </div>
      {children}
    </div>
  );
}

export default function Login({ onSwitchToRegister }) {
  const { login, loginWithBiometric } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    USER_CODE: "",
    PASSWORD: "",
  });

  const [companies, setCompanies] = useState([]);
  const [companyCode, setCompanyCode] = useState(
    localStorage.getItem("companyCode") || ""
  );

  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isBioLoading, setIsBioLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [capsOn, setCapsOn] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  const pwdRef = useRef(null);

  useEffect(() => {
    let alive = true;

    async function loadCompanies() {
      try {
        setLoadingCompanies(true);

        const { data } = await apiClient.get("/companies");
        const options = normalizeCompaniesPayload(data).filter(
          (item) => item.code || item.database
        );

        if (!alive) return;

        setCompanies(options);

        setCompanyCode((current) => {
          if (!current && options.length === 1) {
            return options[0].code || options[0].database || "";
          }

          if (
            current &&
            !options.some(
              (item) => item.code === current || item.database === current
            ) &&
            options[0]
          ) {
            return options[0].code || options[0].database || "";
          }

          return current;
        });
      } catch (err) {
        useSwalErrorAlert(
          "Unable to load companies",
          err?.response?.data?.message ||
            err?.message ||
            "Please check the /api/companies endpoint."
        );
      } finally {
        if (alive) setLoadingCompanies(false);
      }
    }

    loadCompanies();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (companyCode) localStorage.setItem("companyCode", companyCode);
  }, [companyCode]);

  function setBioAuthInProgress(value) {
    try {
      if (value) sessionStorage.setItem("bioAuthInProgress", "1");
      else sessionStorage.removeItem("bioAuthInProgress");
    } catch {}
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function handleCaps(event) {
    setCapsOn(event.getModifierState && event.getModifierState("CapsLock"));
  }

  async function showApprovalWaitingPopup(requestId) {
    let stopPolling = false;

    const popupPromise = Swal.fire({
      title: "",
      html: `
        <div style="text-align:center;">
          <div style="height:38px;width:38px;margin:0 auto 10px;border-radius:999px;background:linear-gradient(135deg,#dbeafe,#bfdbfe);display:flex;align-items:center;justify-content:center;color:#1d4ed8;font-size:18px;font-weight:800;">
            ⏳
          </div>

          <div style="font-size:15px;font-weight:800;color:#0f172a;line-height:1.2;">
            Account Already Logged In
          </div>

          <div style="font-size:12px;color:#64748b;line-height:1.45;margin-top:8px;">
            Your account is active in another session. You may wait for approval from that device or terminate the previous session and sign in here.
          </div>

          <div style="margin-top:12px;border:1px solid #fecaca;border-radius:10px;background:#fef2f2;padding:9px;color:#991b1b;font-size:11px;line-height:1.4;text-align:left;">
            <strong>Terminate Session</strong> will immediately invalidate the previous browser or device.
          </div>
        </div>
      `,
      width: "min(350px, calc(100vw - 28px))",
      padding: "0.9rem",
      background: "#ffffff",
      backdrop: "rgba(15, 23, 42, 0.30)",
      allowOutsideClick: false,
      allowEscapeKey: false,
      heightAuto: false,
      showCancelButton: true,
      showConfirmButton: true,
      confirmButtonText: "Terminate Session",
      cancelButtonText: "Cancel",
      reverseButtons: true,
      buttonsStyling: false,
      customClass: {
        popup: "rounded-2xl shadow-2xl border border-slate-200",
        htmlContainer: "m-0",
        actions: "mt-3 grid w-full grid-cols-2 gap-2",
        confirmButton:
          "w-full rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-red-700",
        cancelButton:
          "w-full rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200",
      },
    }).then((result) => {
      if (result.isConfirmed) return "terminate";
      stopPolling = true;
      return "cancelled";
    });

    const approvalPromise = waitForLoginApproval(
      requestId,
      65000,
      () => stopPolling
    );

    const result = await Promise.race([popupPromise, approvalPromise]);

    stopPolling = true;
    Swal.close();

    return result;
  }

  async function continueAfterApproval(requestId) {
    const loggedInUser = await login({
      companyCode,
      USER_CODE: form.USER_CODE.trim(),
      PASSWORD: form.PASSWORD,
      approvalRequestId: requestId,
    });

    showToast("success", "Welcome back!", "You have successfully signed in.");
    navigate(getPostLoginPath(loggedInUser), { replace: true });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!companyCode) {
      showToast("warning", "Select Company", "Please choose a company before logging in.");
      return;
    }

    if (!form.USER_CODE.trim() || !form.PASSWORD) {
      showToast("warning", "Incomplete Login", "Please enter your User ID and password.");
      return;
    }

    setTenant(companyCode);
    await ensureCsrf();

    setIsLoading(true);

    try {
      const loggedInUser = await login({
        companyCode,
        USER_CODE: form.USER_CODE.trim(),
        PASSWORD: form.PASSWORD,
      });

      showToast("success", "Welcome back!", "You have successfully signed in.");
      navigate(getPostLoginPath(loggedInUser), { replace: true });
    } catch (err) {
      const status = err?.response?.status;
      const code = err?.response?.data?.code;
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Please try again.";

      const approvalRequired =
        status === 409 &&
        code === "LOGIN_APPROVAL_REQUIRED";

      if (status === 409 && code === "ACTIVE_SESSION") {
        showToast(
          "warning",
          "Account Already Logged In",
          msg ||
            "This account is active in another session. Please try again."
        );
        return;
      }

      if (approvalRequired) {
        const requestId = err?.response?.data?.requestId;

        if (!requestId) {
          showToast(
            "error",
            "Login blocked",
            "Active session detected but no approval request was created."
          );
          return;
        }

        const approvalStatus = await showApprovalWaitingPopup(requestId);

        if (approvalStatus === "terminate") {
          try {
            const loggedInUser = await login({
              companyCode,
              USER_CODE: form.USER_CODE.trim(),
              PASSWORD: form.PASSWORD,
              forceLogin: true,
              approvalRequestId: requestId,
            });

            showToast(
              "success",
              "Previous session terminated",
              "You are now signed in on this device."
            );

            navigate(getPostLoginPath(loggedInUser), { replace: true });
          } catch (terminateError) {
            showToast(
              "error",
              "Unable to terminate session",
              terminateError?.response?.data?.message ||
                terminateError?.message ||
                "Please try again."
            );
          }

          return;
        }

        if (approvalStatus === "approved") {
          try {
            await continueAfterApproval(requestId);
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
          showToast(
            "error",
            "Login denied",
            "The active session denied your login request."
          );
          return;
        }

        if (approvalStatus === "cancelled") {
          showToast("info", "Login cancelled", "You cancelled the approval request.");
          return;
        }

        showToast(
          "warning",
          "Approval expired",
          "No response was received from the active session."
        );
        return;
      }

      if (status === 403 && code === "PENDING") {
        showToast(
          "info",
          "Awaiting Administrator Approval",
          "Your account is pending activation."
        );
        return;
      }

      if (status === 403 && code === "INACTIVE") {
        showToast("error", "Account Inactive", msg);
        return;
      }

      if (status === 403 && code === "LOCKED") {
        showToast("error", "Account Locked", msg);
        return;
      }

      if (status === 403 && code === "PASSWORD_EXPIRED") {
        showToast("warning", "Password Expired", msg);

        navigate(
          `/change-password?user=${encodeURIComponent(
            form.USER_CODE.trim()
          )}&mode=expired&company=${encodeURIComponent(companyCode)}`
        );

        return;
      }

      if (status === 429 && code === "SEAT_LIMIT") {
        showToast("warning", "Login Limit Reached", msg);
        return;
      }

      showToast("error", "Login failed", msg);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleBiometricLogin() {
    try {
      if (!companyCode) {
        showToast("warning", "Select Company", "Please choose a company before logging in.");
        return;
      }

      if (
        !window.PublicKeyCredential ||
        typeof navigator.credentials?.get !== "function"
      ) {
        showToast(
          "error",
          "Biometric Login Not Supported",
          "This browser or device does not support biometric login."
        );
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

      if (!credential) {
        throw new Error("Biometric authentication was cancelled.");
      }

      const loggedInUser = await loginWithBiometric({
        companyCode,
        payload: {
          credential: serializeLoginCredential(credential),
        },
      });

      showToast("success", "Welcome back!", "Biometric authentication successful.");
      navigate(getPostLoginPath(loggedInUser), { replace: true });
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Unable to login using biometrics.";

      if (err?.name === "NotAllowedError") {
        showToast(
          "info",
          "Biometric Login Cancelled",
          "Authentication was cancelled or timed out."
        );
        return;
      }

      showToast("error", "Biometric Login Failed", msg);
    } finally {
      setBioAuthInProgress(false);
      setIsBioLoading(false);
    }
  }

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
      <div className="pointer-events-none absolute inset-0 bg-slate-950/35" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-950/55 via-sky-950/25 to-blue-900/20" />

      <div className="relative mx-auto flex min-h-[calc(100vh-8.5rem)] w-full max-w-7xl items-center justify-center">
        <div className="grid w-full grid-cols-1 items-center gap-8 lg:grid-cols-[1.08fr_.92fr]">
          <section className="hidden lg:block">
            <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-white/50 bg-white/16 px-6 py-2.5 text-xs font-extrabold uppercase tracking-[0.28em] text-white shadow-xl backdrop-blur-md">
              NAYSA-SOLUTIONS INCORPORATED
            </div>

            <h1 className="whitespace-nowrap text-4xl font-black uppercase leading-none tracking-[0.06em] text-white drop-shadow-[0_5px_18px_rgba(0,0,0,.45)] xl:text-5xl 2xl:text-6xl">
              WE MAKE LIFE EASIER
            </h1>

            <p className="mt-5 max-w-2xl text-2xl font-bold uppercase tracking-[0.18em] text-sky-100 drop-shadow-[0_3px_12px_rgba(0,0,0,.45)]">
              THROUGH BUSINESS APPLICATIONS
            </p>

            <div className="my-7 h-1 w-28 rounded-full bg-sky-400 shadow-[0_0_22px_rgba(56,189,248,.8)]" />

            <p className="max-w-2xl text-base font-medium leading-8 text-white/95 drop-shadow-[0_2px_10px_rgba(0,0,0,.55)]">
              Powerful business applications built to streamline operations,
              support compliance, and help your team work faster with NAYSA Cloud.
            </p>
          </section>

          <section className="flex items-center justify-center">
            <div className="relative w-full max-w-md">
              <div className="mb-4 flex flex-col items-center text-center">
                <img
                  src="/naysa_logo.png"
                  alt="NAYSA Logo"
                  className="w-36 drop-shadow-[0_6px_18px_rgba(0,0,0,.35)] md:w-40"
                />

                <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-white drop-shadow-[0_4px_15px_rgba(0,0,0,.5)] md:text-3xl">
                  NAYSA Financials Cloud
                </h1>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="relative w-full rounded-3xl p-7"
                style={{
                  background: "rgba(255,255,255,0.90)",
                  border: "1px solid rgba(255,255,255,0.68)",
                  backdropFilter: "blur(18px)",
                  WebkitBackdropFilter: "blur(18px)",
                  boxShadow:
                    "0 24px 70px rgba(2,6,23,.32), inset 0 1px 0 rgba(255,255,255,.9)",
                }}
              >
                <motion.form
                  onSubmit={handleSubmit}
                  noValidate
                  initial="hidden"
                  animate="show"
                  transition={{ staggerChildren: 0.06 }}
                  className="space-y-4"
                >
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
                        onChange={(event) => setCompanyCode(event.target.value)}
                        disabled={loadingCompanies || isLoading || isBioLoading}
                        className={`${inputCls} cursor-pointer appearance-none pr-9`}
                        required
                      >
                        <option value="" disabled>
                          {loadingCompanies ? "Loading companies…" : "Select a company"}
                        </option>

                        {companies.map((company) => {
                          const value = company.code || company.database;
                          const label = company.company || value || "(unnamed)";

                          return (
                            <option key={value || label} value={value}>
                              {label}
                            </option>
                          );
                        })}
                      </select>

                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                        <FiChevronDown size={14} />
                      </span>
                    </div>
                  </Field>

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

                  <Field
                    label="Password"
                    right={
                      capsOn ? (
                        <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-sky-700">
                          CAPS LOCK ON
                        </span>
                      ) : null
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
                        className={`${inputCls} pr-12`}
                        required
                      />

                      <button
                        type="button"
                        onClick={() => setShowPwd((prev) => !prev)}
                        className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-md p-1 text-slate-500 transition hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                        aria-label={showPwd ? "Hide password" : "Show password"}
                      >
                        {showPwd ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                      </button>
                    </InputBox>
                  </Field>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowForgot(true)}
                      className="text-sm font-bold text-sky-700 transition hover:text-blue-700"
                    >
                      Forgot Password?
                    </button>
                  </div>

                  <div className="grid grid-cols-[1fr_auto_auto] items-center">
                    <button
                      type="submit"
                      disabled={
                        isLoading ||
                        isBioLoading ||
                        loadingCompanies ||
                        !companyCode ||
                        !form.USER_CODE.trim() ||
                        !form.PASSWORD
                      }
                      className="flex min-h-[46px] items-center justify-center gap-2 rounded-lg px-3 py-3 text-sm font-extrabold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
                      style={{
                        background: "linear-gradient(135deg,#0369a1 0%,#1d4ed8 100%)",
                      }}
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
                    </button>

                    <div className="mx-2 h-8 w-px bg-slate-400/60" />

                    <button
                      type="button"
                      onClick={handleBiometricLogin}
                      disabled={isLoading || isBioLoading || loadingCompanies || !companyCode}
                      className="flex h-[46px] w-[54px] shrink-0 items-center justify-center rounded-lg bg-white/85 p-0 text-slate-800 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="Biometric Sign In"
                      title="Biometric Sign In"
                    >
                      {isBioLoading ? (
                        <Spinner size={18} />
                      ) : (
                        <Fingerprint size={24} className="text-sky-600" />
                      )}
                    </button>
                  </div>
                </motion.form>

                <div className="mt-5 text-center">
                  <button
                    type="button"
                    onClick={onSwitchToRegister}
                    className="text-sm font-medium text-slate-700 transition-all duration-300 hover:text-slate-950 hover:tracking-wide"
                  >
                    Don't have an account?{" "}
                    <span className="font-bold text-sky-700 hover:text-blue-700">
                      Sign Up
                    </span>
                  </button>
                </div>
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

      <footer className="fixed bottom-0 left-0 right-0 z-30 w-full">
        <div className="w-full border-t border-white/20 bg-slate-950/75 px-4 py-3 shadow-lg backdrop-blur-md">
          <p className="text-center text-xs font-semibold tracking-wide text-white sm:text-sm">
            © 2026 NAYSA-SOLUTIONS, INC. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}