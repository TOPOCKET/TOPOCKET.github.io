# 存储契约（Storage Contract）

所有浏览器端持久化必须统一通过 `src/storage/*` 与 `src/stores/*`。
禁止在页面/组件中直接调用 `localStorage.setItem/getItem`。

## 命名空间

- 前缀：`sopronwitta:`
- Key 模式：`<domain>:v<version>` 或 `tool:<tool-id>:v<version>`

## 记录定义

### 1) 应用偏好（App Preferences）

- Key：`sopronwitta:prefs:v1`
- Store：`src/stores/prefsStore.ts`
- Schema：`prefsSchema`（zod）
- 默认值：
  - `themeMode: "system"`
  - `homeKeyword: ""`
  - `homeCategory: "all"`
  - `recentTools: []`
- 迁移策略：
  - 尝试读取旧 key `sopronwitta:prefs`
  - 使用 `prefsSchema` 校验通过后写入 `v1`

### 2) 2048 状态（2048 State）

- Key：`sopronwitta:tool:2048:v1`
- Store：`src/stores/game2048Store.ts`
- Schema：`game2048Schema`（zod）
- 默认值：
  - `board: 4x4 全 0`
  - `score: 0`
  - `best: 0`
  - `won: false`
  - `gameOver: false`
- 写入策略：
  - 高频更新采用节流写入（默认 `300ms`）
  - 页面卸载前强制保存一次
- 迁移策略：
  - 当前无预置空迁移函数；发生真实结构演进时再增加迁移

### 3) 常用链接数据（Links Data）

- Key：`sopronwitta:links:v1`
- Store：`src/stores/linksStore.ts`
- Schema：`quickLinkListSchema`（zod）
- 默认值：
  - 来自 `src/data/links.ts` 的 `defaultQuickLinks`
- 迁移策略：
  - 当前无预置空迁移函数；发生真实结构演进时再增加迁移

### 4) 诸神自定义数据（Zhushen Custom Data）

- Key：`sopronwitta:tool:zhushen:custom:v1`
- Store：`src/stores/zhushenCustomStore.ts`
- Schema：`zhushenCustomSchema`（zod）
- 默认值：
  - `jobs: []`
  - `equips: []`
  - `skills: []`
  - `traits: []`
- 迁移策略：
  - 当前无预置空迁移函数；发生真实结构演进时再增加迁移

## 新工具接入检查清单

1. 在 `src/storage/keys.ts` 定义新 key
2. 在 store 内（或共享 schema 模块）定义 zod schema
3. 实现 store 的 `load/save/reset`
4. 若存在旧版本数据，补充明确迁移路径
5. 高频状态必须使用节流写入策略
6. 在本文档登记该记录定义
