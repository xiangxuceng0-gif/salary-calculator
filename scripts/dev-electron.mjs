/**
 * Electron 开发启动器
 * 1. 编译 electron/*.ts → electron/*.js
 * 2. 等待 Vite dev server 就绪
 * 3. 启动 Electron（开发模式）
 */
import { spawn, execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
process.chdir(ROOT);

const VITE_PORT = process.env.CLIENT_DEV_PORT || '8001';

console.log('[dev-electron] 编译 Electron TypeScript...');
const tsconfig = {
  compilerOptions: {
    target: 'ES2023',
    module: 'commonjs',
    moduleResolution: 'node',
    esModuleInterop: true,
    skipLibCheck: true,
    strict: false,
    noEmit: false,
  },
  include: ['electron/main.ts', 'electron/preload.ts', 'electron/updater.ts'],
};
const tsconfigPath = path.join(ROOT, 'tsconfig.electron.json');
fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));
execSync('npx tsc -p tsconfig.electron.json', { stdio: 'inherit' });
fs.unlinkSync(tsconfigPath);

console.log(`[dev-electron] 等待 Vite (http://localhost:${VITE_PORT})...`);

// 轮询等待 Vite 就绪
async function waitForVite() {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://localhost:${VITE_PORT}/`);
      if (res.ok) {
        console.log('[dev-electron] Vite 已就绪，启动 Electron...');
        return true;
      }
    } catch {}
    await new Promise(r => setTimeout(r, 1000));
  }
  console.error('[dev-electron] 等待 Vite 超时');
  return false;
}

waitForVite().then((ready) => {
  if (!ready) process.exit(1);

  const electron = spawn('npx', ['electron', 'electron/main.js'], {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'development' },
  });

  electron.on('exit', (code) => process.exit(code || 0));
});
