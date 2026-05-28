# 诸神皇冠培养模拟器需求基线

更新时间：2026-05-28  
适用范围：`src/domains/zhushen/*` 搜索引擎、页面参数、benchmark 验收

## 1. 业务目标

- 支持手选路线模拟：输入角色与转职路线，计算最终属性。
- 支持自动搜索：在性能可接受前提下给出“最优转职路线与最优属性结果”（当前定义为评分最优）。
- 角色等级范围：`1 -> 150`。
- 成长规则：每级增量 = `角色自带成长 + 当前职业成长`，且从 `Lv60` 开始成长衰减系数为 `0.35`。

## 2. 已确认的建模取舍（当前不改）

以下为产品与性能双约束下的明确选择：

1. Beam 近似搜索保留，不改为全量穷举。
2. 转职结构约束保留（tier 跳跃限制、visitedMask 防回环等）。
3. 最大转职次数上限保留（策略与性能双重限制）。
4. 装备/技能参与转职判定与优化过程保留（符合游戏真实流程）。

## 3. 目标函数口径（当前）

- 当前“最优”定义为**评分最优**（默认 `scorePreset=sum`）。
- 该口径不是“六维逐项同时绝对最大”或 Pareto 前沿最优。
- 后续若要切换到多目标最优，需单独立项，不与当前性能优化混改。

## 4. 性能验收口径

优先看真实回放基准，再看合成集：

1. 第一门禁：`npm run benchmark:zhushen:engines:replay`
2. 第二门禁：`npm run benchmark:zhushen:replay:full`（跑回放并自动产出诊断）
3. 关键指标：`durationMs`、`exploredStates`、`comboTried`、`groupChecks`、`bestScore`

合并要求：

- `bestScore` 不回退；
- 至少一项核心规模指标显著下降（优先 `exploredStates/comboTried/groupChecks`）；
- 回放基准不出现明显时延回退。

## 5. 开关策略基线

- 默认稳定基线：`off_off`（`enableGroupMinorBucket=false`, `enableComboPriorityOrder=false`）。
- 高风险策略新增时先开关化，默认 `off`。
- 仅当 A/B 在回放基准稳定收益后，才允许调整默认值。
