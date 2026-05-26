# 架构升级计划归档（P1-P5）

归档日期：2026-05-26  
范围：README 中原“架构升级计划”P1-P5 全部阶段的目标、验收与落地记录。

## 完成状态

- P1 架构边界治理：`completed`
- P2 核心能力端口化：`completed`
- P3 状态流与可回放能力：`completed`
- P4 性能预算与基准回归：`completed`
- P5 测试体系升级：`completed`

## P5 落地摘要（本次）

- 门面/端口契约测试：
  - `src/domains/zhushen/contract/zhushen-ports.contract.test.ts`
- 算法性质测试（property-like）：
  - `src/domains/zhushen/engine/simulation-regression.test.ts`（增长单调性校验）
- Golden Dataset 回归：
  - `src/domains/zhushen/engine/simulation-regression.test.ts`（代表性输入稳定输出）

## 当前质量基线

- `npm test`：5 files, 13 tests passed
- `npm run build`：passed
- `npm run perf:check`：passed

## 维护规则

- 后续若开启新一轮升级计划，README 仅维护“当前计划摘要 + 状态”。
- 阶段执行细节、验收日志、回归结果统一归档到 `docs/`，避免 README 叠加历史流水。
