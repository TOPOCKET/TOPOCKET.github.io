# 工具注册表规范（Tool Registry）

## 目标

工具注册表是工具入口、路由元信息、首页卡片和分类筛选的单一事实源。新增或调整工具时，优先修改 `src/app/tool-registry.ts`，避免在首页、路由和数据文件中重复维护同一组字段。

## 当前派生关系

- `src/app/tool-registry.ts`：维护工具元信息、路由路径、权限、排序、图标、懒加载组件和分类选项。
- `src/app/route-meta.ts`：从 `toolRegistry` 派生工具路由，并保留首页路由。
- `src/data/tools.ts`：从 `toolRegistry` 派生首页工具卡片数据。
- `src/domains/home/page/HomePage.vue`：消费 `tools` 和 `toolCategories`，不再硬编码分类。

## 新工具接入清单

1. 在 `src/app/tool-registry.ts` 增加一条 `ToolRegistryEntry`。
2. 确认 `id`、`path`、`routeName` 唯一。
3. 为页面组件提供懒加载 `component`。
4. 若需要新分类，先扩展 `ToolCategory`、schema 和 `toolCategories`。
5. 运行 `npm run build` 验证路由、类型和配置校验。

## 约束

- 工具卡片展示字段、路由元信息和权限字段不得分散复制。
- 工具页面必须通过懒加载进入注册表，避免首页直接加载重工具页面。
- `tools` 数据仍需通过 zod 校验，保持运行时配置失败可见。
