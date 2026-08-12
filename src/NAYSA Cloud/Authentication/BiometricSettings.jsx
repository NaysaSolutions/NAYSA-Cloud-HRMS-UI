

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import {
  FiShield,
  FiTrash2,
  FiRefreshCw,
  FiCheckCircle,
  FiMonitor,
} from "react-icons/fi";
import { Fingerprint } from "lucide-react";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import {
  bioRegisterOptions,
  bioRegisterVerify,
  bioList,
  bioDelete,
} from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import {
  prepareRegisterPublicKey,
  serializeRegisterCredential,
} from "@/NAYSA Cloud/Authentication/webauthn.js";

function formatDateTime(value) {
  if (!value) return "—";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return value;
  return dt.toLocaleString();
}

export default function BiometricSettings() {
  const { user, currentUserRow, refsLoaded } = useAuth();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const userCode = useMemo(() => {
    return (
      currentUserRow?.USER_CODE?.trim?.() ||
      user?.USER_CODE?.trim?.() ||
      user?.userCode?.trim?.() ||
      ""
    );
  }, [currentUserRow, user]);

  const activeCredential = useMemo(() => {
    return rows.find((row) => row.IS_ACTIVE === "Y") || null;
  }, [rows]);

  const hasActiveRegistration = !!activeCredential;

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
      if (!userCode) {
        throw new Error("No logged in user found.");
      }

      if (hasActiveRegistration) {
        await Swal.fire({
          icon: "info",
          title: "Already Registered",
          text: "This user already has an active biometric registration. Only one registration is allowed.",
        });
        return;
      }

      if (
        !window.PublicKeyCredential ||
        typeof navigator.credentials?.create !== "function"
      ) {
        throw new Error(
          "This browser or device does not support biometric registration."
        );
      }

      const confirm = await Swal.fire({
        title: "Register biometric access?",
        html: `
          <div style="text-align:left; font-size:14px; line-height:1.6; color:#334155;">
            <p style="margin:0;">
              This will register this device for secure biometric login.
              Only one active biometric registration is allowed per user.
            </p>
          </div>
        `,
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

      const credential = await navigator.credentials.create({
        publicKey,
      });

      if (!credential) {
        throw new Error("Biometric registration was cancelled.");
      }

      const payload = {
        userCode,
        credential: serializeRegisterCredential(credential),
      };

      const verifyRes = await bioRegisterVerify(payload);

      if (!verifyRes?.success) {
        throw new Error(verifyRes?.message || "Biometric registration failed.");
      }

      await Swal.fire({
        icon: "success",
        title: "Registration Complete",
        text:
          verifyRes?.message ||
          "Biometric access has been registered successfully.",
        confirmButtonText: "OK",
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

  const handleDelete = async (row) => {
    const confirm = await Swal.fire({
      icon: "warning",
      title: "Remove registration?",
      text: "This user will no longer be able to use biometric login on this registration.",
      showCancelButton: true,
      confirmButtonText: "Remove",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc2626",
    });

    if (!confirm.isConfirmed) return;

    try {
      setBusyId(row.ID);
      const res = await bioDelete(row.ID);

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
      <div className="min-h-[360px] rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-sm text-slate-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-b from-slate-50 to-white px-6 py-8 text-center sm:px-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-50 text-blue-600">
            <Fingerprint className="h-8 w-8" />
          </div>

          <h2 className="mt-5 text-2xl font-semibold tracking-tight text-slate-950">
            Biometric Registration
          </h2>

          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500">
            Register this device for biometric login. This is only for biometric
            access registration, not face recognition storage.
          </p>

          <div className="mt-6 flex justify-center">
            {hasActiveRegistration ? (
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">
                <FiCheckCircle className="h-4 w-4" />
                Biometric access is already registered
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600">
                <FiShield className="h-4 w-4" />
                No biometric registration yet
              </div>
            )}
          </div>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleRegister}
              disabled={
                registering ||
                loading ||
                !userCode ||
                hasActiveRegistration
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
              <FiRefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {!userCode ? (
            <div className="mx-auto mt-6 max-w-xl rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-700">
              No logged in user found. Please make sure your AuthContext exposes
              USER_CODE.
            </div>
          ) : null}
        </div>

        <div className="border-t border-slate-100 px-6 py-5 sm:px-10">
          {loading ? (
            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
              Checking biometric registration...
            </div>
          ) : hasActiveRegistration ? (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                    <FiMonitor className="h-3.5 w-3.5" />
                    Registered Device
                  </div>

                  <h3 className="mt-3 text-base font-semibold text-slate-900">
                    Biometric access is active
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Date registered:{" "}
                    <span className="font-medium text-slate-700">
                      {formatDateTime(activeCredential.DATE_ADDED)}
                    </span>
                  </p>

                  {activeCredential.LAST_USED_AT ? (
                    <p className="mt-1 text-sm text-slate-500">
                      Last used:{" "}
                      <span className="font-medium text-slate-700">
                        {formatDateTime(activeCredential.LAST_USED_AT)}
                      </span>
                    </p>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(activeCredential)}
                  disabled={busyId === activeCredential.ID}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-medium text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <FiTrash2 className="h-4 w-4" />
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm">
                <Fingerprint className="h-6 w-6" />
              </div>

              <h3 className="mt-4 text-sm font-semibold text-slate-800">
                No biometric access registered
              </h3>

              <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">
                Click Register Biometric to allow this user to sign in using the
                supported biometric method of this device.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}