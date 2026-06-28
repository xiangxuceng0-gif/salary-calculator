interface ElectronAPI {
  getVersion: () => Promise<string>;
  onUpdateAvailable: (callback: (info: { version: string }) => void) => void;
  onUpdateDownloaded: (callback: () => void) => void;
  quitAndInstall: () => Promise<void>;
}

interface Window {
  electronAPI?: ElectronAPI;
}
