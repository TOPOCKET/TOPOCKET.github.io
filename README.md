# Sopronwitta

个人小工具集合站（SPA），基于 `Vue 3 + TypeScript + Vite`，面向静态部署（GitHub Pages）。

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
- zod

## 当前模块

- 首页工具导航（搜索 / 分类）
- 提示词模板页（搜索 / 复制）
- 常用链接页（分组展示）
- 2048 Mini
- Memory Match
- 诸神皇冠培养模拟器（含 Worker + WASM）

## 文档体系（统一入口）

为避免规则分散，项目文档统一收敛在 `docs/`，推荐阅读顺序：

- [docs/README.md](./docs/README.md)  
  文档系统总览（分层结构、维护规则）

- [docs/vibeCodingCopy.md](./docs/vibeCodingCopy.md)  
  总体项目规范（必须遵循，最高优先级）

- [docs/reference/storage.md](./docs/reference/storage.md)  
  数据与工具持久化规范（key、schema、写入/迁移策略）

- [docs/reference/ui-semantics.md](./docs/reference/ui-semantics.md)  
  UI 语义类与视觉一致性规范（`surface-card`、`BlobLayer`、层级规则）

- [docs/reference/wasm.md](./docs/reference/wasm.md)  
  WASM 源码/产物边界与更新流程

- [docs/archive/completed-work-archive.md](./docs/archive/completed-work-archive.md)  
  已完成任务归档（里程碑、实施细项、验收结果）

- [docs/archive/architecture-upgrade-plan-archive.md](./docs/archive/architecture-upgrade-plan-archive.md)  
  架构升级计划归档（P1-P5 完整记录与验收结果）

- [docs/archive/observability-roadmap-archive.md](./docs/archive/observability-roadmap-archive.md)  
  可观测性任务路线归档（O1-O4）

## 目录结构

```text
src/
  app/                # 路由与 route-meta
  domains/            # 业务域（页面与域内逻辑）
  shared/             # 跨域共享门面
  cheats/             # 作弊码能力
  config/             # 运行时配置
  data/               # 配置数据与 schema
  shared/style/       # tokens + components
  types/              # 类型定义
docs/                 # 项目规范与契约文档
public/wasm/          # wasm 发布产物
wasm/zhushen-core/    # wasm Rust 源码
```

## 部署说明（GitHub Pages）

- 仓库名：`topocket.github.io`
- Pages Source：`GitHub Actions`
- 工作流：`.github/workflows/deploy.yml`

## 下一步可行优化方案

### P1：状态支配关系强化（数学优化，最高优先级）

- 目标：从搜索空间层面减少无效状态扩展。
- 方案：
  - 在现有支配判定基础上引入资源约束偏序（转职次数、关键组合可达性）。
  - 增加可达上界比较，提前剪除必败路径。
- 验收：
  - `exploredStates` 显著下降，且最优方案稳定不回退。
- 状态：`completed`（2026-05-26）
- 已完成：
  - 搜索路径支配判定已引入资源约束（较少转职次数可支配较多转职次数状态）。
  - 资源约束支配已接入 route frontier 判定流程，减少冗余扩展。

### P2：可行域收缩（数学优化，高优先级）

- 目标：在展开前过滤数学上不可达候选。
- 方案：
  - 构建属性上界估计（角色成长 + 职业成长 + 装备/技能上界包络）。
  - 无法满足目标职业/约束条件的候选不进入组合枚举。
- 验收：
  - 候选分支数量下降，结果与现有正确性用例一致。
- 状态：`completed`（2026-05-26）
- 已完成：
  - 新增目标终态可达上界剪枝（结合剩余成长上界、职业面板上界、终态装备/技能）。
  - 新增转职步骤可行域上界剪枝（`tempPanelBase + maxStepEquipSkillVec` 不达标直接跳过组合枚举）。
  - 新增回归测试覆盖“不可达目标终态应快速收敛为空结果”。

### P3：多目标 Beam 排序（数学优化，中高优先级）

- 目标：减少短期高分但长期不可达状态占用 Beam。
- 方案：
  - 将单一分数排序升级为“可达性优先 + 关键属性差距 + 综合分”的多目标排序。
  - 增加保留多样性约束，避免同质状态堆积。
- 验收：
  - Top 方案质量稳定，Beam 命中效率提升。
- 状态：`completed`（2026-05-26）
- 已完成：
  - 候选保留阶段已切换为多目标排序（可达性余量 > 综合分 > 资源消耗）。
  - 已加入同类状态占比上限，降低 Beam 同质化。

### P4：等价类压缩与路径去重（数学优化，中优先级）

- 目标：压缩“顺序不同但结果等价”的重复路线。
- 方案：
  - 引入路线 canonical form（关键转职事件编码）并哈希归并。
  - 等价候选仅保留代表状态。
- 验收：
  - 重复状态率下降，整体运行时下降。
- 状态：`completed`（2026-05-26）
- 已完成：
  - 候选阶段新增等价类 key（job/transfer/lastPromo/growthSig）压缩。
  - 每个等价类仅保留代表状态进入 Beam，减少重复扩展。

### P5：WASM 批量判定前移（工程优化，中优先级）

- 目标：把高频批处理进一步下沉到 WASM。
- 方案：
  - 继续前移 dominance/route prune/group prune 批量判定。
  - JS 保留调度与状态管理，减少跨层数据拷贝与循环开销。
- 验收：
  - 中大型输入场景下总耗时下降且结果一致。
- 状态：`completed`（2026-05-26）
- 已完成：
  - 路径支配第一阶段已支持 `shortlist + rest` 的 WASM 批量判定（达到阈值时）。
  - 已保留资源约束过滤，避免高资源状态错误支配低资源状态。
  - 已通过 `test/build/perf` 回归验证。

### P6：性能基准集与参数调优（工程优化，中优先级）

- 目标：让优化可量化、可回归、可持续调参。
- 方案：
  - 建立小/中/大三档固定 benchmark dataset。
  - 固定输出指标：`exploredStates`、`pruned ratio`、`total ms`、`best-score stability`。
- 验收：
  - 每次优化均可产出对比报告并可判断收益/回退。
- 状态：`completed`（2026-05-26）
- 已完成：
  - 新增固定三档数据集：`scripts/benchmarks/zhushen-benchmark-dataset.json`。
  - 新增基准测试与报告输出：`src/domains/zhushen/engine/simulation-benchmark.test.ts` -> `scripts/benchmarks/zhushen-benchmark-report.json`。
  - 新增命令：`npm run benchmark:zhushen`、`npm run benchmark:wasm-route`。

## 建议执行顺序

- 顺序：`P1 -> P2 -> P3 -> P4 -> P5 -> P6`
- 原则：每阶段独立提交、独立验收、可回滚。
- 基线命令：`npm test`、`npm run build`、`npm run perf:check`。
- 当前进度：`P1/P2/P3/P4/P5/P6 completed`。

## 分支爆炸专项（下一轮）

### 问题定位

- 现象：`候选数较低` 但 `exploredStates 极高`，且 `routeChecks` 远高于命中数。
- 结论：瓶颈在“分支生成过大 + 后置比较过多”，不是状态池容量本身。

### R1：转职等级离散化（最高优先级）

- 目标：减少 `promoLevel` 逐级扫描产生的乘法扩张。
- 方案：
  - 从“每级枚举”收敛到“关键等级枚举”（最早可行 + 局部窗口 + 末段关键点）。
  - 同职业同组合只保留有限等级候选。
- 验收：
  - `exploredStates` 下降 50%+（以 benchmark 中/大档为准）。

### R2：可达性前置过滤增强（高优先级）

- 目标：在进入装备/技能双循环前判死不可达候选。
- 方案：
  - 扩展分阶段上界估计（成长上界 + 面板上界 + 组合上界）。
  - 对不可达目标职业/约束直接跳过。
- 验收：
  - `candidateSize` 和组合枚举次数明显下降，结果稳定。

### R3：Route 比较分桶（高优先级）

- 目标：降低 `routeChecks` 比较基数。
- 方案：
  - 引入 route frontier 分桶键（transfer/lastPromo/growth band）。
  - 优先桶内比较，再回退全局比较。
- 验收：
  - `routePrunes / routeChecks` 命中率提升，单轮耗时下降。

### R4：参数保护档位（中优先级）

- 目标：避免极端参数触发搜索规模失控。
- 方案：
  - 设定稳态默认档位：`beamWidth`、`maxTransfer`、`maxTierDelta`、`maxSkillPerStep`。
  - 对高风险参数组合给出 UI 提示或软限制。
- 验收：
  - 默认配置下搜索耗时与探索量稳定在可接受区间。
