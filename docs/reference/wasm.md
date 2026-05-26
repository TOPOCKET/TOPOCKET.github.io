# WASM 边界规范（Source vs Artifact）

本规范定义 `wasm/` 与 `public/wasm/` 的职责边界，避免源码与发布产物混用。

## 目录职责

- `wasm/`
  - 存放 Rust 源码、Cargo 配置、构建脚本等“可编辑源码资产”。
  - 允许进行功能开发、重构、性能优化。

- `public/wasm/`
  - 存放前端运行时直接加载的 WASM 发布产物。
  - 仅由构建/拷贝流程产出，不作为源码修改位置。

## 流程约束

1. 先在 `wasm/` 完成实现与验证。
2. 通过构建流程生成产物并同步到 `public/wasm/`。
3. 前端仅引用 `public/wasm/`，不直接引用 `wasm/` 源目录。
4. 涉及 WASM 接口变化时，同步更新 `domains/zhushen/wasm/*` 的调用契约与测试。

## 提交检查

- 产物更新必须对应明确源码变更，不接受“仅产物漂移”。
- 构建后需通过 `npm run build`。
- 若影响性能观测，需执行 `npm run perf:check` 并检查报告。
