"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    getVersion: () => electron_1.ipcRenderer.invoke('get-version'),
    onUpdateAvailable: (callback) => {
        electron_1.ipcRenderer.on('update-available', (_event, info) => callback(info));
    },
    onUpdateDownloaded: (callback) => {
        electron_1.ipcRenderer.on('update-downloaded', () => callback());
    },
    quitAndInstall: () => electron_1.ipcRenderer.invoke('quit-and-install'),
});
