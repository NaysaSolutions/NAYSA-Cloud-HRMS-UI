const { app, BrowserWindow, session, shell } = require("electron");
const path = require("path");

const isDev = !app.isPackaged;
const devServerUrl = process.env.VITE_DEV_SERVER_URL || "http://localhost:5173";
const scannerRoute = "/electron-scanner";

function createScannerWindow() {
  const scannerWindow = new BrowserWindow({
    title: "NAYSA QR / Barcode Scanner",
    width: 820,
    height: 900,
    minWidth: 520,
    minHeight: 720,
    show: false,
    backgroundColor: "#020617",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
    },
  });

  scannerWindow.once("ready-to-show", () => {
    scannerWindow.show();
    if (process.env.ELECTRON_OPEN_DEVTOOLS === "true") {
      scannerWindow.webContents.openDevTools({ mode: "detach" });
    }
  });

  scannerWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  if (isDev) {
    scannerWindow.loadURL(`${devServerUrl}${scannerRoute}`);
  } else {
    scannerWindow.loadFile(path.join(__dirname, "../../../dist/index.html"), {
      hash: scannerRoute,
    });
  }

  return scannerWindow;
}

function configurePermissions() {
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = new Set(["media", "camera", "microphone"]);
    callback(allowedPermissions.has(permission));
  });

  session.defaultSession.setPermissionCheckHandler((_webContents, permission) => {
    const allowedPermissions = new Set(["media", "camera", "microphone"]);
    return allowedPermissions.has(permission);
  });
}

app.whenReady().then(() => {
  configurePermissions();
  createScannerWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createScannerWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
