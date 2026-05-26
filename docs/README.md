# 文档系统总览（Docs IA）

本目录采用“**总规范 + 主题规范 + 历史归档**”三层结构，目标是让文档可扩展、可检索、可维护。

## 1) 总规范（必须遵循）

- [vibeCodingCopy.md](./vibeCodingCopy.md)  
  项目唯一总规范。涉及工程、架构、样式、注释、流程的最终约束均以此为准。

## 2) 主题规范（可扩展）

- [reference/storage.md](./reference/storage.md)  
  数据与工具持久化规范（key、schema、写入策略、迁移策略、接入清单）。

- [reference/ui-semantics.md](./reference/ui-semantics.md)  
  UI 语义类、动效层级、光斑系统与视觉一致性规范。

- [reference/wasm.md](./reference/wasm.md)  
  WASM 源码与发布产物边界、构建与发布流程。

## 3) 历史归档

- [archive/completed-work-archive.md](./archive/completed-work-archive.md)
- [archive/architecture-upgrade-plan-archive.md](./archive/architecture-upgrade-plan-archive.md)
- [archive/observability-roadmap-archive.md](./archive/observability-roadmap-archive.md)

## 4) 扩展规则

新增文档时遵循：

1. 通用硬约束写入 `vibeCodingCopy.md`（或先提案后并入）。
2. 领域细则优先放入 `reference/<topic>.md`。
3. 一次性执行记录、阶段性路线放入归档文档，不堆积到 README。
