# Sopronwitta

个人小工具集合网站，基于静态部署，包含工具导航、搜索筛选、提示词模板和常用链接分组页面。

## 技术栈

- Vite
- Vue 3 + TypeScript
- Tailwind CSS
- Vue Router（`createWebHashHistory`）
- GitHub Pages（GitHub Actions 自动部署）

## 当前功能

- 首页工具导航面板
- 工具搜索（名称/描述/标签）
- 工具分类筛选
- Prompts 页面：模板搜索 + 一键复制
- Links 页面分组展示与一键打开
- 2048 Mini（方向键/WASD，支持本地进度保存）
- 路由元数据配置化（标题自动更新）
- 数据 schema 运行时校验（tools/links/prompts）
- 前端本地数据管理体系（单一存储入口 + 版本化 + 迁移）

## 本地开发

```bash
npm install
npm run dev
```

默认访问：`http://127.0.0.1:4173`（或 Vite 输出端口）。

## 构建

```bash
npm run build
```

构建产物目录：`dist/`

## GitHub Pages 发布

本项目为用户主页站点模式，目标域名：

- `https://topocket.github.io/`

要求：

1. 仓库名必须为 `topocket.github.io`
2. Pages Source 选择 `GitHub Actions`
3. 工作流文件使用 `.github/workflows/deploy.yml`

## 目录结构

```text
src/
  app/                # 路由与 route-meta
  components/         # 通用组件
  composables/        # 通用逻辑（prefs/blob motion）
  data/               # 配置数据（tools/links/prompts + schemas）
  pages/              # 页面（Home/Prompts/Links）
  storage/            # localStorage 基础层（prefix/key/record adapter）
  stores/             # 按域分层 store（prefs/game2048/links）
  styles/             # 样式分层（tokens/components）
  types/              # TS 类型定义
```

## 前端-only 数据管理规范

### 1) 单一存储入口

所有本地持久化必须通过：

- `src/storage/engine.ts`
- `src/storage/record.ts`
- `src/stores/*`

禁止在页面/组件里直接调用 `localStorage.setItem/getItem`。

### 2) 命名空间 + 版本化

统一前缀：`sopronwitta:`

当前 key：

- `sopronwitta:prefs:v1`
- `sopronwitta:tool:2048:v1`
- `sopronwitta:links:v1`

### 3) Schema 校验

每条记录读取时必须先过 zod 校验，校验失败回退默认值，保证运行时稳定。

### 4) Store 分层

按业务域拆分 store，不按页面拆分。每个 store 必须暴露：

- `load`
- `save`
- `reset`
- `migrate`

### 5) 数据迁移

新版本通过 `migrate(vN -> vN+1)` 迁移，不直接覆盖旧结构。

### 6) 写入策略

高频状态（如 2048 棋盘）默认使用节流写入（当前 300ms），并在页面卸载前强制保存一次。

### 7) 作弊功能策略

- 统一通过通用引擎 `src/cheats/useCheatCode.ts` 监听和触发
- 统一通过 `CheatRuntime` 管理本局作弊状态
- 默认不持久化（仅本局生效）；若需要持久化，必须显式声明 `persistCheats: true`

### 8) Contract 文档

新增/修改本地存储记录时，必须同步更新：

- `storage-contract.md`
