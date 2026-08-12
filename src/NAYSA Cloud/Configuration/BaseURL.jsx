import axios from "axios";

/* ───────── API roots ───────── */
export const API_ROOT = String(import.meta.env.VITE_API_URL || "").trim();

export const API_BASE = (() => {
  const root = API_ROOT.replace(/\/+$/, "");
  return `${root}/api`;
})();

/* ───────── Small utils (no axios refs here) ───────── */
const escapeRegExp = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function readCookie(name) {
  const re = new RegExp(`(?:^|; )${escapeRegExp(name)}=([^;]*)`);
  const m = document.cookie.match(re);
  return m ? m[1] : null;
}
function getXsrfToken() {
  const raw = readCookie("XSRF-TOKEN");
  return raw ? decodeURIComponent(raw) : null;
}
const toPath = (u) => {
  try {
    return /^https?:\/\//i.test(u) ? new URL(u).pathname || "/" : (u || "/");
  } catch {
    return u || "/";
  }
};
const IS_CROSS_ORIGIN = (() => {
  try {
    return new URL(API_ROOT).origin !== window.location.origin;
  } catch {
    return true;
  }
})();

/* Public GETs that must NOT send cookies or tenant header */
const PUBLIC_GETS = [/^\/?companies\/?$/i];

/* ───────── BroadcastChannel ───────── */
const bc =
  typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("auth") : null;
export function broadcast(type, payload = {}) {
  try {
    bc?.postMessage({ type, ...payload });
  } catch {}
}

/* ───────── Axios instances ───────── */
export const http = axios.create({
  baseURL: API_ROOT,
  withCredentials: true,
  timeout: 20000,
  headers: { Accept: "application/json" },
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
});

export const apiClient = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  timeout: 60000,
  headers: { Accept: "application/json" },
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
});

// Back-compat alias
export const api = apiClient;
export default apiClient;

/* ───────── Auth bootstrap readiness flag ───────── */
let AUTH_READY = false;
export function markAuthReady(v = true) {
  AUTH_READY = !!v;
}

/* ───────── Tenant (cross-tab share; clears on last tab close) ───────── */
const TENANT_KEY = "companyCode";
// const TAB_COUNT_KEY = "naysa_tabs_open"; // old approach (unload-based) — replaced with heartbeat approach

export const getTenant = () =>
  localStorage.getItem(TENANT_KEY) ||
  sessionStorage.getItem(TENANT_KEY) ||
  null;

export const setTenant = (code, opts = {}) => {
  const { silent = false } = opts;
  const current = getTenant();

  if (!code) {
    if (current != null) {
      localStorage.removeItem(TENANT_KEY);
      sessionStorage.removeItem(TENANT_KEY);
    }
    delete http.defaults.headers.common["X-Company-DB"];
    delete apiClient.defaults.headers.common["X-Company-DB"];
    return;
  }

  if (current === code) {
    http.defaults.headers.common["X-Company-DB"] = code;
    apiClient.defaults.headers.common["X-Company-DB"] = code;
    return;
  }

  localStorage.setItem(TENANT_KEY, code);
  sessionStorage.setItem(TENANT_KEY, code);
  http.defaults.headers.common["X-Company-DB"] = code;
  apiClient.defaults.headers.common["X-Company-DB"] = code;

  if (!silent) broadcast("tenant-changed", { code });
};

/* Bring tenant from localStorage into this tab’s session AFTER axios exists */
(() => {
  const code = localStorage.getItem(TENANT_KEY);
  if (code && !sessionStorage.getItem(TENANT_KEY)) {
    sessionStorage.setItem(TENANT_KEY, code);
    http.defaults.headers.common["X-Company-DB"] = code;
    apiClient.defaults.headers.common["X-Company-DB"] = code;
  }
})();

/* ───────── Multi-tab "logout only when last tab closes" (RELOAD-SAFE) ─────────
   Fixes: reload/duplicate tab should NOT clear tenant
   Requirement: clear tenant only when truly last tab is gone (unless forced logout)
*/
(function multiTabGuard() {
  // heartbeat keys: naysa_tab_<id> => lastSeenTs
  const TAB_PREFIX = "naysa_tab_";
  // per-tab id stored in sessionStorage (unique per tab)
  const TAB_ID_KEY = "naysa_tab_id";

  // pending logout marker written by closing tabs; surviving/new tabs will clear it
  const PENDING_LOGOUT_FLAG = "naysa_pending_logout";
  const PENDING_LOGOUT_TS = "naysa_pending_logout_ts";

  // optional: force logout flag (set this from your "Force Logout" button if needed)
  const FORCE_LOGOUT_FLAG = "naysa_force_logout";

  const HEARTBEAT_MS = 1500; // how often this tab refreshes heartbeat
  const TTL_MS = 6000;       // tab considered alive if heartbeat within this window
  const GRACE_MS = 2500;     // reload grace period (avoid false "last tab" on refresh)

  // NOTE: If localStorage is blocked, we simply do nothing (to avoid accidental logout)
  const safeLS = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} },
    del(k) { try { localStorage.removeItem(k); } catch {} },
    keys() {
      try {
        const arr = [];
        for (let i = 0; i < localStorage.length; i++) arr.push(localStorage.key(i));
        return arr.filter(Boolean);
      } catch {
        return [];
      }
    },
  };

  const now = () => Date.now();

  let tabId = null;
  try {
    tabId = sessionStorage.getItem(TAB_ID_KEY);
    if (!tabId) {
      tabId = `${now()}_${Math.random().toString(16).slice(2)}`;
      sessionStorage.setItem(TAB_ID_KEY, tabId);
    }
  } catch {
    // if sessionStorage blocked, generate ephemeral id
    tabId = `${now()}_${Math.random().toString(16).slice(2)}`;
  }

  const hbKey = `${TAB_PREFIX}${tabId}`;

  const setHeartbeat = () => safeLS.set(hbKey, String(now()));

  const cleanupDeadTabs = () => {
    const t = now();
    const keys = safeLS.keys();
    keys.forEach((k) => {
      if (!k.startsWith(TAB_PREFIX)) return;
      const ts = Number(safeLS.get(k) || "0");
      if (!ts || t - ts > TTL_MS) safeLS.del(k);
    });
  };

  const countAliveTabs = () => {
    const t = now();
    let alive = 0;
    const keys = safeLS.keys();
    keys.forEach((k) => {
      if (!k.startsWith(TAB_PREFIX)) return;
      const ts = Number(safeLS.get(k) || "0");
      if (ts && t - ts <= TTL_MS) alive++;
    });
    return alive;
  };

  const isForcedLogout = () => safeLS.get(FORCE_LOGOUT_FLAG) === "1";

  const doLastTabLogout = () => {
    // Clear tenant only here (true last tab / forced)
    safeLS.del(TENANT_KEY);

    // also clear tab bookkeeping + pending markers
    safeLS.del(PENDING_LOGOUT_FLAG);
    safeLS.del(PENDING_LOGOUT_TS);
    safeLS.del(FORCE_LOGOUT_FLAG);

    // IMPORTANT: Do NOT broadcast here — no other tabs exist (last tab).
    // Next open will naturally go to login because tenant is missing.
  };

  // 1) On boot: heartbeat + cleanup
  setHeartbeat();
  cleanupDeadTabs();

  // 2) If we see a pending logout marker older than GRACE_MS, and no other tabs are alive,
  //    then the previous last tab likely closed (not a reload). Clear tenant now.
  const pending = safeLS.get(PENDING_LOGOUT_FLAG) === "1";
  const pendingTs = Number(safeLS.get(PENDING_LOGOUT_TS) || "0");
  if (pending && pendingTs && now() - pendingTs > GRACE_MS) {
    // after we set our heartbeat, alive should be at least 1 (this tab).
    // if only 1 alive tab exists now, it means no other tabs survived.
    cleanupDeadTabs();
    const alive = countAliveTabs();
    if (alive <= 1) {
      doLastTabLogout();
    }
  }

  // 3) Start heartbeat interval
  const hbTimer = setInterval(() => {
    setHeartbeat();
    cleanupDeadTabs();

    // If this tab is alive, it should clear pending marker soon (prevents reload false logout).
    // Another surviving tab will also clear it.
    if (!isForcedLogout()) {
      const ts = Number(safeLS.get(PENDING_LOGOUT_TS) || "0");
      if (ts && now() - ts < TTL_MS) {
        // keep it until grace window passes, then clear
      } else {
        safeLS.del(PENDING_LOGOUT_FLAG);
        safeLS.del(PENDING_LOGOUT_TS);
      }
    }
  }, HEARTBEAT_MS);

  // 4) After GRACE_MS, if we are alive, clear pending marker (covers reload case)
  setTimeout(() => {
    safeLS.del(PENDING_LOGOUT_FLAG);
    safeLS.del(PENDING_LOGOUT_TS);
  }, GRACE_MS);

  // 5) On unload: remove our heartbeat and set a pending logout marker.
  //    If this was a reload, the new instance will clear the pending marker quickly.
  //    If this was truly the last tab closing, the marker remains and next open will clear tenant.
  const onBeforeUnload = () => {
    clearInterval(hbTimer);

    // mark pending logout attempt
    safeLS.set(PENDING_LOGOUT_FLAG, "1");
    safeLS.set(PENDING_LOGOUT_TS, String(now()));

    // remove this tab heartbeat
    safeLS.del(hbKey);
  };

  window.addEventListener("beforeunload", onBeforeUnload);
})();

/* ───────── CSRF cookie helper ───────── */
export async function ensureCsrf() {
  await http.get("/sanctum/csrf-cookie");
}

/* ───────── Interceptors ───────── */
function attachJsonContentType(instance) {
  instance.interceptors.request.use((config) => {
    const method = String(config.method || "").toLowerCase();
    if (/post|put|patch|delete/.test(method) && !config.headers?.["Content-Type"]) {
      (config.headers ||= {})["Content-Type"] = "application/json";
    }
    return config;
  });
}
attachJsonContentType(http);
attachJsonContentType(apiClient);

function attachXsrf(instance) {
  instance.interceptors.request.use((config) => {
    const method = String(config.method || "").toLowerCase();
    if (IS_CROSS_ORIGIN && /post|put|patch|delete/.test(method)) {
      const token = getXsrfToken();
      if (token) (config.headers ||= {})["X-XSRF-TOKEN"] = token;
    }
    return config;
  });
}
attachXsrf(http);
attachXsrf(apiClient);

// Attach/skip tenant; make /api/companies truly public
function attachTenantAndPublic(instance) {
  instance.interceptors.request.use((config) => {
    const method = String(config.method || "").toLowerCase();
    const path = toPath(config.url || "");
    const skipByFlag = config.headers?.["X-No-Tenant"] === "1";
    const isPublicGet = method === "get" && PUBLIC_GETS.some((re) => re.test(path));

    if (isPublicGet && !config.headers?.["X-Use-Credentials"]) {
      config.withCredentials = false;
      if (config.headers) delete config.headers["X-Company-DB"];
    } else {
      const tenant = getTenant();
      if (tenant && !skipByFlag && !config.headers?.["X-Company-DB"]) {
        (config.headers ||= {})["X-Company-DB"] = tenant;
      }
    }
    return config;
  });
}
attachTenantAndPublic(http);
attachTenantAndPublic(apiClient);

// Back-compat path rewrite: /apiClient/* → /*
apiClient.interceptors.request.use((config) => {
  let u = config.url || "";
  if (!/^https?:\/\//i.test(u)) {
    if (u.startsWith("//")) u = u.replace(/^\/+/, "/");
    if (u === "/apiClient") u = "/";
    else if (u.startsWith("/apiClient/")) u = u.replace(/^\/apiClient\//, "/");
    else if (u.startsWith("apiClient/")) u = u.replace(/^apiClient\//, "");
    config.url = u;
  }
  return config;
});

/* 401/419 broadcast rules */
const SKIP_401_BC = [
  /\/login$/i,
  /\/login\/pending-request$/i,
  /\/sanctum\/csrf-cookie$/i,
  /\/api\/companies$/i,
];

function shouldSkip401Broadcast(cfg) {
  const headers = cfg?.headers || {};
  const skipHeader =
    headers?.["X-Skip-Logout-Broadcast"] === "1" ||
    headers?.["x-skip-logout-broadcast"] === "1" ||
    (typeof headers?.get === "function" &&
      headers.get("X-Skip-Logout-Broadcast") === "1");
  if (skipHeader) return true;
  if (cfg?.withCredentials === false) return true;
  const path = toPath(cfg?.url || "");
  return SKIP_401_BC.some((re) => re.test(path));
}

/* ───────── First-tab bootstrap smoother: one-time auto-retry on 401/419 ───────── */
const retriedOnce = new WeakSet();

// endpoints we must NEVER bootstrap-retry
const SKIP_BOOTSTRAP_RETRY = [
  /\/api\/me$/i,
  /\/api\/login$/i, // <— important
  /\/api\/register$/i,
  /\/password\/?/i,
  /\/sanctum\/csrf-cookie$/i,
  /\/api\/companies$/i,
];

function shouldSkipBootstrapRetry(cfg) {
  if (!cfg) return true;
  const url = cfg.url || "/";
  let path = url;
  try {
    if (/^https?:\/\//i.test(url)) path = new URL(url).pathname || "/";
  } catch {}
  return SKIP_BOOTSTRAP_RETRY.some((re) => re.test(path));
}

function attachBootstrapRetry(instance) {
  instance.interceptors.response.use(
    (res) => res,
    async (err) => {
      const status = err?.response?.status;
      const cfg = err?.config;
      const method = String(cfg?.method || "").toLowerCase();

      // Only when: CSRF error (419), auth not ready yet, mutating request,
      // not skipped endpoint, and we haven't retried this request yet.
      const isMutating = /post|put|patch|delete/.test(method);

      if (
        status === 419 &&
        !AUTH_READY &&
        cfg &&
        isMutating &&
        !retriedOnce.has(cfg) &&
        !shouldSkipBootstrapRetry(cfg)
      ) {
        retriedOnce.add(cfg);
        try {
          await ensureCsrf(); // set XSRF cookie
          return instance.request(cfg); // retry once
        } catch {
          // fall through
        }
      }

      return Promise.reject(err);
    }
  );
}

attachBootstrapRetry(http);
attachBootstrapRetry(apiClient);

function attach401(instance) {
  instance.interceptors.response.use(
    (res) => res,
    (err) => {
      const status = err?.response?.status;
      const cfg = err?.config;
      // Only broadcast once auth is ready in this tab.
      if (
        AUTH_READY &&
        (status === 401 || status === 403 || status === 419) &&
        !shouldSkip401Broadcast(cfg)
      ) {
        broadcast("logout", { reason: "remote" });
      }
      return Promise.reject(err);
    }
  );
}
attach401(http);
attach401(apiClient);

/* ───────── Track last *authenticated* API touch ───────── */
let LAST_AUTH_API_TS = 0;
export const getLastAuthApiTouch = () => LAST_AUTH_API_TS;
const noteAuthApiTouch = () => {
  LAST_AUTH_API_TS = Date.now();
};

const isPublicGetRequest = (cfg) => {
  const method = String(cfg?.method || "").toLowerCase();
  const path = toPath(cfg?.url || "");
  const isPublicGet = method === "get" && PUBLIC_GETS.some((re) => re.test(path));
  const skipCreds =
    cfg?.headers?.["X-Use-Credentials"] === "1"
      ? false
      : cfg?.withCredentials === false;
  return isPublicGet && skipCreds !== false;
};

function touchOnAuthRequests(instance) {
  instance.interceptors.request.use((config) => {
    if (!isPublicGetRequest(config) && config.withCredentials !== false) {
      noteAuthApiTouch();
    }
    return config;
  });
}
touchOnAuthRequests(http);
touchOnAuthRequests(apiClient);

/* ───────── Separate heartbeats ───────── */
// A) Remote-check (used when no API calls recently). Broadcasts `remote` on 401/419.
export async function pingRemoteCheck() {
  try {
    await apiClient.post("/auth/heartbeat", null, {
      withCredentials: true,
      headers: { "X-Skip-Logout-Broadcast": "1", "X-Heartbeat": "remote" },
    });
    return true;
  } catch (err) {
    const s = err?.response?.status;
    if (s === 401 || s === 419) {
      broadcast("logout", { reason: "remote" });
    }
    return false;
  }
}

// B) Expiry-check (TTL / server-side expiry). Broadcasts `expired` on 401/419.
export async function pingExpiryCheck() {
  try {
    await apiClient.post("/auth/heartbeat", null, {
      withCredentials: true,
      headers: { "X-Skip-Logout-Broadcast": "1", "X-Heartbeat": "expiry" },
    });
    return true;
  } catch (err) {
    const s = err?.response?.status;
    if (s === 401 || s === 419) {
      broadcast("logout", { reason: "expired" });
    }
    return false;
  }
}

/* ───────── Convenience helpers ───────── */
export const fetchData = async (endpoint, params = {}) => {
  const { data } = await apiClient.get(endpoint, { params });
  return data;
};


export const fetchDataJson = async (
  endpoint,
  jsonPayload = {},
  page = 1,
  itemsPerPage = 50
) => {
  const { data } = await apiClient.get(endpoint, {
    params: { PARAMS: JSON.stringify({ json_data: jsonPayload }), page, itemsPerPage },
  });
  return data;
};

export const fetchDataJsonLookup = async (
  endpoint,
  jsonPayload = {},
  page = 1,
  itemsPerPage = 50
) => {
  const { data } = await apiClient.get(endpoint, {
    params: { PARAMS: JSON.stringify({ json_data: jsonPayload }), page, itemsPerPage },
  });
  return data;
};

export const postRequest = async (endpoint, body = {}, config = {}) => {
  const { data } = await apiClient.post(endpoint, body, config);
  return data;
};

const parsePossibleJson = (value) => {
  if (typeof value !== "string") return value;

  const text = value.trim();
  if (!text) return text;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const getFriendlyReportError = (rawMessage) => {
  const message = String(rawMessage || "").trim();
  const lower = message.toLowerCase();
  const reportMatch = message.match(/Error in File\s+(.+?)(?:_\d+_\{[A-F0-9-]+\})?\.rpt/i);
  const reportName = reportMatch?.[1]?.replace(/\s+\d+$/, "")?.trim();
  const reportLabel = reportName ? ` in ${reportName}` : "";

  if (lower.includes("operation illegal on linked parameter")) {
    return `The report template${reportLabel} contains an invalid linked parameter. Please ask the report designer to review the parameter links.`;
  }
  if (lower.includes("missing parameter values")) {
    return `The report${reportLabel} is missing one or more required values. Please complete the report filters and try again.`;
  }
  if (lower.includes("database logon failed")) {
    return "The printing service could not connect to the report database. Please contact your system administrator.";
  }
  if (lower.includes("load report failed")) {
    return `The report template${reportLabel} could not be opened. It may be missing, damaged, or incompatible with the server.`;
  }
  if (lower.includes("maximum report processing jobs")) {
    return "The printing service is temporarily busy. Please wait a moment and try printing again.";
  }

  return message;
};

export const getApiErrorMessage = (error, fallback = "Unable to generate the report.") => {
  const data = parsePossibleJson(error?.response?.data);
  const details = parsePossibleJson(data?.details ?? data?.Details);

  const rawMessage = (
    details?.ExceptionMessage ||
    details?.exceptionMessage ||
    details?.Message ||
    details?.message ||
    (typeof details === "string" ? details : "") ||
    data?.ExceptionMessage ||
    data?.exceptionMessage ||
    data?.Message ||
    data?.message ||
    error?.message ||
    fallback
  );

  return getFriendlyReportError(rawMessage);
};

export const postPdfRequest = async (endpoint, body = {}) => {
  try {
    const { data } = await apiClient.post(endpoint, body, {
      headers: {
        Accept: "application/pdf",
      },
      responseType: "blob",
    });

    return data;
  } catch (error) {
    let backendError = error?.response?.data;

    if (backendError instanceof Blob) {
      const text = await backendError.text();

      try {
        backendError = JSON.parse(text);
      } catch {
        backendError = {
          message: text,
        };
      }

      if (error.response) {
        error.response.data = backendError;
      }
    }

    error.message = getApiErrorMessage(error);

    console.error("PDF REQUEST FAILED:", {
      endpoint,
      body,
      status: error?.response?.status,
      backendError,
    });

    throw error;
  }
};





/* ───────── Biometric / WebAuthn helpers ───────── */

export const bioRegisterOptions = async (userCode, config = {}) => {
  const { data } = await apiClient.post(
    "/user-bio/register/options",
    { userCode },
    config
  );
  return data;
};

export const bioRegisterVerify = async (payload, config = {}) => {
  const normalizedPayload = {
    userCode: payload?.userCode ?? payload?.USER_CODE ?? "",
    credential: payload?.credential ?? null,
  };

  const { data } = await apiClient.post(
    "/user-bio/register/verify",
    normalizedPayload,
    config
  );
  return data;
};

export const bioLoginOptions = async (userCode, config = {}) => {
  const { data } = await apiClient.post(
    "/user-bio/login/options",
    { userCode },
    config
  );
  return data;
};

export const bioLoginVerify = async (payload, config = {}) => {
  const normalizedPayload = {
    userCode: payload?.userCode ?? payload?.USER_CODE ?? "",
    credential: payload?.credential ?? null,
  };

  const { data } = await apiClient.post(
    "/user-bio/login/verify",
    normalizedPayload,
    config
  );
  return data;
};

export const bioList = async (userCode, config = {}) => {
  const { data } = await apiClient.get(
    `/user-bio/list/${encodeURIComponent(userCode)}`,
    config
  );
  return data;
};

export const bioDeactivate = async (id, config = {}) => {
  const { data } = await apiClient.post(
    "/user-bio/deactivate",
    { id },
    config
  );
  return data;
};

export const bioDelete = async (id, config = {}) => {
  const { data } = await apiClient.post(
    "/user-bio/delete",
    { id },
    config
  );
  return data;
};

export const bioLoginOptionsPasswordless = async (config = {}) => {
  const { data } = await apiClient.post(
    "/user-bio/login/options-passwordless",
    {},
    config
  );
  return data;
};

export const bioLoginVerifyPasswordless = async (payload, config = {}) => {
  const normalizedPayload = {
    credential: payload?.credential ?? null,
  };

  const { data } = await apiClient.post(
    "/user-bio/login/verify-passwordless",
    normalizedPayload,
    config
  );
  return data;
};
