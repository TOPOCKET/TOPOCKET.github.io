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

为避免规则分散，项目文档统一收敛在 `docs/`：

- [docs/vibeCodingCopy.md](D:/Download/lysmarinel/docs/vibeCodingCopy.md)  
  开发规范总文档（工程、样式、动效、JSDoc、提交流程等）

- [docs/ui-semantics.md](D:/Download/lysmarinel/docs/ui-semantics.md)  
  UI 语义类与卡片/光斑最新规范（`surface-card`、`BlobLayer`、`useBlobMotion`）

- [docs/storage-contract.md](D:/Download/lysmarinel/docs/storage-contract.md)  
  本地存储契约（key、schema、默认值、写入策略、接入清单）

## 目录结构

```text
src/
  app/                # 路由与 route-meta
  domains/            # 业务域（页面与域内逻辑）
  shared/             # 跨域共享门面
  components/         # 通用组件
  composables/        # 通用逻辑
  cheats/             # 作弊码能力
  config/             # 运行时配置
  data/               # 配置数据与 schema
  features/           # 核心算法（含 wasm 接入）
  workers/            # Web Worker
  storage/            # 持久化基础层
  stores/             # 业务域 store
  styles/             # tokens + components
  types/              # 类型定义
docs/                 # 项目规范与契约文档
public/wasm/          # wasm 发布产物
wasm/zhushen-core/    # wasm Rust 源码
```

## 部署说明（GitHub Pages）

- 仓库名：`topocket.github.io`
- Pages Source：`GitHub Actions`
- 工作流：`.github/workflows/deploy.yml`

## 优化路线（持续更新）

说明：本模块用于记录“已确认的架构升级路径”。后续每次实施优化后，必须同步更新本模块状态与日期。

### 路线 4：测试基线补齐（中优先级）

- 目标：为高风险模块建立最小可回归测试网。
- 方案：
  - 优先覆盖 `domains/zhushen/engine/simulator-core.ts`、`storage/record.ts`、`stores/*`。
  - 增加 schema 校验、持久化读写、关键路径搜索结果稳定性测试。
- 收益：重构与性能优化可控，减少线上回归风险。
- 状态：`planned`

### 路线 5：文档索引与变更映射（中优先级）

- 目标：让文档更新路径可追踪、可检查。
- 方案：
  - 在 `docs/` 新增 `doc-index.md`，维护“模块 -> 文档 -> 更新触发条件”映射。
  - 与 `docs/vibeCodingCopy.md` 的文档同步约束联动执行。
- 收益：降低文档漂移，提升协作可见性。
- 状态：`planned`

### 路线 6：全仓 Domain-First 架构重构（最高优先级）

- 目标：从“技术层分目录”升级为“业务域分目录”，以长期可扩展性和演进效率为第一目标。
- 重构原则：
  - 领域优先：代码按业务域聚合，不按技术类型聚合。
  - 边界清晰：`domains/*` 只暴露对外门面，内部实现不跨域直接引用。
  - 共享最小化：可共享的才进入 `shared/*`，避免“伪共享”。
  - 一次定型：允许大迁移，避免长期双轨结构并存。

#### 目标目录树（重构完成态）

```text
src/
  app/                         # 应用装配层（main/router/route meta）
  domains/
    home/                      # 首页域（搜索、筛选、工具卡列表）
      page/
      components/
      model/
      services/
      index.ts
    prompts/                   # 提示词域
      page/
      model/
      services/
      index.ts
    links/                     # 常用链接域
      page/
      model/
      services/
      index.ts
    games/
      game-2048/               # 2048 域
        page/
        model/
        services/
        cheats/
        index.ts
      memory-match/            # 记忆翻牌域
        page/
        model/
        services/
        index.ts
    zhushen/                   # 诸神域（核心复杂域）
      page/
      model/                   # 类型/schema/输入输出契约
      engine/                  # simulate/search 主流程
      pruning/                 # 剪枝策略
      state-pool/              # SoA 状态池
      wasm/
      worker/
      orchestrator/            # worker 编排与并行调度
      index.ts
  shared/
    ui/                        # 可复用 UI 组件（BlobLayer、通用控件）
    style/                     # tokens/components 样式
    persistence/               # storage engine/keys/record + store contract
    schema/                    # 跨域通用 schema 工具
    types/                     # 跨域通用类型
    utils/                     # 纯工具函数
```

#### 分阶段实施计划（详细）

1. 阶段 A：建立骨架与别名（无行为变更）
   - 新建 `domains/*` 与 `shared/*` 目录骨架。
   - 配置路径别名（如 `@domains/*`、`@shared/*`）。
   - 先迁移 `styles`、`BlobLayer`、`storage contract` 到 `shared`。
   - 状态：`completed`

2. 阶段 B：逐域搬迁页面与数据（低风险）
   - 依次迁移 `home/prompts/links/games` 到 `domains`。
   - 每个域建立 `index.ts` 门面导出，页面只引用门面。
   - 保持路由路径不变，仅改 import。
   - 状态：`completed`（页面实体已迁移到 `src/domains/*/page`，`src/pages` 已删除）

3. 阶段 C：诸神域深拆（高复杂）
   - 拆分 `zhushen`：`model/engine/pruning/state-pool/wasm/worker/orchestrator`。
   - 页面只保留状态组装与展示，不再内含调度逻辑。
   - 状态：`in_progress`

4. 阶段 D：收口与删旧
   - 删除旧 `features/pages/stores/storage/components` 中已迁移文件。
   - 全量替换为 `domains/*` 与 `shared/*` 引用。
   - 状态：`planned`

5. 阶段 E：测试与文档收敛
   - 补齐高风险域测试（zhushen + persistence）。
   - 更新 `docs/*` 与 `README` 目录说明，移除历史结构描述。
   - 状态：`planned`

#### 完成判定标准（Done Criteria）

- `src/pages`、`src/features`、`src/stores`、`src/storage`、`src/components` 中业务代码迁移完毕并删除旧实现。
- 所有业务 import 经由 `domains/*` 或 `shared/*`。
- 构建通过、关键页面功能回归通过。
- 文档体系（README + docs）完全反映新结构。

#### 风险与控制

- 风险：大范围路径迁移导致短期回归与冲突增多。
- 控制：
  - 分阶段提交，每阶段可独立回滚。
  - 每阶段结束强制执行 `npm run build`。
  - 关键域优先补测试后再删旧代码。

- 本次执行（2026-05）：
  - 已新增 `src/domains/*` 门面层与 `src/shared/*` 门面层骨架。
  - 已配置并启用路径别名：`@app/*`、`@domains/*`、`@shared/*`。
  - 路由层 `route-meta.ts` 已改为通过 `@domains/*` 引用页面门面。
  - 已新增 `shared/persistence` 与 `shared/ui` 门面导出。
  - 已完成页面迁移：`src/pages/*` -> `src/domains/*/page/*`，并清理旧页面路径引用。
  - 阶段 C 已启动并完成首批拆分：
    - 新增 `src/domains/zhushen/model/ui-meta.ts`，集中管理页面语义标签常量。
    - 新增 `src/domains/zhushen/engine/simulation.ts`，页面通过域引擎门面调用模拟计算。
    - 新增 `src/domains/zhushen/orchestrator/search-orchestrator.ts`，并行 Worker 编排从页面剥离。
    - 新增 `src/domains/zhushen/worker/*`，搜索 Worker 与消息契约迁入域内目录。
    - `ZhushenSimulatorPage.vue` 已移除 Worker 调度细节，仅保留输入组装、状态管理、展示与交互。
  - 阶段 C 第二批已完成：
    - 新增 `src/domains/zhushen/state-pool/soa-state-pool.ts`，承接 SoA 状态池与压缩逻辑。
    - 新增 `src/domains/zhushen/pruning/search-pruning.ts`，承接量化分桶、路线哈希与时序支配过滤逻辑。
    - `src/domains/zhushen/engine/simulator-core.ts` 已组合 `pruning/state-pool` 模块，向“流程编排层”收敛。
  - 阶段 C 第三批已完成：
    - 新增 `src/domains/zhushen/engine/simulator-core.ts`，承接 `simulateZhushen/searchZhushenPlans` 主体编排实现。
    - `src/domains/zhushen/worker/zhushen-search.worker.ts` 已改为直接调用 domain engine，不再依赖 `features` 层。
  - 阶段 C 收口已完成：
    - 已清理项目内对 `src/features/zhushen-simulator.ts` 的剩余引用。
    - 已删除 `src/features/zhushen-simulator.ts` 兼容层，统一改由 `domains/zhushen/engine/*` 提供能力。
- 状态：`in_progress`

## 已完成优化记录

### 路线 1：诸神模拟器核心拆层（2026-05）

- 新增 `src/features/zhushen-model.ts`，承接模型类型、向量工具与 zod schema。
- 页面、worker、数据层、store 的类型与 schema 引用迁移到 `zhushen-model.ts`。
- 算法主流程入口已下沉到 `src/domains/zhushen/engine/simulator-core.ts`。

### 路线 3：Store 契约统一（2026-05）

- 新增统一契约：`src/stores/store-contract.ts`。
- `linksStore / game2048Store / prefsStore / zhushenCustomStore` 全部接入 `StoreContract`（`satisfies` 约束）。
- Store 基础能力边界统一为 `load/save/reset`，并保留各域扩展字段。
