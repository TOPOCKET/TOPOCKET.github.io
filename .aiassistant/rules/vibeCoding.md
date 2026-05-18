---
apply: 始终
---

## 1. 总体形态
- 单页应用（SPA）+ 路由分区。
- 首页为「工具导航面板」。
- 每个工具独立模块化（计算器、小游戏、提示词库、链接页）。

## 2. 技术栈
- `Vite + Vue 3 + TypeScript`
- UI：`Tailwind CSS`（保持风格一致、开发效率优先）。
- 状态管理：先用 Vue 组合式 API（`ref/reactive/computed`），复杂后引入 `Pinia`。
- 部署：`GitHub Pages`（`GitHub Actions` 自动构建发布）。

## 3. 目录约定
```text
src/
  pages/               # 页面级：Home / Tools / Prompts / Links
  tools/<tool-name>/   # 单工具模块：组件 + 逻辑 + 配置
  data/                # 配置数据：tools/prompts/links
  components/          # 通用组件：卡片、搜索、筛选、复制按钮等
  composables/         # 通用组合式逻辑：如 useLocalStorage
public/
  icons/               # 图标
  assets/              # 小游戏素材、静态资源
```

## 4. 数据驱动规则（关键）
“工具、提示词、链接”必须配置化，不写死在页面模板中。

- `tools.json`：名称、分类、路由、描述、标签。
- `prompts.json`：模板标题、用途、变量占位符。
- `links.json`：站点名、URL、分类、是否常用。

目标：新增内容优先改数据文件，而不是改页面结构代码。

## 5. 功能开发优先级
1. 首页工具卡片 + 搜索/分类。
2. 2~3 个核心工具（先跑通完整模式）。
3. 提示词模板（带复制按钮）。
4. 常用链接（分组 + 收藏）。
5. 本地持久化（`localStorage`：最近使用、收藏、筛选状态）。

## 6. GitHub Pages 约束
- `vite.config.ts` 必须配置：
   - `base: '/<repo-name>/'`
- 路由必须使用 `Vue Router + createWebHashHistory()`，避免刷新 404。
- 通过 Actions 自动部署 `dist/`，不手动提交构建产物。

## 7. 工程规范（新增）
- 组件命名：`PascalCase.vue`；组合式函数：`useXxx.ts`；工具目录：`kebab-case`。
- 类型优先：公共数据结构统一放在 `src/types/`。
- 低耦合：`tools/` 内逻辑不直接依赖其他工具模块。
- 可维护性：每个工具至少拆分为「视图层 + 逻辑层」两层。
- 安全性：禁止提交 `.env*`、密钥、token、私钥文件。

## 8. 提交与发布规范（新增）
- 提交信息建议：
   - `feat: ...` 新功能
   - `fix: ...` 修复
   - `refactor: ...` 重构
   - `chore: ...` 配置/工程维护
- 合并前至少自检：
   - 本地 `npm run build` 成功
   - 关键页面无白屏、无控制台报错
   - `base` 与仓库名一致
