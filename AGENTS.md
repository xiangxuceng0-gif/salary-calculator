# 工资计算器 - 需求拆解文档

## 产品概述

- **产品类型**: 工具类应用
- **场景类型**: <scene_type>prototype-app</scene_type>
- **目标用户**: 需要记录工时、计算工资的上班族/自由职业者
- **核心价值**: 根据上班时间自动计算工资，支持固定工资与加班工资汇总，数据本地持久化
- **界面语言**: 中文
- **主题偏好**: 浅色（温和不刺眼）
- **导航模式**: 无导航（单页工具）

---

## 页面结构总览

> **说明**：单页工具，所有功能在一个页面内完成

**页面文件**: `SalaryCalculatorPage.tsx`

| 区域 | 说明 |
|-----|------|
| 工资设置区 | 设置月薪/日薪/时薪标准，加班倍率配置 |
| 工时记录区 | 记录每日上下班时间，列表展示历史记录 |
| 工资汇总区 | 展示固定工资、正常工时工资、加班工资、总工资 |

---

## 页面布局建议

- **布局模式**: 上下分区（移动端）/ 三栏左右分栏（桌面端）—— 设置、记录、汇总三个区域逻辑独立但数据联动，桌面端三栏并列方便对照查看
- **视觉重心**: 工资汇总区 —— 用户最终关心的是计算结果，汇总区应视觉突出（大字号金额、卡片高亮）
- **结果承载区**: 工资汇总卡片（固定工资、正常工时工资、加班工资、总工资四项）；初始态显示默认值或“--”，有记录后实时更新

---

## 数据来源声明

| 数据/操作 | 来源类型 | 实现要求 | mock 兜底 |
|---|---|---|---|
| 工资设置（月薪/日薪/时薪、加班倍率） | local-persist | localStorage key=`__salary_calculator_settings`，页面加载时读取，修改后自动保存 | 初始默认值：月薪 0，加班倍率 1.5x/2x/3x |
| 上班时间记录列表 | local-persist | localStorage key=`__salary_calculator_records`，增删改后自动同步 | 初始空数组 `[]` |
| 工资汇总计算 | demo-mock | 前端纯计算：根据设置 + 记录实时算出各项工资 | ✅ 本身就是计算逻辑，无需 mock |

---

## 功能列表

- **页面**: 工资计算器主页
  - **页面目标**: 一站式完成工资设置、工时记录、工资汇总查看
  - **功能点**:
    - **工资标准设置**: 提供月薪/日薪/时薪三种输入方式，输入任一后自动换算其他两项（按标准工时 8h/天、21.75 天/月换算）；设置后自动保存到 localStorage
    - **加班倍率设置**: 支持配置多档加班倍率（默认 1.5x、2x、3x），可增删倍率档位；设置后自动保存
    - **添加上班记录**: 表单输入日期、上班时间、下班时间，自动计算当日工时；若当日工时超过标准 8 小时，超出部分按当前选中的加班倍率计算加班工时
    - **工时记录列表**: 展示历史上班记录（日期、上班时间、下班时间、正常工时、加班工时），支持删除单条记录；数据实时从 localStorage 读取
    - **工资汇总展示**: 实时计算并展示四项汇总——固定工资（月薪）、正常工时工资（正常工时 × 时薪）、加班工资（加班工时 × 时薪 × 倍率）、总工资（前三项之和）；金额大字号突出显示
    - **数据重置**: 提供一键清除所有记录和设置的功能（需二次确认），重置后恢复默认状态

---

## 数据存储配置

| 存储键名 | 数据说明 | 使用页面 |
|---------|---------|---------|
| `__salary_calculator_settings` | 工资设置，类型 `ISalarySettings` | 工资计算器主页 |
| `__salary_calculator_records` | 上班记录列表，类型 `IWorkRecord[]` | 工资计算器主页 |

```ts
interface ISalarySettings {
  /** 月薪（元） */
  monthlySalary: number;
  /** 日薪（元），自动换算 */
  dailySalary: number;
  /** 时薪（元），自动换算 */
  hourlySalary: number;
  /** 加班倍率列表，如 [1.5, 2, 3] */
  overtimeRates: number[];
  /** 当前选中的加班倍率索引 */
  activeOvertimeRateIndex: number;
}

interface IWorkRecord {
  /** 唯一标识 */
  id: string;
  /** 日期，格式 YYYY-MM-DD */
  date: string;
  /** 上班时间，格式 HH:mm */
  startTime: string;
  /** 下班时间，格式 HH:mm */
  endTime: string;
  /** 正常工时（小时），≤8 */
  normalHours: number;
  /** 加班工时（小时），>8 的部分 */
  overtimeHours: number;
  /** 使用的加班倍率 */
  overtimeRate: number;
}

-------

<scene_type>prototype-app</scene_type>

# UI 设计指南

## 1. 设计推导依据

- **参考意图**: Free Direction —— 无参考材料，从产品语义与使用场景自主建立视觉方向
- **核心情绪 / 应用类型**: 个人日常记账工具 —— 温和、可信、低压力，像一本随手可翻的纸质工资记录本
- **独特记忆点**: 暖米纸底 + 淡墨绿主色，模拟纸质账本的亲切感，数字工具里保留手工记账的温度

## 2. Art Direction

- **方向名**: 纸质账本
- **Design Style**: Warm Natural 自然暖调 + Muji 极简 —— 工资计算是个人财务管理行为，需要信任感和低视觉疲劳；暖纸底降低屏幕冰冷感，极简布局让数字一目了然
- **DNA 参数**: 圆角 subtle（`rounded-md`）/ 阴影 subtle（`shadow-sm`，模拟纸张轻微浮起）/ 间距 standard（`gap-4` `p-6`）/ 字体方向 人文主义无衬线 / 装饰手法 细线分隔、淡色块区分信息区
- **应用类型**: Tool —— 单页工具，信息分区清晰，操作路径短

## 3. Color System

**色彩关系**: 暖米白基底 + 淡墨绿主色 + 浅灰绿辅助底 + 深褐文字
**配色设计理由**: primary 墨绿用于主行动按钮、当前激活态和关键金额高亮，传递稳重与信任；bg 暖米白模拟纸张，降低长时间使用的屏幕疲劳；text 深褐保持高对比可读但不刺眼；accent 浅灰绿用于 hover 反馈和选中态，与 primary 同色系低权重
**主色推导**: 工资计算属于个人财务场景，需要冷静、可信但不冰冷的色彩；墨绿比金融蓝更温和，比纯灰更有识别度，适合日常记账工具的品牌锚点
**使用比例**: 60% 中性（暖米白底 + 浅灰绿卡片）/ 30% 辅助（淡绿反馈底 + 细线分隔）/ 10% primary（主按钮、金额高亮、激活态）

| 角色 | CSS 变量 | Tailwind Class | HSL 值 | 设计说明 |
|---|---|---|---|---|
| bg | `--background` | `bg-background` | hsl(40 30% 97%) | 暖米白页面背景，模拟纸张质感 |
| card | `--card` | `bg-card` | hsl(40 25% 99%) | 卡片、设置面板、汇总区，比 bg 更亮 |
| text | `--foreground` | `text-foreground` | hsl(25 20% 18%) | 标题和正文，深褐高对比 |
| textMuted | `--muted-foreground` | `text-muted-foreground` | hsl(25 10% 45%) | 占位符、标签说明、辅助信息 |
| primary | `--primary` | `bg-primary` / `text-primary` | hsl(160 25% 32%) | 主按钮、金额高亮、激活态，稳重墨绿 |
| primaryForeground | `--primary-foreground` | `text-primary-foreground` | hsl(40 30% 97%) | primary 上的文字，暖白保证可读 |
| accent | `--accent` | `bg-accent` | hsl(155 15% 92%) | hover/focus 浅底、选中行、Skeleton |
| accentForeground | `--accent-foreground` | `text-accent-foreground` | hsl(160 20% 28%) | accent 上的文字和图标 |
| border | `--border` | `border-border` | hsl(30 12% 85%) | 输入框、卡片、列表分隔线 |

**语义色提示**:
- 成功（加班费已计入）：bg `hsl(150 20% 92%)` / border `hsl(150 18% 78%)` / text `hsl(155 25% 28%)`，与 primary 同色系低饱和
- 警告（未设置基础工资）：bg `hsl(38 30% 93%)` / border `hsl(38 25% 80%)` / text `hsl(35 30% 30%)`，暖黄调与暖米白基底协调
- 错误（时间冲突）：bg `hsl(8 25% 94%)` / border `hsl(8 20% 82%)` / text `hsl(6 28% 32%)`，低饱和暖红，不刺眼

## 4. 字体与节奏

- **font-display**: Noto Sans SC —— 中文工资记录需要清晰可读，人文主义气质匹配纸质账本方向
- **font-body**: Noto Sans SC —— 与 display 统一，数字和中文混排时保持节奏一致
- **字号**: H1 text-2xl（页面标题）；H2 text-lg（区块标题）；body text-base；muted text-sm
- **圆角**: subtle（`rounded-md`）—— 轻微圆角保留纸张的柔和感，不圆润到卡通化

## 5. 全局布局契约

- **Reference Layout Use**: 按需求结构推导 —— 单页工具，自上而下：设置区 → 记录区 → 汇总区
- **Page / Section Order**: 基础工资设置 → 加班倍率设置 → 上下班时间记录 → 工资汇总卡片
- **Standard Content Zone**: `max-w-2xl mx-auto`，工具型应用信息密度适中，单列布局保证操作路径清晰
- **Shell / Frame Alignment**: 无 chrome 框架，内容区独立居中
- **Padding & Rhythm**: `px-4 md:px-6 py-6 md:py-8`，区块间距 `gap-6`
- **Full-bleed Zones**: 无全宽区域，所有内容受 Standard Content Zone 约束
- **Local Narrowing**: 设置表单内输入框组可在卡片内自然收窄，汇总卡片内金额数字可加大字号突出
- **Overflow Strategy**: 时间记录列表若条目过多使用 `overflow-y-auto` 限定最大高度，不撑开全局布局
- **Flexibility Boundary**: 允许移动端调整卡片内边距和汇总区数字字号；max-w-2xl、圆角系统、主色不变

## 6. 视觉与动效

- **装饰**: 细线分隔、淡色块分区
- **阴影/边界**: 轻（`shadow-sm`），卡片轻微浮起模拟纸张叠放
- **动效**: 克制 —— 金额数字变化使用 `transition-colors` 平滑过渡；新增记录卡片从上方淡入；hover 时 accent 底色 150ms 渐入

## 7. 组件原则

- 主按钮（保存设置、添加工时记录）使用 primary 实色填充，hover 加深 8% 明度
- 次级操作（删除记录、重置）使用 outline 样式，border 色与 textMuted 对齐
- 输入框 focus 时 border 切换为 primary，ring 使用 accent 色
- 汇总卡片内总工资金额使用 primary 色加大字号（text-3xl），作为页面视觉锚点
- 空状态（无工时记录）显示淡色插画占位 + textMuted 引导文案
- 加载与本地存储同步使用 Skeleton（accent 底色脉冲），不出现默认灰色骨架屏

## 8. Image Direction

- **Image Role**: 无强制图片需求，优先通过排版、色彩和局部图形建立视觉记忆点
- **Image Art Direction**: 如需空状态插画，可采用淡墨绿单色线稿风格，主题为简笔账本、时钟或计算器，保持与纸质账本方向一致的朴素手绘感
- **Image Prompt Keywords**: 无
- **Image Avoidance**: 避免通用 3D 插画、商务场景人物、无意义渐变抽象图

## 9. Anti-patterns

- **Split personality**: 设置区用圆角卡片、汇总区用直角表格；全站统一 rounded-md 和卡片容器
- **Phantom tokens**: 使用未定义的 CSS 变量如 `--success` 或 `--warning`；语义色通过 tailwind 自定义 class 或内联 HSL 实现
- **Default SaaS drift**: 回到默认蓝按钮或紫渐变；墨绿 primary 必须贯穿所有主行动和金额高亮
- **Invisible interaction**: 删除按钮只有 hover 变红，focus-visible 无 ring；每个可交互元素保留键盘可见状态
- **Mono-hue tyranny**: 墨绿同时用于按钮、边框、图标、链接和汇总数字；primary 只给主按钮和总工资金额，其余用 accent 和中性色
- **Status color drift**: 成功/警告/错误色饱和度过高，在暖米白底上刺眼；语义色饱和度与 primary 对齐，保持低饱和暖调