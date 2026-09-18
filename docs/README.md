# 文档系统总览

为减少维护成本，文档体系收敛为两层：`规范` 与 `归档`。

## 当前状态

- 站点已精简为轻量个人工具集合。
- 当前保留首页工具导航、无限战棋、提示词模板和常用链接。
- 工具入口、路由和工具卡片由 `src/app/tool-registry.ts` 派生；分类定义位于 `src/data/tool-categories.ts`。

## 规范文档（长期维护）

- [vibeCodingCopy.md](./vibeCodingCopy.md)  
  项目总规范（最高优先级）
- [reference/storage.md](./reference/storage.md)  
  存储规范
- [reference/tool-registry.md](./reference/tool-registry.md)
  工具注册表规范
- [reference/ui-semantics.md](./reference/ui-semantics.md)  
  UI 语义规范

## 维护规则

1. README 只保留项目入口，不堆积过程日志。
2. 规范变更写入 `reference/*` 或 `vibeCodingCopy.md`。  
3. 阶段性实现记录由 Git 历史承载；新增长期约束时更新对应规范文档。
