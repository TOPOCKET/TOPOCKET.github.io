# 文档系统总览

为减少维护成本，文档体系收敛为两层：`规范` 与 `归档`。

## 当前状态

- 站点已精简为轻量个人工具集合。
- 当前保留首页工具导航、提示词模板和常用链接。
- 工具入口、路由、分类和权限由 `src/app/tool-registry.ts` 统一派生。

## 规范文档（长期维护）

- [vibeCodingCopy.md](./vibeCodingCopy.md)  
  项目总规范（最高优先级）
- [reference/storage.md](./reference/storage.md)  
  存储规范
- [reference/tool-registry.md](./reference/tool-registry.md)
  工具注册表规范
- [reference/ui-semantics.md](./reference/ui-semantics.md)  
  UI 语义规范

## 归档文档（历史记录）

- [archive/README.md](./archive/README.md)  
  归档总入口（先看此页，再进入具体归档）
- [archive/completed-work-archive.md](./archive/completed-work-archive.md)  
  已完成优化路线与实施记录（主归档）

## 维护规则

1. README 只保留项目入口与临时优化路线，不堆积过程日志。  
2. 规范变更写入 `reference/*` 或 `vibeCodingCopy.md`。  
3. 阶段完成后将优化过程迁移到 `archive/completed-work-archive.md`。  
