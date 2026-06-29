# 记财 (JiCai) — 工资计算器

跨平台桌面应用，支持 Windows、macOS、Linux。记好每一笔。

## 下载安装

### Windows
1. 下载 `JiCai-Setup-x.x.x.exe`
2. 双击运行，如果出现 **"Windows 已保护你的电脑"** 提示：
   - 点击 **「更多信息」**
   - 点击 **「仍要运行」**
   - 这是因为我暂未购买代码签名证书（~$200/年），软件本身安全无毒
3. 选择安装目录，完成安装
4. 桌面会出现「记财」快捷方式

### macOS
1. 下载 `JiCai-x.x.x.dmg`
2. 双击挂载，拖入 Applications 文件夹
3. 首次打开如提示"无法验证开发者"：
   - 打开 **系统设置 → 隐私与安全性**
   - 找到「记财」，点击 **「仍要打开」**

### Linux
1. 下载 `JiCai-x.x.x.AppImage`
2. `chmod +x JiCai-*.AppImage && ./JiCai-*.AppImage`

## 自动更新

应用启动后会自动检查 GitHub Releases 是否有新版本，发现后后台下载，下次启动自动安装。

## 技术栈

- React 19 + TypeScript + Tailwind CSS v4
- Vite 8 + shadcn/ui (Radix UI)
- Electron + electron-builder + electron-updater
- 数据本地存储 (localStorage)

## 开发

```bash
npm install
npm run dev          # 启动 Web 开发服务器 → http://localhost:8001
npm run dev:electron # 启动 Electron 开发模式
npm run build:electron:win   # 构建 Windows 安装包
npm run build:electron:mac   # 构建 macOS 安装包
```

## 发布流程

```bash
git tag -a v0.x.0 -m "版本说明"
git push --tags
# GitHub Actions 自动构建三平台并发布 Release
```
