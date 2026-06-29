# 数据与工具持久化规范（Storage）

本规范覆盖浏览器端持久化的 key、schema、写入策略、迁移策略与接入流程。  
总原则仍以 [../vibeCodingCopy.md](../vibeCodingCopy.md) 为准。

## 约束边界

- 持久化必须统一通过 `src/shared/persistence/*` 与各域 `services/*` store。
- 禁止在页面/组件直接调用 `localStorage.setItem/getItem`。
- 默认通过 zod 对读写记录做 schema 校验。

## 命名空间

- 前缀：`sopronwitta:`
- Key 模式：`<domain>:v<version>` 或 `tool:<tool-id>:v<version>`

## 已登记记录

### 1) 应用偏好（App Preferences）

- Key：`sopronwitta:prefs:v1`
- Store：`src/domains/home/services/prefs-store.ts`
- Schema：`prefsSchema`
- 默认值：
  - `themeMode: "system"`
  - `homeKeyword: ""`
  - `homeCategory: "all"`
  - `recentTools: []`
- 迁移：
  - 读取旧 key `sopronwitta:prefs`
  - 校验通过后回写 `v1`

### 2) 常用链接数据（Links Data）

- Key：`sopronwitta:links:v1`
- Store：`src/domains/links/services/links-store.ts`
- Schema：`quickLinkListSchema`
- 默认值：`src/data/links.ts` 的 `defaultQuickLinks`

### 3) 诸神自定义数据（Zhushen Custom Data）

- Key：`sopronwitta:tool:zhushen:custom:v1`
- Store：`src/domains/zhushen/services/zhushen-custom-store.ts`
- Schema：`zhushenCustomSchema`
- 默认值：`jobs/equips/skills/traits` 空数组

## 新工具接入清单

1. 在 `src/shared/persistence/keys.ts` 定义 key。
2. 定义 zod schema。
3. 实现 store 的 `load/save/reset`。
4. 若有旧版本，明确迁移路径。
5. 高频状态加节流策略。
6. 在本文档登记记录。
