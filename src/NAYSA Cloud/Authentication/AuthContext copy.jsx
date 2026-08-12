

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import {
  apiClient,
  ensureCsrf,
  setTenant,
  getTenant,
  markAuthReady,
  pingRemoteCheck,
  pingExpiryCheck,
  getLastAuthApiTouch,
  fetchData,
  bioLoginVerifyPasswordless,
} from "@/NAYSA Cloud/Configuration/BaseURL.jsx";

import {
  useTopUserRow,
  useTopCompanyGlobalTables,
} from "@/NAYSA Cloud/Global/top1RefTable";

import { useSwalSuccessAlert } from "@/NAYSA Cloud/Global/behavior.jsx";
import Swal from "sweetalert2";

const AuthContext = createContext(null);

const isBioAuthInProgress = () => {
  try {
    return sessionStorage.getItem("bioAuthInProgress") === "1";
  } catch {
    return false;
  }
};

/* -------- Timing (VITE_SESSION_LIFETIME in MINUTES) -------- */
const IDLE_LIMIT_MINUTES =
  typeof import.meta.env.VITE_SESSION_LIFETIME !== "undefined"
    ? parseInt(import.meta.env.VITE_SESSION_LIFETIME, 10)
    : 60;

const IDLE_LIMIT_MS = IDLE_LIMIT_MINUTES * 60 * 1000;

/* -------- Heartbeats -------- */
const REMOTE_HEARTBEAT_MS = Math.max(
  1000,
  (Number(import.meta.env.VITE_REMOTE_HEARTBEAT_SECONDS ?? 15) | 0) * 1000
);
const EXPIRE_HEARTBEAT_MS = Math.max(60_000, IDLE_LIMIT_MINUTES * 60_000);

/* ---------------- Leader heartbeat across tabs ---------------- */
const AUTH_BC_NAME = "auth";
const TAB_ID = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const HB_LEASE_KEY = "naysa_hb_leader";
const HB_LEASE_MS = Math.max(EXPIRE_HEARTBEAT_MS * 1.25, 45_000);

/* ---------------- Local cache keys ---------------- */
const USER_CACHE_KEY = "naysa_user";
const AUTH_REFS_CACHE_KEY = "naysa_auth_refs";

function readLease() {
  try {
    return JSON.parse(localStorage.getItem(HB_LEASE_KEY) || "null");
  } catch {
    return null;
  }
}

function tryAcquireLeader() {
  const now = Date.now();
  const cur = readLease();

  if (!cur || !cur.id || cur.expiresAt <= now) {
    localStorage.setItem(
      HB_LEASE_KEY,
      JSON.stringify({ id: TAB_ID, expiresAt: now + HB_LEASE_MS })
    );
    return true;
  }

  return cur.id === TAB_ID;
}

function renewLeader() {
  const now = Date.now();
  localStorage.setItem(
    HB_LEASE_KEY,
    JSON.stringify({ id: TAB_ID, expiresAt: now + HB_LEASE_MS })
  );
}

const cacheUser = (u) => {
  try {
    if (u) localStorage.setItem(USER_CACHE_KEY, JSON.stringify(u));
    else localStorage.removeItem(USER_CACHE_KEY);
  } catch {}
};

const readCachedUser = () => {
  try {
    return JSON.parse(localStorage.getItem(USER_CACHE_KEY) || "null");
  } catch {
    return null;
  }
};

const cacheAuthRefs = (refs) => {
  try {
    if (refs) localStorage.setItem(AUTH_REFS_CACHE_KEY, JSON.stringify(refs));
    else localStorage.removeItem(AUTH_REFS_CACHE_KEY);
  } catch {}
};

const readCachedAuthRefs = () => {
  try {
    return JSON.parse(localStorage.getItem(AUTH_REFS_CACHE_KEY) || "null");
  } catch {
    return null;
  }
};

export default function AuthProvider({ children }) {
  const [user, setUserState] = useState(() => readCachedUser());
  const [loading, setLoading] = useState(() => !!readCachedUser());

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
  const lastActivity = useRef(Date.now());
  const idleTimer = useRef(null);
  const remoteHbTimer = useRef(null);
  const expireHbTimer = useRef(null);
  const bcRef = useRef(null);
  const isMountedRef = useRef(true);

  const safeSetUser = useCallback((value) => {
    if (!isMountedRef.current) return;
    setUserState(value);
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
      allHSDoc:nextRefs.allHSDoc ?? null,
      refsLoaded: !!nextRefs.refsLoaded,
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

      // cache is fallback only; do not trust it as fully loaded
      setRefsLoaded(false);
    } catch (err) {
      console.error("Failed to hydrate auth refs from cache:", err);
    }
  }, []);

  const hardLogout = useCallback(() => {
    safeSetUser(null);

    try {
      localStorage.removeItem(USER_CACHE_KEY);
      localStorage.removeItem(AUTH_REFS_CACHE_KEY);
      localStorage.removeItem("naysa_sidebar_pinned");
      localStorage.removeItem("naysa_sidebar_open_keys");
      localStorage.removeItem("naysa_sidebar_scroll_top");
      sessionStorage.removeItem("menuItems");
      sessionStorage.removeItem("routeRows");
    } catch {}

    cacheUser(null);
    cacheAuthRefs(null);
    markAuthReady(false);

    clearRefStates();

    lastActivity.current = Date.now();

    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (remoteHbTimer.current) clearTimeout(remoteHbTimer.current);
    if (expireHbTimer.current) clearTimeout(expireHbTimer.current);
  }, [clearRefStates, safeSetUser]);

  const serverLogout = useCallback(
    async (reason = "manual") => {
      if (isBioAuthInProgress()) return;
      if (logoutLatchRef.current) return;
      logoutLatchRef.current = true;

      const msg =
        reason === "idle"
          ? {
              title: "Signed out for inactivity",
              text: "You were inactive and have been signed out.",
            }
          : reason === "expired"
          ? {
              title: "Session expired",
              text: "Your session expired. Please sign in again.",
            }
          : reason === "remote_elsewhere"
? {
    title: "Signed out from another device",
    text: "Your account was logged in from another device.",
  }
: reason === "remote"
? {
    title: "Signed out",
    text: "Your account was signed out by the server. Please sign in again.",
  }
          : {
              title: "Session ended",
              text: "Your session has ended.",
            };

      const shouldCallLogoutApi = reason === "manual";

      if (shouldCallLogoutApi) {
        try {
          await apiClient.post("/logout", null, {
            withCredentials: true,
            headers: { "X-Skip-Logout-Broadcast": "1" },
          });
        } catch (err) {
          const status = err?.response?.status;

          // expected if session already gone
          if (![401, 403, 419].includes(status)) {
            console.warn("Logout API failed, continuing local logout:", err);
          }
        }
      }

      try {
        bcRef.current?.postMessage({ type: "logout", reason });
      } catch {}

      hardLogout();

      if (document.visibilityState === "visible") {
        try {
          useSwalSuccessAlert(msg.title, msg.text);
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
    if (typeof BroadcastChannel === "undefined") return;

    const bc = new BroadcastChannel(AUTH_BC_NAME);
    bcRef.current = bc;

    bc.onmessage = async (e) => {
      if (!e?.data?.type) return;

      if (e.data.type === "logout") {
        if (isBioAuthInProgress()) return;
        if (logoutLatchRef.current) return;

        logoutLatchRef.current = true;

        const reason = e.data.reason;
        const showPopup = document.visibilityState === "visible";

        // do not call /logout again from other tabs
        hardLogout();

        const msg =
          reason === "idle"
            ? {
                title: "Signed out for inactivity",
                text: "You were inactive and have been signed out. Please sign in again.",
              }
            : reason === "expired"
            ? {
                title: "Session expired",
                text: "Your session expired.",
              }
            : reason === "remote_elsewhere"
? {
    title: "Signed out from another device",
    text: "Your account was logged in from another device.",
  }
: reason === "remote"
? {
    title: "Signed out",
    text: "Your account was signed out by the server. Please sign in again.",
  }
            : {
                title: "Session ended",
                text: "Your session has ended.",
              };

        if (showPopup) {
          try {
            useSwalSuccessAlert(msg.title, msg.text);
          } catch {}
        } else {
          pendingLogoutNoticeRef.current = true;
        }

        return;
      }

      if (e.data.type === "tenant-changed" && e.data.code) {
        const incoming = String(e.data.code || "");
        const current = String(getTenant() || "");
        if (incoming && incoming !== current) {
          setTenant(incoming, { silent: true });
        }
      }
    };

    return () => bc.close();
  }, [hardLogout]);


  
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const code = getTenant();
        if (code) setTenant(code);

        await ensureCsrf();

        const res = await apiClient.get("/me", {
          withCredentials: true,
          headers: {
            "X-Skip-Logout-Broadcast": "1",
            "X-Use-Credentials": "1",
          },
        });

        if (cancelled) return;

        const me = res?.data;
        safeSetUser(me);
        cacheUser(me);
        logoutLatchRef.current = false;
        markAuthReady(true);
      } catch {
        if (cancelled) return;

        safeSetUser(null);
        cacheUser(null);
        markAuthReady(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [safeSetUser]);




  useEffect(() => {
    if (!user?.USER_CODE) return;

    let cancelled = false;

    const loadStaticRefs = async () => {
      try {
        setRefsLoading(true);

        const results = await Promise.allSettled([
          useTopUserRow(user.USER_CODE),
          fetchData("menu-items", { USER_CODE: user.USER_CODE }),
          useTopCompanyGlobalTables(),
        ]);

        if (cancelled) return;

        const userRowResult = results[0];
        const currentMenuResult = results[1];
        const globalTblResult = results[2];

        const nextUserRow =
          userRowResult.status === "fulfilled"
            ? userRowResult.value ?? null
            : null;

        const nextCurrentMenu =
          currentMenuResult.status === "fulfilled"
            ? currentMenuResult.value ?? null
            : null;

        const nextGlobalTbl =
          globalTblResult.status === "fulfilled"
            ? globalTblResult.value ?? null
            : null;

        const nextCompanyInfo = nextGlobalTbl?.company?.[0] ?? null;
        const nextAllDropDown = nextGlobalTbl?.allDropdown ?? null;
        const nextAllVATList = nextGlobalTbl?.vatList ?? null;
        const nextAllATCList = nextGlobalTbl?.atcList ?? null;
        const nextAllHSDoc = nextGlobalTbl?.hsDoc ?? null;

        setCurrentUserRow(nextUserRow);
        setCurrentMenu(nextCurrentMenu);
        setGlobalTables(nextGlobalTbl);
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
          globalTables: nextGlobalTbl,
          allVATList: nextAllVATList,
          allATCList: nextAllATCList,
          allHSDoc:nextAllHSDoc,
          refsLoaded: true,
        });

        if (userRowResult.status === "rejected") {
          console.error("Failed to load user row:", userRowResult.reason);
        }
        if (currentMenuResult.status === "rejected") {
          console.error("Failed to load menu items:", currentMenuResult.reason);
        }
        if (globalTblResult.status === "rejected") {
          console.error("Failed to load global tables:", globalTblResult.reason);
        }
      } catch (err) {
        console.error("Failed to load static refs:", err);
      } finally {
        if (!cancelled) setRefsLoading(false);
      }
    };

    loadStaticRefs();

    return () => {
      cancelled = true;
    };
  }, [user?.USER_CODE, persistRefsToCache]);

  useEffect(() => {
    const bump = () => {
      lastActivity.current = Date.now();
    };

    const events = [
      "mousemove",
      "keydown",
      "click",
      "scroll",
      "touchstart",
      "visibilitychange",
    ];

    events.forEach((ev) =>
      window.addEventListener(ev, bump, { passive: true })
    );

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, bump));
    };
  }, []);

  useEffect(() => {
  if (!user?.USER_CODE) return;

  let t = null;

  const check = async () => {
    if (!user?.USER_CODE) return;
    if (isBioAuthInProgress()) return;

    try {
      await apiClient.get("/me", {
        withCredentials: true,
        headers: { "X-Use-Credentials": "1" },
      });
    } catch (err) {
      const status = err?.response?.status;

      if (
        (status === 401 || status === 403 || status === 419) &&
        !isBioAuthInProgress()
      ) {
        const code = err?.response?.data?.code;

        await serverLogout(
          code === "LOGGED_IN_ELSEWHERE" ? "remote_elsewhere" : "remote"
        );
      }
    }
  };

  const onFocus = () => {
    if (!user?.USER_CODE) return;
    if (document.visibilityState !== "visible") return;
    if (isBioAuthInProgress()) return;

    clearTimeout(t);
    t = setTimeout(() => {
      if (!user?.USER_CODE) return;
      if (isBioAuthInProgress()) return;

      if (pendingLogoutNoticeRef.current) {
        pendingLogoutNoticeRef.current = false;
        useSwalSuccessAlert("Session ended", "Your session has ended.");
      }

      check();
    }, 500);
  };

  window.addEventListener("focus", onFocus);
  document.addEventListener("visibilitychange", onFocus);

  return () => {
    clearTimeout(t);
    window.removeEventListener("focus", onFocus);
    document.removeEventListener("visibilitychange", onFocus);
  };
}, [serverLogout, user?.USER_CODE]);


  const checkPendingLoginApproval = useCallback(async () => {
    if (!user?.USER_CODE) return;
    if (isBioAuthInProgress()) return;

    try {
      const { data } = await apiClient.get("/login/pending-request", {
        withCredentials: true,
        headers: { "X-Use-Credentials": "1" },
      });

      if (!data?.hasPending || !data?.requestId) return;
      if (loginApprovalPromptRef.current === data.requestId) return;

      loginApprovalPromptRef.current = data.requestId;

      const result = await Swal.fire({
  title: "",
  icon: undefined,
  html: `
    <div style="text-align:left;max-height:62vh;overflow-y:auto;">
      <div style="height:4px;width:44px;border-radius:999px;background:linear-gradient(90deg,#2563eb,#38bdf8);margin:0 auto 12px;"></div>

      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
        <div style="height:34px;width:34px;min-width:34px;border-radius:12px;background:#eff6ff;display:flex;align-items:center;justify-content:center;color:#1d4ed8;font-size:18px;font-weight:900;">
          ✓
        </div>
        <div>
          <div style="font-size:15px;font-weight:800;color:#0f172a;line-height:1.2;">
            Approve Login Request
          </div>
          <div style="font-size:11px;color:#64748b;margin-top:3px;">
            A new device wants to use your account.
          </div>
        </div>
      </div>

      <div style="border:1px solid #e2e8f0;background:linear-gradient(180deg,#f8fafc,#ffffff);border-radius:14px;padding:10px;margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:6px;">
          <span style="font-size:11px;font-weight:700;color:#64748b;">Device</span>
        </div>
        <div style="font-size:12px;color:#334155;line-height:1.4;word-break:break-word;">
          ${data.browserInfo || "Unknown device"}
        </div>
        <div style="height:1px;background:#e2e8f0;margin:8px 0;"></div>
        <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;">
          <span style="font-size:11px;font-weight:700;color:#64748b;">IP Address</span>
          <span style="font-size:12px;color:#334155;word-break:break-word;text-align:right;">${data.ipAddress || "Unknown"}</span>
        </div>
      </div>

      <div style="border-radius:12px;background:#fff7ed;border:1px solid #fed7aa;padding:9px;font-size:11px;line-height:1.35;color:#9a3412;">
        Approve only if this login was requested by you.
      </div>
    </div>
  `,
  width: "min(330px, calc(100vw - 28px))",
  padding: "0.85rem",
  background: "#ffffff",
  backdrop: "rgba(15, 23, 42, 0.32)",
  showCancelButton: true,
  showConfirmButton: true,
  confirmButtonText: "Approve",
  cancelButtonText: "Block",
  reverseButtons: true,
  allowOutsideClick: false,
  allowEscapeKey: false,
  buttonsStyling: false,
  heightAuto: false,
  showClass: {
    popup: "swal2-show",
    backdrop: "swal2-backdrop-show",
  },
  hideClass: {
    popup: "swal2-hide",
    backdrop: "swal2-backdrop-hide",
  },
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
    } catch (err) {
      console.warn("Pending login approval check failed:", err);
    } finally {
      loginApprovalPromptRef.current = null;
    }
  }, [user?.USER_CODE]);

  useEffect(() => {
    if (!user) return;

    let stopped = false;

    const idleCheck = async () => {
      if (stopped) return;

      if (isBioAuthInProgress()) {
        idleTimer.current = window.setTimeout(idleCheck, 1000);
        return;
      }

      const idleFor = Date.now() - lastActivity.current;

      if (idleFor >= IDLE_LIMIT_MS) {
        await serverLogout("idle");
        return;
      }

      idleTimer.current = window.setTimeout(idleCheck, 1000);
    };

    const remoteTick = async () => {
      if (stopped) return;

      if (isBioAuthInProgress()) {
        remoteHbTimer.current = window.setTimeout(
          remoteTick,
          REMOTE_HEARTBEAT_MS
        );
        return;
      }

      const isHidden = document.visibilityState !== "visible";
      const interval = isHidden ? REMOTE_HEARTBEAT_MS * 4 : REMOTE_HEARTBEAT_MS;
      const sinceLast = Date.now() - getLastAuthApiTouch();
const leader = tryAcquireLeader();

// Check login approval independently from normal /me heartbeat.
// Do not put this inside sinceLast check, because active API calls can keep
// sinceLast low and prevent the approval modal from showing.
if (sinceLast >= interval) {
  const leader = tryAcquireLeader();

  if (leader && !stopped) {
    const ok = await pingRemoteCheck();
    if (!ok) return;
    renewLeader();
  }
}

      const jitter = Math.floor(Math.random() * (isHidden ? 1500 : 500));
      remoteHbTimer.current = window.setTimeout(remoteTick, interval + jitter);
    };

    const expireTick = async () => {
      if (stopped) return;

      if (isBioAuthInProgress()) {
        expireHbTimer.current = window.setTimeout(
          expireTick,
          EXPIRE_HEARTBEAT_MS
        );
        return;
      }

      const isHidden = document.visibilityState !== "visible";
      const interval = isHidden ? EXPIRE_HEARTBEAT_MS * 2 : EXPIRE_HEARTBEAT_MS;

      const leader = tryAcquireLeader();
      if (leader && !stopped) {
        const ok = await pingExpiryCheck();
        if (!ok) return;
        renewLeader();
      }

      const jitter = Math.floor(Math.random() * (isHidden ? 3000 : 1000));
      expireHbTimer.current = window.setTimeout(expireTick, interval + jitter);
    };

    idleCheck();
    remoteTick();
    expireTick();

    return () => {
      stopped = true;
      if (idleTimer.current) clearTimeout(idleTimer.current);
      if (remoteHbTimer.current) clearTimeout(remoteHbTimer.current);
      if (expireHbTimer.current) clearTimeout(expireHbTimer.current);
    };
  }, [user, serverLogout, checkPendingLoginApproval]);

  useEffect(() => {
  if (!user?.USER_CODE) return;

  let stopped = false;
  let timer = null;

  const tick = async () => {
    if (stopped) return;
    if (isBioAuthInProgress()) return;

    await checkPendingLoginApproval();

    if (!stopped) {
      timer = window.setTimeout(tick, 3000);
    }
  };

  tick();

  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
}, [user?.USER_CODE, checkPendingLoginApproval]);

  const login = useCallback(
  async ({ companyCode, USER_CODE, PASSWORD, forceLogin = false, approvalRequestId = "" }) => {
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
        headers: { "X-Skip-Logout-Broadcast": "1" },
      }
    );

    const { data } = await apiClient.get("/me", {
      withCredentials: true,
      headers: { "X-Skip-Logout-Broadcast": "1" },
    });

    lastActivity.current = Date.now();
    safeSetUser(data);
    cacheUser(data);
    logoutLatchRef.current = false;
    markAuthReady(true);

    clearRefStates();
  },
  [safeSetUser, clearRefStates]
);

  const loginWithBiometric = useCallback(
    async ({ companyCode, payload }) => {
      setTenant(companyCode);

      await ensureCsrf();
      await bioLoginVerifyPasswordless(payload, {
        headers: { "X-Skip-Logout-Broadcast": "1" },
      });

      const { data } = await apiClient.get("/me", {
        withCredentials: true,
        headers: { "X-Skip-Logout-Broadcast": "1" },
      });

      lastActivity.current = Date.now();
      safeSetUser(data);
      cacheUser(data);
      logoutLatchRef.current = false;
      markAuthReady(true);

      clearRefStates();
    },
    [safeSetUser, clearRefStates]
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
