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
- 路由元数据配置化（标题自动更新）
- 数据 schema 运行时校验（tools/links/prompts）
- 统一偏好入口（筛选状态、最近使用、主题模式）

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
  styles/             # 样式分层（tokens/components）
  types/              # TS 类型定义
```
