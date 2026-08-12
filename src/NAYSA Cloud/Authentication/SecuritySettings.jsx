import React from "react";
import { FiShield, FiLock, FiUserCheck } from "react-icons/fi";
import BiometricSettings from "@/NAYSA Cloud/Authentication/BiometricSettings.jsx";

export default function SecuritySettings() {
  const supportsBiometric =
    typeof window !== "undefined" &&
    !!window.PublicKeyCredential &&
    typeof navigator.credentials?.create === "function";

  return (
    <div className="w-full space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-sky-50 p-3 text-sky-700">
            <FiShield className="h-6 w-6" />
          </div>

          <div>
            <h1 className="text-xl font-semibold text-slate-800">
              Security Settings
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage your sign-in and device security options.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-indigo-50 p-3 text-indigo-700">
              <FiLock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-800">
                Password Security
              </h2>
              <p className="text-xs text-slate-500">
                Keep your account protected with a strong password.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700">
              <FiUserCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-800">
                Account Access
              </h2>
              <p className="text-xs text-slate-500">
                Review how you access your account across devices.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-sky-50 p-3 text-sky-700">
              <FiShield className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-800">
                Biometric Sign-In
              </h2>
              <p className="text-xs text-slate-500">
                Register fingerprint, face ID, or Windows Hello for login.
              </p>
            </div>
          </div>
        </div>
      </div>

      {supportsBiometric ? (
        <BiometricSettings />
      ) : (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-amber-800">
            Biometric login is not available
          </h2>
          <p className="mt-1 text-sm text-amber-700">
            This browser or device does not support biometric registration.
          </p>
        </div>
      )}
    </div>
  );
}