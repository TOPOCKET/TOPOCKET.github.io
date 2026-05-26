# UI 语义与视觉规范（UI Semantics）

本规范定义 UI 语义类、动效系统与层级规则，用于保证跨页面一致性。  
总原则仍以 [../vibeCodingCopy.md](../vibeCodingCopy.md) 为准。

## 目标

- 视觉一致：同类组件共享语义类与 token。
- 动效一致：统一光斑系统与分层规则。
- 维护可控：减少页面私有样式分叉。

## 核心结论

1. 卡片底板统一使用 `surface-card`。
2. 光斑统一使用 `BlobLayer.vue + useBlobMotion.ts`。
3. 光斑轨迹统一使用 `transform`，禁止 `left/top` 动画。
4. 禁止页面内重复手写光斑 DOM 与随机逻辑。

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

## 光斑系统（强制抽象）

- 渲染层：`src/shared/ui/components/BlobLayer.vue`
- 参数层：`src/shared/ui/composables/useBlobMotion.ts`
  - `createTintVars`
  - `createBlobVars`
  - `createCardMotionPreset`
  - `createPanelMotionPreset`

约束：

- 页面只传 seed/预设，不持有光斑细节逻辑。
- 同类卡片禁止维护分叉光斑规则。

## 分层规则

- 背景动效层：`z-index: 0`
- 内容层：`z-index: 1`
- 统一使用 `:not(.raycast-blob-layer)` 提升内容层。

## 禁止项

- 禁止新建与 `surface-card` 并行的卡片体系。
- 禁止单页面特化光斑轨迹/滤镜规则。
- 禁止用实体纯色替代玻璃表达。
