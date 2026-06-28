"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupUpdater = setupUpdater;
const electron_updater_1 = require("electron-updater");
function setupUpdater(mainWindow) {
    // 配置 GitHub Releases 更新源
    electron_updater_1.autoUpdater.autoDownload = true;
    electron_updater_1.autoUpdater.autoInstallOnAppQuit = true;
    // 发现新版本
    electron_updater_1.autoUpdater.on('update-available', (info) => {
        mainWindow.webContents.send('update-available', { version: info.version });
        console.log(`[updater] 发现新版本 v${info.version}`);
    });
    // 无更新
    electron_updater_1.autoUpdater.on('update-not-available', () => {
        console.log('[updater] 当前已是最新版本');
    });
    // 下载进度（可选）
    electron_updater_1.autoUpdater.on('download-progress', (progress) => {
        console.log(`[updater] 下载进度: ${Math.round(progress.percent)}%`);
    });
    // 更新已下载
    electron_updater_1.autoUpdater.on('update-downloaded', () => {
        mainWindow.webContents.send('update-downloaded');
        console.log('[updater] 更新已下载，下次启动时安装');
    });
    // 错误处理
    electron_updater_1.autoUpdater.on('error', (err) => {
        console.error('[updater] 检查更新出错:', err.message);
    });
    // 启动后 5 秒检查更新
    setTimeout(() => {
        electron_updater_1.autoUpdater.checkForUpdatesAndNotify().catch((err) => {
            console.error('[updater] 检查更新失败:', err.message);
        });
    }, 5000);
}
