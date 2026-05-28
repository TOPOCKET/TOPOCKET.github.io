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

## 诸神搜索优化归档（P1-P6 / R1-R4）

归档日期：2026-05-28

### 已完成阶段

- P1 状态支配关系强化（`completed`，2026-05-26）
- P2 可行域收缩（`completed`，2026-05-26）
- P3 多目标 Beam 排序（`completed`，2026-05-26）
- P4 等价类压缩与路径去重（`completed`，2026-05-26）
- P5 WASM 批量判定前移（`completed`，2026-05-26）
- P6 性能基准集与参数调优（`completed`，2026-05-26）
- R1 转职等级离散化（`completed`，2026-05-28）
- R2 可达性前置过滤增强（`completed`，2026-05-26）
- R3 Route 比较分桶（`completed`，2026-05-28）
- R4 参数保护档位（`completed`，2026-05-28）

### 关键实施记录

- 搜索路径支配已引入资源约束偏序（转职次数约束）并接入 route frontier。
- 增加目标终态可达上界剪枝与转职步骤可行域上界剪枝。
- 候选排序升级为多目标排序（可达性余量 > 综合分 > 资源消耗），并加入多样性上限。
- 候选阶段启用等价类压缩（`job/transfer/lastPromo/growthSig`）。
- 路径/分组判定支持 WASM 批量流程。
- 建立三档 benchmark dataset 与报告输出链路。
- `promoLevel` 由逐级枚举改为关键等级枚举（短区间保留全量）。
- route frontier 引入分桶键（`transferCount + lastPromoBand + growthMajor`），先桶内再全局比较。
- 默认稳态参数调整为：`beamWidth=600`、`maxTransfer=4`、`maxTierDelta=2`、`maxSkillPerStep=1`，UI 增加高风险参数提示。

### 基准验证（2026-05-28）

- `npm run benchmark:zhushen`
- `small`: `exploredStates=2772`, `durationMs=17.99`
- `medium`: `exploredStates=7192`, `durationMs=25.53`
- `large`: `exploredStates=7200`, `durationMs=30.55`

## 诸神搜索优化归档（N1-N5）

归档日期：2026-05-28

### 已完成阶段

- N1 分层 Beam 预算（`completed`）
- N2 Group 前置粗筛（`completed`）
- N3 组合枚举次序重排（`completed`）
- N4 WASM 批处理扩宽（`completed`）
- N5 稳态参数分档（`planned`, 未执行）

### N1 验证

- `npm run test -- src/domains/zhushen/engine/simulation-regression.test.ts`：passed
- `npm run benchmark:zhushen`：passed
- `small`: `exploredStates=2772`, `durationMs=32.34`
- `medium`: `exploredStates=7192`, `durationMs=48.88`
- `large`: `exploredStates=7200`, `durationMs=52.87`
- 结论：候选分布变化，但固定基准下时延收益不明显。

### N2 验证

- `npm run test -- src/domains/zhushen/engine/simulation-regression.test.ts`：passed
- `npm run benchmark:zhushen`：passed
- `small`: `exploredStates=2772`, `durationMs=38.76`
- `medium`: `exploredStates=7192`, `durationMs=71.62`
- `large`: `exploredStates=7200`, `durationMs=70.86`
- 结论：固定基准下未体现时延收益。

### N3 验证

- `npm run test -- src/domains/zhushen/engine/simulation-regression.test.ts`：passed
- `npm run benchmark:zhushen`：passed
- `small`: `exploredStates=2772`, `durationMs=42.70`
- `medium`: `exploredStates=7192`, `durationMs=73.77`
- `large`: `exploredStates=7200`, `durationMs=101.65`
- 结论：`exploredStates` 未下降，时延回退。

### N4 验证

- `npm run test -- src/domains/zhushen/engine/simulation-regression.test.ts`：passed
- `npm run benchmark:zhushen`：passed
- `npm run build`：passed
- `small`: `exploredStates=2772`, `durationMs=52.40`
- `medium`: `exploredStates=7192`, `durationMs=102.86`
- `large`: `exploredStates=7200`, `durationMs=61.81`
- 结论：优化了分配路径，但固定基准波动仍大，瓶颈不在单点分配。

## E1 阶段复验归档（2026-05-28）

### 复验目标

- 在 `E1`（枚举前硬剪枝）当前实现下执行完整“三轮中位数 + 诊断报告”。
- 结论用于判断 `E1-4` 是否可固化。

### 执行命令

- `npm run benchmark:zhushen:replay`（连续三轮）
- `npm run diagnose:zhushen:replay`

### 三轮结果

- Round 1：`durationMs=109355ms`
- Round 2：`durationMs=116862ms`
- Round 3：`durationMs=116781ms`
- 三轮中位数：`116781ms`

### 诊断摘要

- 报告：`scripts/benchmarks/zhushen-live-replay-diagnosis-report.json`
- Top phases：`promoEnumMs`、`comboCheckMs`、`routePruneMs`
- 当前规模：`comboTried=28383712`，`routeChecks=101397991`，`groupChecks=86041294`
- `comboPassRate=0.991`（前置组合过滤仍偏弱）

### 结论

- `E1-4` 当前不建议固化（默认保持 `off`）。
- 原因：
  - 三轮口径下中位数不具备稳定优势；
  - 波动仍高；
  - 主耗时仍集中在枚举链路，需继续加强 `E1-1/E1-2/E1-3` 的前置硬剪枝强度。

## A* 技术线固化归档（2026-05-28）

### 固化内容

- 搜索策略固定为：`P3` 稳定实现（组合枚举去重）+ route 必要条件前置过滤。
- 统一搜索入口全面转为 `astar_bnb_mvp`。
- 移除 `targetFinalJobId` 场景下回退 `beam` 的兼容逻辑。
- `beam/cp_sat` 不再参与线上搜索分流（保留历史文件用于归档与离线对照）。

### 关键代码点

- `src/domains/zhushen/engine/search-engine.ts`：入口固定分发到 `astar_bnb_mvp`。
- `src/domains/zhushen/engine/astar-bnb-solver.ts`：删除 `beam` 回退分支并固化 A* 稳定路径。
- `src/domains/zhushen/engine/simulator-core.ts`：清理运行时策略开关分支，保留固定稳定实现。

### 验证结论（live_replay_v1，astar-only）

- `bestScore=2646.422`，`routeSignature=4:priest|147:magic-archer|149:royal-knight`。
- `comboTried=323359`，`routeChecks=70810`。
- 相比 README 记录的 beam 基线，时延和规模指标显著下降。

### 清理动作（同日）

- 删除旧技术文件：
  - `src/domains/zhushen/engine/cp-sat-solver.ts`
- 删除旧对比测试：
  - `src/domains/zhushen/engine/simulation-engine-calibration.test.ts`
  - `src/domains/zhushen/engine/simulation-strategy-ab.test.ts`
- 统一基线脚本：
  - `benchmark:zhushen:engines` 改为指向 `simulation-engine-replay-calibration.test.ts`。
