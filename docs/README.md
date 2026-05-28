# 文档系统总览

为减少维护成本，文档体系收敛为两层：`规范` 与 `归档`。

## 当前状态（诸神模拟器）

- 搜索主线已固定为单引擎：`astar_bnb_mvp`。
- 旧技术线与旧对比测试已清理，后续以当前 A* 基线继续优化。
- 回放基线入口：`npm run benchmark:zhushen:engines:replay`。
- 一键回放+诊断：`npm run benchmark:zhushen:replay:full`。
- 对比口径：A* 实测 vs `beam` 固定历史基线（只作对照，不再参与线上分流）。

## 当前性能基线（live_replay_v1）

- 报告：`scripts/benchmarks/zhushen-engine-replay-calibration-report.json`
- 基线指标（最新 3 轮中位数）：
  - `astar medianMs=4893.15`
  - `bestScore=2646.422`
  - `routeSignature=4:priest|147:magic-archer|149:royal-knight`
  - `comboTried=323359`
  - `routeChecks=70810`

## 规范文档（长期维护）

- [vibeCodingCopy.md](./vibeCodingCopy.md)  
  项目总规范（最高优先级）
- [reference/zhushen-requirements.md](./reference/zhushen-requirements.md)  
  诸神模拟器需求基线
- [reference/storage.md](./reference/storage.md)  
  存储规范
- [reference/ui-semantics.md](./reference/ui-semantics.md)  
  UI 语义规范
- [reference/wasm.md](./reference/wasm.md)  
  WASM 规范

## 归档文档（历史记录）

- [archive/README.md](./archive/README.md)  
  归档总入口（先看此页，再进入具体归档）
- [archive/completed-work-archive.md](./archive/completed-work-archive.md)  
  已完成优化路线与实施记录（主归档）

## 维护规则

1. README 只保留项目入口与临时优化路线，不堆积过程日志。  
2. 规范变更写入 `reference/*` 或 `vibeCodingCopy.md`。  
3. 阶段完成后将优化过程迁移到 `archive/completed-work-archive.md`。  
