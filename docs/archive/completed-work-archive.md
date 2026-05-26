# 已完成任务归档（2026-05）

本文档归档截至 2026-05 已完成的优化路线与实施记录，避免 README 持续堆叠历史日志。

## 完成总览

- 路线 1：诸神模拟器核心拆层（`completed`）
- 路线 3：Store 契约统一（`completed`）
- 路线 4：测试基线补齐（`completed`）
- 路线 6：全仓 Domain-First 架构重构（`completed`）
- 架构升级计划 P1-P5（`completed`，详见 `docs/archive/architecture-upgrade-plan-archive.md`）

## 路线 1：诸神模拟器核心拆层

- 新增 `src/domains/zhushen/model/zhushen-model.ts`，承接模型类型、向量工具与 zod schema。
- 页面、worker、数据层、store 的类型与 schema 引用迁移到 `domains/zhushen/model` 门面。
- 算法主流程入口下沉到 `src/domains/zhushen/engine/simulator-core.ts`。

## 路线 3：Store 契约统一

- 新增统一契约：`src/shared/persistence/store-contract.ts`。
- `linksStore / game2048Store / prefsStore / zhushenCustomStore` 全部接入 `StoreContract`（`satisfies` 约束）。
- Store 基础能力边界统一为 `load/save/reset`，并保留各域扩展字段。

## 路线 4：测试基线补齐

- 已补齐高风险模块最小回归网：
  - `src/domains/zhushen/engine/simulation.test.ts`
  - `src/shared/persistence/record.test.ts`
- 覆盖能力包含：
  - schema 校验失败回退
  - 异常 JSON 回退
  - 合法读写流程
  - 模拟基础路径与转职条件逻辑

## 路线 6：全仓 Domain-First 架构重构

### 分阶段状态

1. 阶段 A：建立骨架与别名（`completed`）
2. 阶段 B：逐域搬迁页面与数据（`completed`）
3. 阶段 C：诸神域深拆（`completed`）
4. 阶段 D：收口与删旧（`completed`）
5. 阶段 E：测试与文档收敛（`completed`）

### 关键结果

- 目录组织统一为 `src/domains/*` 与 `src/shared/*`。
- 路由、页面、worker、引擎、持久化的旧路径引用已收口。
- `src/pages`、`src/features`、`src/stores`、`src/storage`、`src/components` 的历史实现已迁移并清理。
- `npm test` 与 `npm run build` 在收口时已通过。

### 代表性实施项

- `zhushen` 域拆分为 `model/engine/pruning/state-pool/wasm/worker/orchestrator`。
- Worker 调度从页面剥离至 `orchestrator`，页面收敛为输入组装与状态展示。
- 持久化与 UI 公共能力迁移到 `src/shared/persistence/*`、`src/shared/ui/*`。
- 路径别名已启用：`@app/*`、`@domains/*`、`@shared/*`。

## 归档维护规则

- 新完成的路线先在 README 更新“当前状态/后续路线”，再将详细执行记录归档到本文档。
- 本文档只记录已完成事项；未完成路线保留在 README 的“后续路线（进行中）”。
