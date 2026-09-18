# UI 语义与视觉规范（UI Semantics）

本规范定义 UI 语义类、动效系统与层级规则，用于保证跨页面一致性。  
总原则仍以 [../vibeCodingCopy.md](../vibeCodingCopy.md) 为准。

## 目标

- 视觉一致：同类组件共享语义类与 token。
- 层级一致：统一卡片、输入与交互状态。
- 维护可控：减少页面私有样式分叉。

## 核心结论

1. 卡片底板统一使用 `surface-card`。
2. 装饰效果保持静态，避免长期工具使用中的视觉干扰。
3. 禁止页面内重复手写卡片材质和交互状态。

## 语义类分工

### 卡片 / 面板

- `surface-card`：统一卡片材质（玻璃、边框、阴影、内容层级）。
- `command-panel`：命令区面板语义，与 `surface-card` 组合使用。

### 输入 / 交互

- `ui-input`
- `ui-btn`（`ui-btn--ghost` / `ui-btn--primary` / `ui-btn--disabled`）
- `ui-filter-btn`（选中态 `is-active`）

### 标签 / 状态

- `ui-chip`
- `ui-badge`
- `ui-status`（`ui-status--ok` / `ui-status--warn`）

## 分层规则

- 背景装饰层：`z-index: 0`
- 内容层：`z-index: 1`
- 统一由 `surface-card` 提升内容层。

## 禁止项

- 禁止新建与 `surface-card` 并行的卡片体系。
- 禁止单页面特化卡片滤镜规则。
- 禁止用实体纯色替代玻璃表达。
