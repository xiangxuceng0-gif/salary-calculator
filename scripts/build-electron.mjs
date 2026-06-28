/**
 * Electron 构建脚本
 * 1. Vite build → dist/
 * 2. 编译 electron/*.ts → electron/*.js
 * 3. electron-builder 打包 → dist-electron/
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
process.chdir(ROOT);

const platform = process.argv.includes('--win') ? 'win'
  : process.argv.includes('--mac') ? 'mac'
  : process.argv.includes('--linux') ? 'linux'
  : process.platform === 'win32' ? 'win'
  : process.platform === 'darwin' ? 'mac'
  : 'linux';

console.log(`[build-electron] 目标平台: ${platform}`);

// Step 1: Vite build
console.log('[build-electron] Step 1/3: Vite 构建...');
execSync('npx vite build --base=./', { stdio: 'inherit' });

// Step 2: 编译 Electron TypeScript
console.log('[build-electron] Step 2/3: 编译 Electron...');
const tsconfigPath = path.join(ROOT, 'tsconfig.electron.json');
fs.writeFileSync(tsconfigPath, JSON.stringify({
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
}, null, 2));
execSync('npx tsc -p tsconfig.electron.json', { stdio: 'inherit' });
fs.unlinkSync(tsconfigPath);

// Step 3: electron-builder
console.log(`[build-electron] Step 3/3: electron-builder (${platform})...`);
execSync(`npx electron-builder --${platform} --config electron-builder.yml`, { stdio: 'inherit' });

console.log('[build-electron] 构建完成!');
console.log(`[build-electron] 输出目录: ${path.join(ROOT, 'dist-electron')}`);
