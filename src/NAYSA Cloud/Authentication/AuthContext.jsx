import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Swal from "sweetalert2";

import {
  apiClient,
  bioLoginVerifyPasswordless,
  ensureCsrf,
  fetchData,
  getTenant,
  markAuthReady,
  setTenant,
} from "@/NAYSA Cloud/Configuration/BaseURL.jsx";

import {
  useTopCompanyGlobalTables,
  useTopUserRow,
} from "@/NAYSA Cloud/Global/top1RefTable";

import { useSwalSuccessAlert } from "@/NAYSA Cloud/Global/behavior.jsx";

const AuthContext = createContext(null);

const USER_CACHE_KEY = "naysa_user";
const AUTH_REFS_CACHE_KEY = "naysa_auth_refs";
const AUTH_EPOCH_KEY = "naysa_auth_epoch";
const AUTH_BC_NAME = "auth";
const HB_LEASE_KEY = "naysa_hb_leader";
const TAB_ID = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const configuredIdleMinutes = Number.parseInt(
  import.meta.env.VITE_SESSION_LIFETIME ?? "60",
  10
);

const IDLE_LIMIT_MINUTES =
  Number.isFinite(configuredIdleMinutes) && configuredIdleMinutes > 0
    ? configuredIdleMinutes
    : 60;

const IDLE_LIMIT_MS = IDLE_LIMIT_MINUTES * 60 * 1000;

const configuredHeartbeatSeconds = Number.parseInt(
  import.meta.env.VITE_REMOTE_HEARTBEAT_SECONDS ?? "15",
  10
);

const REMOTE_HEARTBEAT_MS = Math.max(
  5000,
  (Number.isFinite(configuredHeartbeatSeconds)
    ? configuredHeartbeatSeconds
    : 15) * 1000
);

/*
 * Keep the leader lease short. The old implementation based this lease on
 * the full session lifetime, so closing the leader tab could stop heartbeat
 * requests for a very long time.
 */
const HB_LEASE_MS = Math.max(REMOTE_HEARTBEAT_MS * 3, 45000);
const LOGIN_GRACE_MS = 5000;

function isBioAuthInProgress() {
  try {
    return sessionStorage.getItem("bioAuthInProgress") === "1";
  } catch {
    return false;
  }
}

function cacheUser(value) {
  try {
    if (value) localStorage.setItem(USER_CACHE_KEY, JSON.stringify(value));
    else localStorage.removeItem(USER_CACHE_KEY);
  } catch {}
}

function readCachedUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_CACHE_KEY) || "null");
  } catch {
    return null;
  }
}

function cacheAuthRefs(value) {
  try {
    if (value) {
      localStorage.setItem(AUTH_REFS_CACHE_KEY, JSON.stringify(value));
    } else {
      localStorage.removeItem(AUTH_REFS_CACHE_KEY);
    }
  } catch {}
}

function readCachedAuthRefs() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_REFS_CACHE_KEY) || "null");
  } catch {
    return null;
  }
}

function createAuthEpoch() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function readAuthEpoch() {
  try {
    return localStorage.getItem(AUTH_EPOCH_KEY) || "";
  } catch {
    return "";
  }
}

function writeAuthEpoch(epoch) {
  try {
    localStorage.setItem(AUTH_EPOCH_KEY, epoch);
  } catch {}
}

function removeAuthEpoch(expectedEpoch = "") {
  try {
    const current = localStorage.getItem(AUTH_EPOCH_KEY) || "";
    if (!expectedEpoch || !current || current === expectedEpoch) {
      localStorage.removeItem(AUTH_EPOCH_KEY);
    }
  } catch {}
}

function readLease() {
  try {
    return JSON.parse(localStorage.getItem(HB_LEASE_KEY) || "null");
  } catch {
    return null;
  }
}

function tryAcquireLeader() {
  const now = Date.now();
  const current = readLease();

  if (!current?.id || Number(current.expiresAt || 0) <= now) {
    try {
      localStorage.setItem(
        HB_LEASE_KEY,
        JSON.stringify({ id: TAB_ID, expiresAt: now + HB_LEASE_MS })
      );
    } catch {}

    return true;
  }

  return current.id === TAB_ID;
}

function renewLeader() {
  try {
    localStorage.setItem(
      HB_LEASE_KEY,
      JSON.stringify({ id: TAB_ID, expiresAt: Date.now() + HB_LEASE_MS })
    );
  } catch {}
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getLogoutMessage(reason) {
  if (reason === "idle") {
    return {
      title: "Signed out for inactivity",
      text: "You were inactive and have been signed out.",
    };
  }

  if (reason === "expired") {
    return {
      title: "Session expired",
      text: "Your session expired. Please sign in again.",
    };
  }

  if (reason === "remote_elsewhere") {
    return {
      title: "Signed out from another device",
      text: "Your account was logged in from another device.",
    };
  }

  if (reason === "remote") {
    return {
      title: "Signed out",
      text: "Your account was signed out by the server. Please sign in again.",
    };
  }

  return {
    title: "Session ended",
    text: "Your session has ended.",
  };
}

export default function AuthProvider({ children }) {
  const [user, setUserState] = useState(() => readCachedUser());
  const [loading, setLoading] = useState(true);

  const [refsLoading, setRefsLoading] = useState(false);
  const [refsLoaded, setRefsLoaded] = useState(false);

  const [companyInfo, setCompanyInfo] = useState(null);
  const [allDropDown, setallDropDown] = useState(null);
  const [currentUserRow, setCurrentUserRow] = useState(null);
  const [currentMenu, setCurrentMenu] = useState(null);
  const [globalTables, setGlobalTables] = useState(null);
  const [allVATList, setAllVATList] = useState(null);
  const [allATCList, setAllATCList] = useState(null);
  const [allHSDoc, setAllHSDoc] = useState(null);

  const logoutLatchRef = useRef(false);
  const pendingLogoutNoticeRef = useRef(false);
  const loginApprovalPromptRef = useRef(null);
  const pendingApprovalDisabledRef = useRef(false);
  const pendingApprovalRetryAtRef = useRef(0);
  const pendingApprovalFailureCountRef = useRef(0);
  const loginInProgressRef = useRef(false);
  const sessionEstablishedAtRef = useRef(0);
  const authGenerationRef = useRef(0);
  const authEpochRef = useRef(readAuthEpoch());
  const lastActivity = useRef(Date.now());
  const idleTimer = useRef(null);
  const heartbeatTimer = useRef(null);
  const bcRef = useRef(null);
  const isMountedRef = useRef(true);

  const safeSetUser = useCallback((value) => {
    if (isMountedRef.current) setUserState(value);
  }, []);

  const clearTimers = useCallback(() => {
    if (idleTimer.current) {
      clearTimeout(idleTimer.current);
      idleTimer.current = null;
    }

    if (heartbeatTimer.current) {
      clearTimeout(heartbeatTimer.current);
      heartbeatTimer.current = null;
    }
  }, []);

  const clearRefStates = useCallback(() => {
    setCompanyInfo(null);
    setallDropDown(null);
    setCurrentUserRow(null);
    setCurrentMenu(null);
    setGlobalTables(null);
    setAllVATList(null);
    setAllATCList(null);
    setAllHSDoc(null);
    setRefsLoaded(false);
    setRefsLoading(false);
  }, []);

  const persistRefsToCache = useCallback((nextRefs) => {
    cacheAuthRefs({
      companyInfo: nextRefs.companyInfo ?? null,
      allDropDown: nextRefs.allDropDown ?? null,
      currentUserRow: nextRefs.currentUserRow ?? null,
      currentMenu: nextRefs.currentMenu ?? null,
      globalTables: nextRefs.globalTables ?? null,
      allVATList: nextRefs.allVATList ?? null,
      allATCList: nextRefs.allATCList ?? null,
      allHSDoc: nextRefs.allHSDoc ?? null,
      refsLoaded: Boolean(nextRefs.refsLoaded),
    });
  }, []);

  const hydrateRefsFromCache = useCallback(() => {
    try {
      const cachedRefs = readCachedAuthRefs();
      if (!cachedRefs) return;

      setCompanyInfo(cachedRefs.companyInfo ?? null);
      setallDropDown(cachedRefs.allDropDown ?? null);
      setCurrentUserRow(cachedRefs.currentUserRow ?? null);
      setCurrentMenu(cachedRefs.currentMenu ?? null);
      setGlobalTables(cachedRefs.globalTables ?? null);
      setAllVATList(cachedRefs.allVATList ?? null);
      setAllATCList(cachedRefs.allATCList ?? null);
      setAllHSDoc(cachedRefs.allHSDoc ?? null);
      setRefsLoaded(false);
    } catch (error) {
      console.error("Failed to hydrate authentication references:", error);
    }
  }, []);

  const hardLogout = useCallback(
    ({ clearSharedStorage = true } = {}) => {
      authGenerationRef.current += 1;
      loginInProgressRef.current = false;
      sessionEstablishedAtRef.current = 0;
      pendingApprovalDisabledRef.current = true;
      pendingApprovalRetryAtRef.current = 0;
      pendingApprovalFailureCountRef.current = 0;
      safeSetUser(null);
      clearTimers();
      clearRefStates();
      markAuthReady(false);
      lastActivity.current = Date.now();

      if (clearSharedStorage) {
        const epoch = authEpochRef.current;

        try {
          localStorage.removeItem(USER_CACHE_KEY);
          localStorage.removeItem(AUTH_REFS_CACHE_KEY);
          localStorage.removeItem("naysa_sidebar_pinned");
          localStorage.removeItem("naysa_sidebar_open_keys");
          localStorage.removeItem("naysa_sidebar_scroll_top");
          sessionStorage.removeItem("menuItems");
          sessionStorage.removeItem("routeRows");
        } catch {}

        removeAuthEpoch(epoch);
        cacheUser(null);
        cacheAuthRefs(null);
      }

      authEpochRef.current = "";
    },
    [clearRefStates, clearTimers, safeSetUser]
  );

  const serverLogout = useCallback(
    async (reason = "manual") => {
      if (isBioAuthInProgress()) return;

      const isServerDetectedLogout = [
        "remote",
        "remote_elsewhere",
        "expired",
      ].includes(reason);

      if (
        isServerDetectedLogout &&
        (loginInProgressRef.current ||
          (sessionEstablishedAtRef.current > 0 &&
            Date.now() - sessionEstablishedAtRef.current < LOGIN_GRACE_MS))
      ) {
        return;
      }

      if (logoutLatchRef.current) return;
      logoutLatchRef.current = true;

      const browserEpoch = readAuthEpoch();
      const ownsCurrentEpoch =
        !authEpochRef.current ||
        !browserEpoch ||
        authEpochRef.current === browserEpoch;

      /*
       * Only manual and inactivity logout should call Laravel's /logout.
       * A session rejected as old must never clear the newly active session.
       */
      const shouldCallLogoutApi =
        ownsCurrentEpoch && (reason === "manual" || reason === "idle");

      if (shouldCallLogoutApi) {
        try {
          await apiClient.post("/logout", null, {
            withCredentials: true,
            headers: {
              "X-Skip-Logout-Broadcast": "1",
              "X-Use-Credentials": "1",
            },
          });
        } catch (error) {
          const status = error?.response?.status;
          if (![401, 403, 419].includes(status)) {
            console.warn("Logout API failed; continuing local logout:", error);
          }
        }
      }

      /*
       * Broadcast only intentional logout actions. Never broadcast a failed
       * heartbeat from an old tab because that can sign out a new valid login.
       */
      if (
        ownsCurrentEpoch &&
        (reason === "manual" || reason === "idle")
      ) {
        try {
          bcRef.current?.postMessage({
            type: "logout",
            reason,
            epoch: authEpochRef.current,
            at: Date.now(),
          });
        } catch {}
      }

      hardLogout({ clearSharedStorage: ownsCurrentEpoch });

      const message = getLogoutMessage(reason);
      if (document.visibilityState === "visible") {
        try {
          useSwalSuccessAlert(message.title, message.text);
        } catch {}
      } else {
        pendingLogoutNoticeRef.current = true;
      }
    },
    [hardLogout]
  );

  const logout = useCallback(async () => {
    await serverLogout("manual");
  }, [serverLogout]);

  const establishAuthenticatedUser = useCallback(
    (authenticatedUser, { createNewEpoch = false } = {}) => {
      const epoch =
        createNewEpoch || !readAuthEpoch()
          ? createAuthEpoch()
          : readAuthEpoch();

      writeAuthEpoch(epoch);
      authEpochRef.current = epoch;
      lastActivity.current = Date.now();
      sessionEstablishedAtRef.current = Date.now();
      logoutLatchRef.current = false;
      pendingApprovalDisabledRef.current = false;
      pendingApprovalRetryAtRef.current = 0;
      pendingApprovalFailureCountRef.current = 0;

      safeSetUser(authenticatedUser);
      cacheUser(authenticatedUser);
      markAuthReady(true);

      try {
        localStorage.removeItem(HB_LEASE_KEY);
      } catch {}
    },
    [safeSetUser]
  );

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    hydrateRefsFromCache();
  }, [hydrateRefsFromCache]);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return undefined;

    const channel = new BroadcastChannel(AUTH_BC_NAME);
    bcRef.current = channel;

    channel.onmessage = (event) => {
      const payload = event?.data;
      if (!payload?.type) return;

      if (payload.type === "logout") {
        if (isBioAuthInProgress()) return;

        const currentEpoch = readAuthEpoch();
        if (
          payload.epoch &&
          currentEpoch &&
          payload.epoch !== currentEpoch
        ) {
          return;
        }

        if (
          sessionEstablishedAtRef.current > 0 &&
          Number(payload.at || 0) < sessionEstablishedAtRef.current
        ) {
          return;
        }

        if (logoutLatchRef.current) return;
        logoutLatchRef.current = true;

        hardLogout({ clearSharedStorage: true });

        const message = getLogoutMessage(payload.reason);
        if (document.visibilityState === "visible") {
          try {
            useSwalSuccessAlert(message.title, message.text);
          } catch {}
        } else {
          pendingLogoutNoticeRef.current = true;
        }

        return;
      }

      if (payload.type === "tenant-changed" && payload.code) {
        const incoming = String(payload.code || "");
        const current = String(getTenant() || "");

        if (incoming && incoming !== current) {
          setTenant(incoming, { silent: true });
        }
      }
    };

    return () => {
      channel.close();
      if (bcRef.current === channel) bcRef.current = null;
    };
  }, [hardLogout]);

  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === AUTH_EPOCH_KEY) {
        authEpochRef.current = event.newValue || "";
      }
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  /* Validate a cached browser session once when the application starts. */
  useEffect(() => {
    let cancelled = false;
    const generation = ++authGenerationRef.current;

    (async () => {
      try {
        const tenant = getTenant();
        if (tenant) setTenant(tenant);

        await ensureCsrf();

        const response = await apiClient.get("/me", {
          withCredentials: true,
          headers: {
            "X-Skip-Logout-Broadcast": "1",
            "X-Use-Credentials": "1",
          },
        });

        if (cancelled || generation !== authGenerationRef.current) return;

        const authenticatedUser = response?.data;
        if (!authenticatedUser?.USER_CODE) {
          throw new Error("Invalid /me response.");
        }

        establishAuthenticatedUser(authenticatedUser);
      } catch {
        if (cancelled || generation !== authGenerationRef.current) return;

        safeSetUser(null);
        cacheUser(null);
        cacheAuthRefs(null);
        removeAuthEpoch(authEpochRef.current);
        authEpochRef.current = "";
        markAuthReady(false);
        clearRefStates();
      } finally {
        if (!cancelled && isMountedRef.current) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clearRefStates, establishAuthenticatedUser, safeSetUser]);

  useEffect(() => {
    if (loading || !user?.USER_CODE) return undefined;

    /*
     * HEARTSTRONG has its own administration portal and must not load the
     * normal NAYSA user, menu, and global reference payloads.
     */
    if (user?.ACCOUNT_MODE === "LICENSE_ADMIN") {
      setCurrentUserRow(null);
      setCurrentMenu(null);
      setGlobalTables(null);
      setCompanyInfo(null);
      setallDropDown(null);
      setAllVATList(null);
      setAllATCList(null);
      setAllHSDoc(null);
      setRefsLoading(false);
      setRefsLoaded(true);

      persistRefsToCache({
        companyInfo: null,
        allDropDown: null,
        currentUserRow: null,
        currentMenu: null,
        globalTables: null,
        allVATList: null,
        allATCList: null,
        allHSDoc: null,
        refsLoaded: true,
      });

      return undefined;
    }

    let cancelled = false;

    /*
     * Normal users use their own USER_CODE.
     *
     * MIRACLE and any other fixed system account can authenticate through a
     * carrier/template account while loading permissions from a separate
     * permission account.
     */
    const authUserCode =
      user?.AUTH_USER_CODE || user.USER_CODE;

    const permissionUserCode =
      user?.PERMISSION_USER_CODE || user.USER_CODE;

    const loadStaticRefs = async () => {
      try {
        setRefsLoading(true);

        const results = await Promise.allSettled([
          useTopUserRow(authUserCode),
          fetchData("menu-items", {
            USER_CODE: permissionUserCode,
          }),
          useTopCompanyGlobalTables(),
        ]);

        if (cancelled) return;

        const userRowResult = results[0];
        const currentMenuResult = results[1];
        const globalTableResult = results[2];

        const nextUserRow =
          userRowResult.status === "fulfilled"
            ? userRowResult.value ?? null
            : null;

        const nextCurrentMenu =
          currentMenuResult.status === "fulfilled"
            ? currentMenuResult.value ?? null
            : null;

        const nextGlobalTables =
          globalTableResult.status === "fulfilled"
            ? globalTableResult.value ?? null
            : null;

        const nextCompanyInfo =
          nextGlobalTables?.company?.[0] ?? null;

        const nextAllDropDown =
          nextGlobalTables?.allDropdown ?? null;

        const nextAllVATList =
          nextGlobalTables?.vatList ?? null;

        const nextAllATCList =
          nextGlobalTables?.atcList ?? null;

        const nextAllHSDoc =
          nextGlobalTables?.hsDoc ?? null;

        setCurrentUserRow(nextUserRow);
        setCurrentMenu(nextCurrentMenu);
        setGlobalTables(nextGlobalTables);
        setCompanyInfo(nextCompanyInfo);
        setallDropDown(nextAllDropDown);
        setAllVATList(nextAllVATList);
        setAllATCList(nextAllATCList);
        setAllHSDoc(nextAllHSDoc);
        setRefsLoaded(true);

        persistRefsToCache({
          companyInfo: nextCompanyInfo,
          allDropDown: nextAllDropDown,
          currentUserRow: nextUserRow,
          currentMenu: nextCurrentMenu,
          globalTables: nextGlobalTables,
          allVATList: nextAllVATList,
          allATCList: nextAllATCList,
          allHSDoc: nextAllHSDoc,
          refsLoaded: true,
        });

        if (userRowResult.status === "rejected") {
          console.error(
            "Failed to load user row:",
            userRowResult.reason
          );
        }

        if (currentMenuResult.status === "rejected") {
          console.error(
            "Failed to load menu items:",
            currentMenuResult.reason
          );
        }

        if (globalTableResult.status === "rejected") {
          console.error(
            "Failed to load global tables:",
            globalTableResult.reason
          );
        }
      } catch (error) {
        console.error(
          "Failed to load authentication references:",
          error
        );
      } finally {
        if (!cancelled) setRefsLoading(false);
      }
    };

    loadStaticRefs();

    return () => {
      cancelled = true;
    };
  }, [
    loading,
    persistRefsToCache,
    user?.USER_CODE,
    user?.AUTH_USER_CODE,
    user?.PERMISSION_USER_CODE,
    user?.ACCOUNT_MODE,
  ]);

  useEffect(() => {
    const bumpActivity = () => {
      if (document.visibilityState !== "hidden") {
        lastActivity.current = Date.now();
      }
    };

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((eventName) =>
      window.addEventListener(eventName, bumpActivity, { passive: true })
    );
    document.addEventListener("visibilitychange", bumpActivity);

    return () => {
      events.forEach((eventName) =>
        window.removeEventListener(eventName, bumpActivity)
      );
      document.removeEventListener("visibilitychange", bumpActivity);
    };
  }, []);

  const validateSession = useCallback(async () => {
    if (loading || !user?.USER_CODE) return false;
    if (isBioAuthInProgress() || loginInProgressRef.current) return true;

    const generation = authGenerationRef.current;
    const requestEpoch = readAuthEpoch();

    try {
      const response = await apiClient.get("/me", {
        withCredentials: true,
        headers: {
          "X-Skip-Logout-Broadcast": "1",
          "X-Use-Credentials": "1",
        },
      });

      if (
        generation !== authGenerationRef.current ||
        (requestEpoch && requestEpoch !== readAuthEpoch())
      ) {
        return true;
      }

      if (response?.data?.USER_CODE) {
        cacheUser(response.data);
      }

      return true;
    } catch (error) {
      if (
        generation !== authGenerationRef.current ||
        (requestEpoch && requestEpoch !== readAuthEpoch())
      ) {
        return false;
      }

      if (
        loginInProgressRef.current ||
        (sessionEstablishedAtRef.current > 0 &&
          Date.now() - sessionEstablishedAtRef.current < LOGIN_GRACE_MS)
      ) {
        return true;
      }

      const status = error?.response?.status;
      const code = error?.response?.data?.code;

      if (code === "LOGGED_IN_ELSEWHERE") {
        await serverLogout("remote_elsewhere");
        return false;
      }

      if (code === "SESSION_EXPIRED" || status === 419) {
        await serverLogout("expired");
        return false;
      }

      if (status === 401) {
        await serverLogout("remote");
        return false;
      }

      /* A permission-related 403 must not destroy a valid login session. */
      if (status !== 403) {
        console.warn("Session validation failed:", error);
      }

      return true;
    }
  }, [loading, user?.USER_CODE]);

  useEffect(() => {
    if (loading || !user?.USER_CODE) return undefined;

    let focusTimer = null;

    const onFocus = () => {
      if (document.visibilityState !== "visible") return;
      if (isBioAuthInProgress() || loginInProgressRef.current) return;

      clearTimeout(focusTimer);
      focusTimer = window.setTimeout(() => {
        if (pendingLogoutNoticeRef.current) {
          pendingLogoutNoticeRef.current = false;
          useSwalSuccessAlert("Session ended", "Your session has ended.");
        }

        validateSession();
      }, 500);
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [loading, user?.USER_CODE, validateSession]);

  const checkPendingLoginApproval = useCallback(async () => {
    if (!user?.USER_CODE || loading) return;
    if (isBioAuthInProgress() || loginInProgressRef.current) return;
    if (pendingApprovalDisabledRef.current) return;
    if (Date.now() < pendingApprovalRetryAtRef.current) return;

    try {
      const { data } = await apiClient.get("/login/pending-request", {
        withCredentials: true,
        headers: {
          "X-Skip-Logout-Broadcast": "1",
          "X-Use-Credentials": "1",
        },
      });

      pendingApprovalFailureCountRef.current = 0;
      pendingApprovalRetryAtRef.current = 0;

      if (!data?.hasPending || !data?.requestId) return;
      if (loginApprovalPromptRef.current === data.requestId) return;

      loginApprovalPromptRef.current = data.requestId;

      const browserInfo = escapeHtml(data.browserInfo || "Unknown device");
      const ipAddress = escapeHtml(data.ipAddress || "Unknown");

      const result = await Swal.fire({
        title: "",
        icon: undefined,
        html: `
          <div style="text-align:left;max-height:62vh;overflow-y:auto;">
            <div style="height:4px;width:44px;border-radius:999px;background:linear-gradient(90deg,#2563eb,#38bdf8);margin:0 auto 12px;"></div>

            <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
              <div style="height:34px;width:34px;min-width:34px;border-radius:12px;background:#eff6ff;display:flex;align-items:center;justify-content:center;color:#1d4ed8;font-size:18px;font-weight:900;">âœ“</div>
              <div>
                <div style="font-size:15px;font-weight:800;color:#0f172a;line-height:1.2;">Approve Login Request</div>
                <div style="font-size:11px;color:#64748b;margin-top:3px;">A new device wants to use your account.</div>
              </div>
            </div>

            <div style="border:1px solid #e2e8f0;background:linear-gradient(180deg,#f8fafc,#ffffff);border-radius:14px;padding:10px;margin-bottom:10px;">
              <div style="font-size:11px;font-weight:700;color:#64748b;margin-bottom:6px;">Device</div>
              <div style="font-size:12px;color:#334155;line-height:1.4;word-break:break-word;">${browserInfo}</div>
              <div style="height:1px;background:#e2e8f0;margin:8px 0;"></div>
              <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;">
                <span style="font-size:11px;font-weight:700;color:#64748b;">IP Address</span>
                <span style="font-size:12px;color:#334155;word-break:break-word;text-align:right;">${ipAddress}</span>
              </div>
            </div>

            <div style="border-radius:12px;background:#fff7ed;border:1px solid #fdba74;padding:9px;font-size:11px;line-height:1.35;color:#9a3412;">Approve only if this login was requested by you.</div>
          </div>
        `,
        width: "min(330px, calc(100vw - 28px))",
        padding: "0.85rem",
        background: "#ffffff",
        backdrop: "rgba(15, 23, 42, 0.32)",
        showCancelButton: true,
        showConfirmButton: true,
        confirmButtonText: "Approve",
        cancelButtonText: "Deny",
        reverseButtons: true,
        allowOutsideClick: false,
        allowEscapeKey: false,
        buttonsStyling: false,
        heightAuto: false,
        customClass: {
          popup: "rounded-2xl shadow-2xl border border-slate-200",
          htmlContainer: "m-0",
          actions: "mt-3 grid w-full grid-cols-2 gap-2",
          confirmButton:
            "w-full rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-600",
          cancelButton:
            "w-full rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200",
        },
      });

      if (result.isConfirmed) {
        await apiClient.post(
          "/login/approve-request",
          { requestId: data.requestId },
          { withCredentials: true }
        );

        useSwalSuccessAlert(
          "Login approved",
          "The other device can now continue logging in."
        );
      } else {
        await apiClient.post(
          "/login/deny-request",
          { requestId: data.requestId },
          { withCredentials: true }
        );

        useSwalSuccessAlert("Login denied", "The login request was denied.");
      }
    } catch (error) {
      const status = error?.response?.status;

      if (status === 401 || status === 403 || status === 419) {
        pendingApprovalDisabledRef.current = true;
        return;
      }

      pendingApprovalFailureCountRef.current += 1;
      const backoffMs = Math.min(
        60000,
        5000 * 2 ** Math.min(pendingApprovalFailureCountRef.current - 1, 4)
      );
      pendingApprovalRetryAtRef.current = Date.now() + backoffMs;

      if (![401, 403, 419].includes(status)) {
        console.warn("Pending login approval check failed:", error);
      }
    } finally {
      loginApprovalPromptRef.current = null;
    }
  }, [loading, serverLogout, user?.USER_CODE]);

  useEffect(() => {
    if (loading || !user?.USER_CODE) return undefined;

    let stopped = false;

    const idleCheck = async () => {
      if (stopped) return;

      if (isBioAuthInProgress() || loginInProgressRef.current) {
        idleTimer.current = window.setTimeout(idleCheck, 1000);
        return;
      }

      if (Date.now() - lastActivity.current >= IDLE_LIMIT_MS) {
        await serverLogout("idle");
        return;
      }

      idleTimer.current = window.setTimeout(idleCheck, 1000);
    };

    const heartbeatTick = async () => {
      if (stopped) return;

      const isHidden = document.visibilityState !== "visible";
      const interval = isHidden
        ? REMOTE_HEARTBEAT_MS * 4
        : REMOTE_HEARTBEAT_MS;

      if (!isBioAuthInProgress() && !loginInProgressRef.current) {
        const isLeader = tryAcquireLeader();
        if (isLeader && !stopped) {
          const valid = await validateSession();
          if (valid && !stopped) renewLeader();
        }
      }

      const jitter = Math.floor(Math.random() * (isHidden ? 1500 : 500));
      heartbeatTimer.current = window.setTimeout(
        heartbeatTick,
        interval + jitter
      );
    };

    idleCheck();

    /* /me has already validated the new session; delay the first heartbeat. */
    heartbeatTimer.current = window.setTimeout(
      heartbeatTick,
      REMOTE_HEARTBEAT_MS
    );

    return () => {
      stopped = true;
      clearTimers();
    };
  }, [clearTimers, loading, serverLogout, user?.USER_CODE, validateSession]);

  useEffect(() => {
    if (loading || !user?.USER_CODE) return undefined;

    let stopped = false;
    let timer = null;

    const tick = async () => {
      if (stopped) return;

      if (!isBioAuthInProgress() && !loginInProgressRef.current) {
        await checkPendingLoginApproval();
      }

      if (!stopped) timer = window.setTimeout(tick, 3000);
    };

    timer = window.setTimeout(tick, 1000);

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [checkPendingLoginApproval, loading, user?.USER_CODE]);

  const login = useCallback(
    async ({
      companyCode,
      USER_CODE,
      PASSWORD,
      forceLogin = false,
      approvalRequestId = "",
    }) => {
      const generation = ++authGenerationRef.current;
      loginInProgressRef.current = true;
      logoutLatchRef.current = false;

      try {
        setTenant(companyCode);
        await ensureCsrf();

        await apiClient.post(
          "/login",
          {
            USER_CODE,
            PASSWORD,
            forceLogin,
            approvalRequestId,
          },
          {
            withCredentials: true,
            headers: {
              "X-Skip-Logout-Broadcast": "1",
              "X-Use-Credentials": "1",
            },
          }
        );

        const { data } = await apiClient.get("/me", {
          withCredentials: true,
          headers: {
            "X-Skip-Logout-Broadcast": "1",
            "X-Use-Credentials": "1",
          },
        });

        if (!data?.USER_CODE) {
          throw new Error("The server did not return the authenticated user.");
        }

        if (generation !== authGenerationRef.current) return data;

        establishAuthenticatedUser(data, { createNewEpoch: true });
        clearRefStates();
        setLoading(false);

        return data;
      } finally {
        window.setTimeout(() => {
          if (generation === authGenerationRef.current) {
            loginInProgressRef.current = false;
          }
        }, 2000);
      }
    },
    [clearRefStates, establishAuthenticatedUser]
  );

  const loginWithBiometric = useCallback(
    async ({ companyCode, payload }) => {
      const generation = ++authGenerationRef.current;
      loginInProgressRef.current = true;
      logoutLatchRef.current = false;

      try {
        setTenant(companyCode);
        await ensureCsrf();

        await bioLoginVerifyPasswordless(payload, {
          withCredentials: true,
          headers: {
            "X-Skip-Logout-Broadcast": "1",
            "X-Use-Credentials": "1",
          },
        });

        const { data } = await apiClient.get("/me", {
          withCredentials: true,
          headers: {
            "X-Skip-Logout-Broadcast": "1",
            "X-Use-Credentials": "1",
          },
        });

        if (!data?.USER_CODE) {
          throw new Error("The server did not return the authenticated user.");
        }

        if (generation !== authGenerationRef.current) return data;

        establishAuthenticatedUser(data, { createNewEpoch: true });
        clearRefStates();
        setLoading(false);

        return data;
      } finally {
        window.setTimeout(() => {
          if (generation === authGenerationRef.current) {
            loginInProgressRef.current = false;
          }
        }, 2000);
      }
    },
    [clearRefStates, establishAuthenticatedUser]
  );

  const setUser = useCallback((value) => {
    setUserState((prev) => {
      const nextValue =
        typeof value === "function" ? value(prev) : value ?? null;
      cacheUser(nextValue);
      return nextValue;
    });
  }, []);

  const getAllDropDown = useCallback(
    (columnName, docCode) => {
      if (!Array.isArray(allDropDown)) return [];
      return allDropDown.filter(
        (item) =>
          item?.DROPDOWN_COLUMN === columnName && item?.DOC_CODE === docCode
      );
    },
    [allDropDown]
  );


  const getAllTopHSDocRow = useCallback(
    (docCode) => {
      if (!Array.isArray(allHSDoc)) return null;

      if (docCode === 'All') {
        return allHSDoc;
      }

      if (!docCode) return null;

      return allHSDoc.find((item) => item?.docCode === docCode) || null;
    },
    [allHSDoc]
  );


 const getAllTopVatRow = useCallback(
  (vatCode) => {
    if (!Array.isArray(allVATList)) return vatCode === "All" ? [] : null;

    if (vatCode === "All") return allVATList;

    if (!vatCode) return null;

    return allVATList.find((item) => item?.vatCode === vatCode) || null;
  },
  [allVATList]
);

  const getReplacementVatRow = useCallback(
    (
      vatCode,
      vatType = "",
      fromVatClass = "G",
      toVatClass = "S",
      vatCategory = ""
    ) => {
      const vatRow = getAllTopVatRow(vatCode);
      if (!vatRow) return null;

      if (
        vatRow.vatClass === fromVatClass &&
        Number(vatRow.vatRate || 0) > 0 &&
        vatRow.vatType === vatType
      ) {
        const allVatRows = getAllTopVatRow("All");

        if (!Array.isArray(allVatRows)) return vatRow;

        return (
          allVatRows.find(
            (item) =>
              item?.vatClass === toVatClass &&
              Number(item?.vatRate || 0) > 0 &&
              item?.vatType === vatType &&
              (!vatCategory || item?.vatCategory === vatCategory)
          ) || vatRow
        );
      }

      return vatRow;
    },
    [getAllTopVatRow]
  );


  const getAllTopATCRow = useCallback(
    (atcCode) => {
      if (!Array.isArray(allATCList) || !atcCode) return null;
      return allATCList.find((item) => item?.atcCode === atcCode) || null;
    },
    [allATCList]
  );




const roundAmount = (value, decimals = 2) => {
  const factor = Math.pow(10, decimals);
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
};

const toNumberAmount = (value) => {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  const cleanedValue = String(value)
    .replace(/,/g, "")
    .trim();
  const numberValue = Number(cleanedValue);
  return Number.isFinite(numberValue) ? numberValue : 0;
};



const getAllTopVatAmount = useCallback(
  (vatCode, grossAmt) => {
    const amount = toNumberAmount(grossAmt);

    if (!String(vatCode || "").trim() || amount === 0) return 0;

    const vatRow = getAllTopVatRow(vatCode);
    if (!vatRow) return 0;

    const vatRate = toNumberAmount(vatRow.vatRate);
    const rate = vatRate * 0.01;

    if (rate === 0) return 0;

    return roundAmount((amount * rate) / (1 + rate), 2);
  },
  [getAllTopVatRow]
);





const getAllTopATCAmount = useCallback(
  (atcCode, netAmount) => {
    const amount = toNumberAmount(netAmount);

    if (!String(atcCode || "").trim() || amount === 0) return 0;

    const atcRow = getAllTopATCRow(atcCode);
    if (!atcRow) return 0;

    const atcRate = toNumberAmount(atcRow.atcRate);
    const rate = atcRate * 0.01;

    if (rate === 0) return 0;

    return roundAmount(amount * rate, 2);
  },
  [getAllTopATCRow]
);





  const authContextValue = useMemo(
    () => ({
      user,
      loading,
      login,
      loginWithBiometric,
      logout,
      setUser,
      companyInfo,
      getAllDropDown,
      getAllTopATCRow,
      getAllTopVatRow,
      getReplacementVatRow,
      getAllTopVatAmount,
      getAllTopATCAmount,
      getAllTopHSDocRow,
      currentUserRow,
      refsLoading,
      refsLoaded,
    }),
    [
      user,
      loading,
      login,
      loginWithBiometric,
      logout,
      setUser,
      companyInfo,
      getAllDropDown,
      getAllTopATCRow,
      getAllTopVatRow,
      getReplacementVatRow,
      getAllTopVatAmount,
      getAllTopATCAmount,
      getAllTopHSDocRow,
      currentUserRow,
      refsLoading,
      refsLoaded,
    ]
  );

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
