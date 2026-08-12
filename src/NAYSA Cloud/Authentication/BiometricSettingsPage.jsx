// import React from "react";
// import { FiAlertTriangle } from "react-icons/fi";
// import BiometricSettings from "@/NAYSA Cloud/Authentication/BiometricSettings.jsx";

// export default function BiometricSettingsPage() {
//   const supportsBiometric =
//     typeof window !== "undefined" &&
//     !!window.PublicKeyCredential &&
//     typeof navigator.credentials?.create === "function";

//   return (
//     <div className="w-full p-4 sm:p-6">
//       <div className="mx-auto max-w-3xl">
//         {supportsBiometric ? (
//           <BiometricSettings />
//         ) : (
//           <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
//             <div className="flex items-start gap-3">
//               <div className="rounded-xl bg-amber-100 p-2 text-amber-700">
//                 <FiAlertTriangle className="h-5 w-5" />
//               </div>

//               <div>
//                 <h2 className="text-sm font-semibold text-amber-800">
//                   Biometric registration is not available
//                 </h2>
//                 <p className="mt-1 text-sm leading-6 text-amber-700">
//                   This browser or device does not support biometric registration.
//                 </p>
//               </div>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }





import React, { useCallback, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiRefreshCw,
  FiShield,
  FiTrash2,
} from "react-icons/fi";
import { Fingerprint } from "lucide-react";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import apiClient, {
  bioRegisterOptions,
  bioRegisterVerify,
  bioList,
  bioDelete,
} from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import {
  prepareRegisterPublicKey,
  serializeRegisterCredential,
} from "@/NAYSA Cloud/Authentication/webauthn.js";

const DEFAULT_AVATAR = "/3135715.png";

function formatDateTime(value) {
  if (!value) return "—";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return value;
  return dt.toLocaleString();
}

export default function BiometricSettingsPage() {
  const { user, currentUserRow, refsLoaded } = useAuth();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [profileImageSrc, setProfileImageSrc] = useState(DEFAULT_AVATAR);

  const supportsBiometric =
    typeof window !== "undefined" &&
    !!window.PublicKeyCredential &&
    typeof navigator.credentials?.create === "function";

  const apiBaseUrl = (apiClient?.defaults?.baseURL || "").replace(/\/$/, "");
  const companyDb =
    apiClient?.defaults?.headers?.common?.["X-Company-DB"] || "";

  const userCode = useMemo(() => {
    return (
      currentUserRow?.USER_CODE?.trim?.() ||
      user?.USER_CODE?.trim?.() ||
      user?.userCode?.trim?.() ||
      ""
    );
  }, [currentUserRow, user]);

  const userName = useMemo(() => {
    return (
      currentUserRow?.USER_NAME ||
      user?.USER_NAME ||
      user?.userName ||
      "User"
    );
  }, [currentUserRow, user]);

  const activeCredential = useMemo(() => {
    return rows.find((row) => row.IS_ACTIVE === "Y") || null;
  }, [rows]);

  const hasActiveRegistration = !!activeCredential;

  const buildProfileImageUrl = useCallback(
    (code, bust = true) => {
      if (!code || !apiBaseUrl) return DEFAULT_AVATAR;

      const params = new URLSearchParams();

      if (companyDb) params.set("company", companyDb);
      if (bust) params.set("t", Date.now().toString());

      return `${apiBaseUrl}/user/profile-image/${encodeURIComponent(
        code
      )}?${params.toString()}`;
    },
    [apiBaseUrl, companyDb]
  );

  const handleProfileImageError = (e) => {
    e.currentTarget.onerror = null;
    e.currentTarget.src = DEFAULT_AVATAR;
  };

  useEffect(() => {
    if (!userCode) {
      setProfileImageSrc(DEFAULT_AVATAR);
      return;
    }

    setProfileImageSrc(buildProfileImageUrl(userCode, true));
  }, [userCode, buildProfileImageUrl, user?.PROFILE_IMG_UPDATED]);

  const loadBioList = useCallback(async () => {
    if (!userCode) {
      setRows([]);
      return;
    }

    try {
      setLoading(true);
      const res = await bioList(userCode);
      setRows(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Load Failed",
        text:
          err?.response?.data?.message ||
          err?.message ||
          "Unable to load biometric registration.",
      });
    } finally {
      setLoading(false);
    }
  }, [userCode]);

  useEffect(() => {
    if (refsLoaded === false) return;
    loadBioList();
  }, [loadBioList, refsLoaded]);

  const handleRegister = async () => {
    try {
      if (!userCode) throw new Error("No logged in user found.");

      if (hasActiveRegistration) {
        await Swal.fire({
          icon: "info",
          title: "Already Registered",
          text: "Only one active biometric registration is allowed per user.",
        });
        return;
      }

      if (!supportsBiometric) {
        throw new Error(
          "This browser or device does not support biometric registration."
        );
      }

      const confirm = await Swal.fire({
        title: "Register biometric access?",
        text: "This will register this device for biometric login.",
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Register",
        cancelButtonText: "Cancel",
        confirmButtonColor: "#2563eb",
      });

      if (!confirm.isConfirmed) return;

      setRegistering(true);

      const optionRes = await bioRegisterOptions(userCode);

      if (!optionRes?.success || !optionRes?.data) {
        throw new Error(
          optionRes?.message || "Failed to load registration options."
        );
      }

      const rawOptions = optionRes?.data?.publicKey ?? optionRes?.data;
      const publicKey = prepareRegisterPublicKey(rawOptions);
      const credential = await navigator.credentials.create({ publicKey });

      if (!credential) throw new Error("Biometric registration was cancelled.");

      const verifyRes = await bioRegisterVerify({
        userCode,
        credential: serializeRegisterCredential(credential),
      });

      if (!verifyRes?.success) {
        throw new Error(verifyRes?.message || "Biometric registration failed.");
      }

      await Swal.fire({
        icon: "success",
        title: "Registration Complete",
        text:
          verifyRes?.message ||
          "Biometric access has been registered successfully.",
      });

      await loadBioList();
    } catch (err) {
      if (err?.name === "NotAllowedError") {
        await Swal.fire({
          icon: "info",
          title: "Registration Cancelled",
          text: "Biometric registration was cancelled or timed out.",
        });
        return;
      }

      await Swal.fire({
        icon: "error",
        title: "Registration Failed",
        text:
          err?.response?.data?.message ||
          err?.message ||
          "Unable to register biometric access.",
      });
    } finally {
      setRegistering(false);
    }
  };

  const handleDelete = async () => {
    if (!activeCredential) return;

    const confirm = await Swal.fire({
      icon: "warning",
      title: "Remove registration?",
      text: "Biometric login will be removed for this user.",
      showCancelButton: true,
      confirmButtonText: "Remove",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc2626",
    });

    if (!confirm.isConfirmed) return;

    try {
      setBusyId(activeCredential.ID);
      const res = await bioDelete(activeCredential.ID);

      await Swal.fire({
        icon: "success",
        title: "Removed",
        text: res?.message || "Biometric registration removed.",
      });

      await loadBioList();
    } catch (err) {
      await Swal.fire({
        icon: "error",
        title: "Remove Failed",
        text:
          err?.response?.data?.message ||
          err?.message ||
          "Unable to remove biometric registration.",
      });
    } finally {
      setBusyId(null);
    }
  };

  if (refsLoaded === false) {
    return (
      <div className="w-full p-4 sm:p-6">
        <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          Loading...
        </div>
      </div>
    );
  }

  if (!supportsBiometric) {
    return (
      <div className="w-full p-4 sm:p-6">
        <div className="mx-auto max-w-2xl rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-amber-100 p-2 text-amber-700">
              <FiAlertTriangle className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-sm font-semibold text-amber-800">
                Biometric registration is not available
              </h2>
              <p className="mt-1 text-sm leading-6 text-amber-700">
                This browser or device does not support biometric registration.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-4 sm:p-6">
      <div className="mx-auto max-w-2xl">
        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="px-6 py-8 text-center sm:px-8">
            <div className="mx-auto h-20 w-20 overflow-hidden rounded-full border-4 border-white bg-slate-100 shadow-md ring-1 ring-slate-200">
              <img
                src={profileImageSrc}
                alt="User profile"
                className="h-full w-full object-cover"
                onError={handleProfileImageError}
              />
            </div>

            <h2 className="mt-4 text-xl font-semibold text-slate-900">
              Biometric Registration
            </h2>

            <p className="mt-1 text-sm font-medium text-slate-700">
              {userName}
            </p>

            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
              Register this device for biometric login. This is not for face
              recognition storage.
            </p>

            <div className="mt-5 flex justify-center">
              {hasActiveRegistration ? (
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">
                  <FiCheckCircle className="h-4 w-4" />
                  Registered
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600">
                  <FiShield className="h-4 w-4" />
                  Not yet registered
                </div>
              )}
            </div>

            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleRegister}
                disabled={
                  registering || loading || !userCode || hasActiveRegistration
                }
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <Fingerprint className="h-4 w-4" />
                {registering ? "Registering..." : "Register Biometric"}
              </button>

              <button
                type="button"
                onClick={loadBioList}
                disabled={loading || registering || !userCode}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FiRefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
            </div>

            {!userCode ? (
              <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-700">
                No logged in user found. Please make sure your AuthContext
                exposes USER_CODE.
              </div>
            ) : null}
          </div>

          <div className="border-t border-slate-100 bg-slate-50 px-6 py-5 sm:px-8">
            {loading ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-7 text-center text-sm text-slate-500">
                Checking registration...
              </div>
            ) : hasActiveRegistration ? (
              <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Biometric access is active
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Date registered: {formatDateTime(activeCredential.DATE_ADDED)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={busyId === activeCredential.ID}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-medium text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <FiTrash2 className="h-4 w-4" />
                  Remove
                </button>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-7 text-center">
                <h3 className="text-sm font-semibold text-slate-800">
                  No biometric access registered
                </h3>
                <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">
                  Click Register Biometric to enable biometric login for this
                  user.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
