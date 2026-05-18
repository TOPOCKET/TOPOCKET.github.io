# UI 语义类使用规范

## 目标
通过语义类统一样式表达，减少页面中重复的长类串，保证全站玻璃质感一致。

## 组件语义类

- `ui-card`
  - 用于承载内容的基础容器卡片。
  - 只负责基础玻璃材质，不包含业务色层与光斑层。

- `ui-input`
  - 用于文本输入框。
  - 自带透明玻璃、边框、placeholder、focus-visible 规则。

- `ui-btn`
  - 用于命令按钮基类。
  - 变体：
    - `ui-btn--ghost` 普通操作
    - `ui-btn--primary` 高优先级操作（同色系提亮）
    - `ui-btn--disabled` 禁用态

- `ui-filter-btn`
  - 用于筛选按钮。
  - 激活态：`is-active`（同色系提亮，不使用品牌色）

- `ui-chip`
  - 用于普通标签（tags）。

- `ui-badge`
  - 用于状态型短标签（如“常用”）。
  - 可叠加 `ui-chip--fav` 等变体。

- `ui-status`
  - 用于卡片内状态（如“可用/开发中”）。
  - 变体：`ui-status--ok`、`ui-status--warn`

## 使用边界

- 需要 Raycast 色层与光斑时：
  - 容器使用 `raycast-card` + `BlobLayer`
  - 不要仅依赖 `ui-card`

- 纯玻璃小组件（按钮、标签、输入框）
  - 统一保持 `background: transparent`
  - 通过 `backdrop-filter + border + text contrast` 呈现

## 禁止项

- 不要在页面里手写新的“按钮风格长类串”替代 `ui-btn` 系列。
- 不要通过 `color-mix(...)` 构造玻璃主效果。
- 不要在同类组件中混用多套圆角、边框、blur 逻辑。
