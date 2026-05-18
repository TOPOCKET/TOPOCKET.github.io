---
apply: 始终
---

## 1. 项目目标
- 构建个人小工具集合站（SPA），首页为工具导航面板。
- 每个工具独立模块化（计算器、小游戏、提示词库、链接页）。
- 以配置驱动扩展内容，避免页面写死。

## 2. 技术栈与部署
- 前端：`Vite + Vue 3 + TypeScript`
- UI：`Tailwind CSS`
- 状态：优先 Vue 组合式 API（`ref/reactive/computed`），复杂后引入 `Pinia`
- 部署：`GitHub Pages + GitHub Actions`
- 路由：必须使用 `Vue Router + createWebHashHistory()`
- Pages 要求：
  - `vite.config.ts` 配置 `base: '/<repo-name>/'`
  - 自动部署 `dist/`，不手动提交构建产物

## 3. 目录与命名规范
```text
src/
  pages/               # Home / Tools / Prompts / Links
  tools/<tool-name>/   # 工具模块：视图 + 逻辑 + 配置
  data/                # tools/prompts/links 配置数据
  components/          # 通用组件
  composables/         # 通用逻辑（如 useLocalStorage）
  types/               # 类型定义
public/
  icons/
  assets/
```

- 组件：`PascalCase.vue`
- 组合式函数：`useXxx.ts`
- 工具目录：`kebab-case`

## 4. 数据驱动规则（强制）
- `tools` / `prompts` / `links` 必须配置化维护。
- 新增内容优先改数据文件，不优先改页面结构代码。

建议字段：
- `tools`：名称、分类、路由、描述、标签
- `prompts`：标题、用途、变量占位符
- `links`：站点名、URL、分类、常用标记

## 5. 功能开发优先级
1. 首页工具卡片 + 搜索/分类
2. 2~3 个核心工具跑通闭环
3. 提示词模板（含复制）
4. 常用链接（分组 + 收藏）
5. 本地持久化（最近使用/收藏/筛选状态）

## 6. 工程与提交流程
- 类型优先，公共结构统一放 `src/types/`
- `tools/` 内模块低耦合，不直接依赖其他工具内部实现
- 每个工具至少拆为“视图层 + 逻辑层”
- 禁止提交 `.env*`、密钥、token、私钥文件

提交建议：
- `feat: ...` 新功能
- `fix: ...` 修复
- `refactor: ...` 重构
- `chore: ...` 配置/维护

合并前最少检查：
- `npm run build` 成功
- 关键页面无白屏、无控制台报错
- `base` 与仓库名一致

## 7. 视觉总则（Raycast 方向）
- 整体风格：Raycast 导向（命令中心感、高信息密度、可扫描）
- 主题模式：默认跟随系统/浏览器（`prefers-color-scheme`）
- 必须同时维护浅色/深色 token，禁止组件硬编码主题色
- 深色优先，浅色为弱玻璃降级

## 8. 半透明 + 毛玻璃（核心约束）
- 本项目对“半透明+毛玻璃”的定义：
  - **透明层 + 柔化模糊 + 细边框 + 轻阴影**
- 小组件（tags、按钮、链接卡片等）优先：
  - `background: transparent`
  - `backdrop-filter: blur(...) saturate(...)`
  - 通过边框/文字对比建立可读性

禁止项：
- 禁止使用 `color-mix(...)` 作为玻璃主实现
- 禁止通过“实体背景填充色块”伪造玻璃效果

## 9. 动效与分层规范
- 动效目标：连续、克制、可读
- 交互状态必须完整：hover / focus / active / disabled
- 键盘可访问性必须清晰（`focus-visible`）
- 选中态（active/selected）使用同色系提亮：边框亮度、内高光、不透明度提升；不引入彩色品牌边框。

玻璃动效层规则：
- 背景动效层：`z-index: 0`
- 内容层：`z-index: 1`
- 使用 `:not(.raycast-blob-layer)` 提升内容层，避免覆盖背景层定位

## 10. 光斑系统（强制抽象）
- 统一复用：
  - `BlobLayer.vue`：渲染层
  - `useBlobMotion.ts`：参数生成（`createTintVars`、`createBlobVars`）
- 禁止在页面里重复手写光斑 DOM 与随机逻辑

参数策略：
- 卡片动效参数由特征值（如 `id + name`）哈希生成
- 分组容器（如 command-panel、links-group）使用独立 seed

轨迹策略：
- 使用分段闭环轨迹（`0% -> 34% -> 68% -> 100%`）
- 禁止单一直线往返
- 时长建议 `11s~21s`，并使用负延迟错峰，避免全体同步

容器适配：
- `fitContainer=true`：轨迹限制在容器内（任意尺寸容器）
- `fitContainer=false`：允许外扩漂移（卡片等场景）

## 11. 布局规范（Dashboard）
- 首页结构：顶部命令区 + 中部功能区 + 底部辅助区（按需）
- 搜索入口必须是首屏高优先级元素
- 网格使用固定轨道与明确 gap，避免布局抖动
- 避免营销式大横幅与过度留白

## 12. 一致性底线
- 同类组件共享一套圆角、边框、模糊、阴影 token
- 新页面必须复用现有语义类与组件，不允许单页自创一套视觉语言
- 动效不得降低文本可读性；优先降透明度/提模糊，而非提高闪动强度
