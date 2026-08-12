const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("naysaElectron", {
  platform: process.platform,
  isElectron: true,
});
