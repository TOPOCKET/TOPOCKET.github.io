# Sopronwitta

个人小工具集合站（SPA），基于 `Vue 3 + TypeScript + Vite`，面向静态部署（GitHub Pages），当前聚焦实用工具、提示词与链接导航。

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
- 轻量运行时数据校验

## 当前模块

- 首页工具导航（搜索 / 分类）
- 提示词模板页（搜索 / 复制）
- 常用链接页（分组展示）

## 文档体系（统一入口）

项目文档统一收敛在 `docs/`，唯一入口：  
[docs/README.md](./docs/README.md)

## 目录结构

```text
src/
  app/                # 工具注册表与路由派生
  domains/            # 业务域（页面与域内逻辑）
  shared/             # 跨域共享门面
  config/             # 运行时配置
  data/               # 配置数据与 schema
  shared/style/       # tokens + components
  types/              # 类型定义
docs/                 # 项目规范与契约文档
```

## 部署说明（GitHub Pages）

- 仓库名：`topocket.github.io`
- Pages Source：`GitHub Actions`
- 工作流：`.github/workflows/deploy.yml`

## 维护说明

- 新增工具优先修改 `src/app/tool-registry.ts`。
- 路由、首页工具卡片与分类筛选由注册表派生。
