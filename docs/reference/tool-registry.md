# 工具注册表规范（Tool Registry）

## 目标

工具注册表是工具入口、路由元信息和首页卡片的单一事实源。分类目录由 `src/data/tool-categories.ts` 单独维护，注册表与偏好 schema 都从该目录派生。

## 当前派生关系

- `src/app/tool-registry.ts`：维护工具元信息、路由路径、权限、排序、图标、懒加载组件、首页工具卡片数据和路由配置，并在加载时校验整体不变量。
- `src/data/tool-categories.ts`：维护分类标签、分类类型和首页筛选项。
- `src/app/router.ts`：消费 `tool-registry.ts` 导出的 `appRoutes`。
- `src/domains/home/page/HomePage.vue`：消费 `tools` 和 `toolCategories`，不再硬编码分类。

## 新工具接入清单

1. 在 `src/app/tool-registry.ts` 增加一条 `ToolRegistryEntry`。
2. 确认 `id`、`path`、`routeName` 唯一。
3. 为页面组件提供懒加载 `component`。
4. 若需要新分类，只扩展 `src/data/tool-categories.ts`。
5. 运行 `npm run quality` 验证路由、类型、测试和架构约束。

## 约束

- 工具卡片展示字段、路由元信息和权限字段不得分散复制。
- 工具页面必须通过懒加载进入注册表，避免首页直接加载非首屏页面。
- `tools` 数据仍需通过运行时 schema 校验，保持配置失败可见。
- `id`、`path`、`routeName`、`order` 必须唯一；路径必须以 `/` 开头，注册工具必须为可访问的 `ready` 状态。
