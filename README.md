# Sopronwitta

个人小工具集合站（SPA），基于 `Vue 3 + TypeScript + Vite`，面向静态部署（GitHub Pages）。

## 快速开始

```bash
npm install
npm run dev
```

构建：

```bash
npm run build
```

## 技术栈

- Vue 3
- TypeScript
- Vite
- Vue Router（`createWebHashHistory`）
- Tailwind CSS
- zod

## 当前模块

- 首页工具导航（搜索 / 分类）
- 提示词模板页（搜索 / 复制）
- 常用链接页（分组展示）
- 2048 Mini
- Memory Match
- 诸神皇冠培养模拟器（含 Worker + WASM）

## 文档体系（统一入口）

项目文档统一收敛在 `docs/`，唯一入口：  
[docs/README.md](./docs/README.md)

## 目录结构

```text
src/
  app/                # 路由与 route-meta
  domains/            # 业务域（页面与域内逻辑）
  shared/             # 跨域共享门面
  cheats/             # 作弊码能力
  config/             # 运行时配置
  data/               # 配置数据与 schema
  shared/style/       # tokens + components
  types/              # 类型定义
docs/                 # 项目规范与契约文档
public/wasm/          # wasm 发布产物
wasm/zhushen-core/    # wasm Rust 源码
```

## 部署说明（GitHub Pages）

- 仓库名：`topocket.github.io`
- Pages Source：`GitHub Actions`
- 工作流：`.github/workflows/deploy.yml`

## 临时优化路线（暂存）

- 本区仅用于记录“当前轮次”的临时优化计划与待办。
- 阶段完成后请将内容迁移到：`docs/archive/completed-work-archive.md`。
