"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const updater_1 = require("./updater");
const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');
const VITE_DEV_URL = 'http://localhost:8001';
let mainWindow = null;
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1280,
        height: 860,
        minWidth: 800,
        minHeight: 600,
        title: '工资计算器',
        icon: path_1.default.join(__dirname, '../public/icons.svg'),
        webPreferences: {
            preload: path_1.default.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });
    // 外部链接用默认浏览器打开
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('https:') || url.startsWith('http:')) {
            electron_1.shell.openExternal(url);
        }
        return { action: 'deny' };
    });
    if (isDev) {
        mainWindow.loadURL(VITE_DEV_URL);
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
    else {
        const distPath = path_1.default.join(__dirname, '../dist/index.html');
        mainWindow.loadFile(distPath);
    }
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}
// 菜单栏
const menuTemplate = [
    {
        label: '工资计算器',
        submenu: [
            { role: 'about' },
            { type: 'separator' },
            { role: 'quit' },
        ],
    },
    {
        label: '编辑',
        submenu: [
            { role: 'undo' },
            { role: 'redo' },
            { type: 'separator' },
            { role: 'cut' },
            { role: 'copy' },
            { role: 'paste' },
            { role: 'selectAll' },
        ],
    },
    {
        label: '视图',
        submenu: [
            { role: 'reload' },
            { role: 'forceReload' },
            { role: 'toggleDevTools' },
            { type: 'separator' },
            { role: 'resetZoom' },
            { role: 'zoomIn' },
            { role: 'zoomOut' },
            { type: 'separator' },
            { role: 'togglefullscreen' },
        ],
    },
];
// macOS 适配
if (process.platform === 'darwin') {
    menuTemplate.unshift({
        label: electron_1.app.getName(),
        submenu: [
            { role: 'about' },
            { type: 'separator' },
            { role: 'services' },
            { type: 'separator' },
            { role: 'hide' },
            { role: 'hideOthers' },
            { role: 'unhide' },
            { type: 'separator' },
            { role: 'quit' },
        ],
    });
}
electron_1.app.whenReady().then(() => {
    electron_1.Menu.setApplicationMenu(electron_1.Menu.buildFromTemplate(menuTemplate));
    createWindow();
    // 非开发模式下检查更新
    if (!isDev) {
        (0, updater_1.setupUpdater)(mainWindow);
    }
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
