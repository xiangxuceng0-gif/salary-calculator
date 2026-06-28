import { autoUpdater } from 'electron-updater';
import { BrowserWindow } from 'electron';

export function setupUpdater(mainWindow: BrowserWindow) {
  // 配置 GitHub Releases 更新源
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  // 发现新版本
  autoUpdater.on('update-available', (info) => {
    mainWindow.webContents.send('update-available', { version: info.version });
    console.log(`[updater] 发现新版本 v${info.version}`);
  });

  // 无更新
  autoUpdater.on('update-not-available', () => {
    console.log('[updater] 当前已是最新版本');
  });

  // 下载进度（可选）
  autoUpdater.on('download-progress', (progress) => {
    console.log(`[updater] 下载进度: ${Math.round(progress.percent)}%`);
  });

  // 更新已下载
  autoUpdater.on('update-downloaded', () => {
    mainWindow.webContents.send('update-downloaded');
    console.log('[updater] 更新已下载，下次启动时安装');
  });

  // 错误处理
  autoUpdater.on('error', (err) => {
    console.error('[updater] 检查更新出错:', err.message);
  });

  // 启动后 5 秒检查更新
  setTimeout(() => {
    autoUpdater.checkForUpdatesAndNotify().catch((err) => {
      console.error('[updater] 检查更新失败:', err.message);
    });
  }, 5000);
}
