# UI 语义规范（最新）

## 目标

通过统一语义类与组件抽象，保证页面视觉一致、动效一致、维护成本可控。

## 核心结论

1. 卡片底板统一使用 `surface-card`。  
2. 光斑动画统一使用 `BlobLayer.vue + useBlobMotion.ts`。  
3. 光斑轨迹统一为 `transform`，禁止 `left/top` 动画。  
4. 禁止页面内手写重复的光斑 DOM、随机逻辑、分组差异化轨迹。  

## 语义类分工

### 卡片/面板

- `surface-card`
  - 统一卡片底板语义类（替代历史分叉写法）。
  - 负责卡片玻璃材质、边框、阴影、高光与内容层级基线。
  - 所有新增卡片必须使用该类。

- `command-panel`
  - 用于承载命令区/控制区面板行为。
  - 与 `surface-card` 组合使用：`surface-card command-panel`。
  - 不得自行重写一套独立光斑体系。

### 输入与交互

- `ui-input`：输入框语义类（含透明背景、边框、focus-visible）。
- `ui-btn`：按钮基类；变体：
  - `ui-btn--ghost`
  - `ui-btn--primary`
  - `ui-btn--disabled`
- `ui-filter-btn`：筛选按钮；选中态 `is-active`。

### 标签与状态

- `ui-chip`：普通标签
- `ui-badge`：状态短标签
- `ui-status`：状态块；变体：
  - `ui-status--ok`
  - `ui-status--warn`

## 光斑系统（强制抽象）

- 渲染层：`src/components/BlobLayer.vue`
- 参数层：`src/composables/useBlobMotion.ts`
  - `createTintVars`
  - `createBlobVars`
  - `createCardMotionPreset`
  - `createPanelMotionPreset`

约束：
- 页面不得直接生成光斑节点或随机轨迹。
- 页面只传 seed/预设，不持有光斑细节逻辑。
- 同类卡片之间不得维护分叉光斑规则。

## 分层与层级

- 背景动效层：`z-index: 0`
- 内容层：`z-index: 1`
- 统一使用 `:not(.raycast-blob-layer)` 提升内容层。

## 禁止项

- 禁止新建与 `surface-card` 并行的卡片底板体系。
- 禁止对单页面/单分组做光斑特化（轨迹、滤镜、可见性独立规则）。
- 禁止通过实体纯色背景替代玻璃表达。
- 禁止在页面组件内写“长类串式”重复样式替代语义类。
