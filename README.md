# Sopronwitta

个人小工具集合网站，基于静态部署，包含工具导航、搜索筛选、提示词模板和常用链接分组页面。

## 技术栈

- Vite
- Vue 3 + TypeScript
- Tailwind CSS
- Vue Router（`createWebHashHistory`）
- GitHub Pages（GitHub Actions 自动部署）

## 当前功能

- 首页工具导航面板
- 工具搜索（名称/描述/标签）
- 工具分类筛选
- Prompts 页面：模板搜索 + 一键复制
- Links 页面分组展示与一键打开
- 2048 Mini（方向键/WASD，支持本地进度保存）
- 路由元数据配置化（标题自动更新）
- 数据 schema 运行时校验（tools/links/prompts）
- 前端本地数据管理体系（单一存储入口 + 版本化 + 迁移）

## 本地开发

```bash
npm install
npm run dev
```

默认访问：`http://127.0.0.1:4173`（或 Vite 输出端口）。

## 构建

```bash
npm run build
```

构建产物目录：`dist/`

## GitHub Pages 发布

本项目为用户主页站点模式，目标域名：

- `https://topocket.github.io/`

要求：

1. 仓库名必须为 `topocket.github.io`
2. Pages Source 选择 `GitHub Actions`
3. 工作流文件使用 `.github/workflows/deploy.yml`

## 目录结构

```text
src/
  app/                # 路由与 route-meta
  components/         # 通用组件
  composables/        # 通用逻辑（prefs/blob motion）
  data/               # 配置数据（tools/links/prompts + schemas）
  pages/              # 页面（Home/Prompts/Links）
  storage/            # localStorage 基础层（prefix/key/record adapter）
  stores/             # 按域分层 store（prefs/game2048/links）
  styles/             # 样式分层（tokens/components）
  types/              # TS 类型定义
```

## 前端-only 数据管理规范

### 1) 单一存储入口

所有本地持久化必须通过：

- `src/storage/engine.ts`
- `src/storage/record.ts`
- `src/stores/*`

禁止在页面/组件里直接调用 `localStorage.setItem/getItem`。

### 2) 命名空间 + 版本化

统一前缀：`sopronwitta:`

当前 key：

- `sopronwitta:prefs:v1`
- `sopronwitta:tool:2048:v1`
- `sopronwitta:links:v1`

### 3) Schema 校验

每条记录读取时必须先过 zod 校验，校验失败回退默认值，保证运行时稳定。

### 4) Store 分层

按业务域拆分 store，不按页面拆分。每个 store 必须暴露：

- `load`
- `save`
- `reset`
- `migrate`

### 5) 数据迁移

新版本通过 `migrate(vN -> vN+1)` 迁移，不直接覆盖旧结构。

### 6) 写入策略

高频状态（如 2048 棋盘）默认使用节流写入（当前 300ms），并在页面卸载前强制保存一次。

### 7) 作弊功能策略

- 统一通过通用引擎 `src/cheats/useCheatCode.ts` 监听和触发
- 统一通过 `CheatRuntime` 管理本局作弊状态
- 默认不持久化（仅本局生效）；若需要持久化，必须显式声明 `persistCheats: true`

### 8) Contract 文档

新增/修改本地存储记录时，必须同步更新：

- `storage-contract.md`

## 诸神皇冠培养模拟器：算法与性能

### 目标

- 在前端静态站点（GitHub Pages）中，完成高等级、多转职路线搜索
- 保证 UI 不阻塞，并给出可解释的 Top 路线结果

### 核心设计

1. 搜索模型：按“转职阶段”Beam Search（不是按每级展开）
2. 状态存储：SoA（Struct of Arrays）+ TypedArray 状态池
3. 候选处理：先判后入池（先 route/group 剪枝，通过后才分配状态索引）
4. 成长计算：区间累计 + 增量推进，避免逐级重复重算
5. 路径恢复：`parentIndex` 回溯，不在状态中存完整历史
5. 线程模型：Web Worker 运行搜索，主线程仅渲染与交互
6. 并行模型：动态任务队列 + 多 Worker（空闲 worker 自动领取下一任务），结果合并
7. WASM 热路径：候选评分 + 剪枝比较批处理已迁移到 Rust WebAssembly（worker 内优先调用 wasm，失败自动回退 JS）

### 状态结构（SoA）

搜索状态池位于 `src/features/zhushen-simulator.ts` 的 `SoAStatePool`，主要列：

- `levels: Uint16Array`
- `jobIndexes: Uint16Array`
- `transferCounts: Uint8Array`
- `visitedMasks: BigUint64Array`（最多支持 64 职业）
- `parentIndexes: Int32Array`
- `promoLevels/promoJobIndexes/promoEquipIndexes/promoSkillIndexes`
- `growth: Float32Array`（6 维连续存储）

这样可显著减少对象分配和 GC 压力，提升缓存局部性。

稳定性说明（2026-05）：
- 曾尝试状态索引复用（free-list），在复杂前沿剪枝下出现引用一致性风险，可能导致错误最优解。
- 当前稳定版本已回退到“索引单调增长 + 周期压缩”，优先保证结果正确。

### 关键剪枝与筛选

1. 基础支配剪枝：同 `(level, job, transferCount)` 分组，劣势成长状态淘汰
2. route frontier 剪枝：同职业序列按“最后转职等级分层 skyline”提前淘汰劣势状态
3. 前沿索引增强：在 skyline/layer 上增加主属性分桶（STR/AGI/CON 区间），优先同桶比较，再回退全层比较
4. bucket 压缩：先用量化签名（`quantSig`）做短名单，再做精确支配比较
5. Top-K 保留：用最小堆替换全量 sort，每轮只保留前 `beamWidth`
6. 结果后处理：同职业序列下，若方案 A 每步转职等级不晚于 B 且最终属性不低，则剔除 B（最终一致性兜底）

### 进度与响应性

- Worker 内支持分块让步（`yieldEvery` + `setTimeout(0)`）
- 主线程显示实时进度（step/total、beam、candidate、explored、pruned、poolSize、compactionCount）
- 新增观测指标：`poolPeak`、`stepMs`、`routePrunes/routeChecks`、`groupPrunes/groupChecks`
- 并行 Worker 的进度会聚合后展示

### Rust WASM 核心

- Rust 代码：`wasm/zhushen-core/`
- WASM 产物：`public/wasm/zhushen_core.wasm`
- 当前迁移范围：
  - Top-K 前候选评分批处理（`score_batch`）
  - 剪枝比较批处理（`prune_flags`，用于 group 短名单和批量反向淘汰）
  - route frontier 批量比较（`route_prune_flags`）
  - 扩展生成过滤批处理（`combo_pass_flags`，用于候选枚举阶段的组合可行性筛选）
- 接入位置：`src/features/zhushen-wasm.ts` + `src/workers/zhushen-search.worker.ts`
- 失败策略：WASM 加载失败自动回退到 JS 评分逻辑
- 阈值策略：仅在大批量比较时启用 wasm（避免小批量下 FFI 开销反噬）
- 部署约束：GitHub Pages 环境不使用 `wasm threads`，当前方案仅使用单线程 wasm + SIMD

基准（本机，Node 本地脚本 `scripts/benchmark-wasm-route.cjs`）：

- `route_prune_flags N=20000`: JS `~0.91ms`，WASM `~2.38ms`，结果一致 `same=true`
- 结论：中小批量场景 JS 更快，WASM 仅用于更大批量（当前阈值：route `>=256`、group `>=128`）

#### 最新迁移进度

- 已完成：
  - `score_batch`（评分批处理）
  - `prune_flags`（group 剪枝比较批处理）
  - `route_prune_flags`（route frontier 主循环比较批处理）
  - `combo_pass_flags`（扩展生成阶段的组合过滤）
- 已启用 SIMD 编译（`target-feature=+simd128`）
- 当前策略：
  - 默认优先 wasm，但仅在达到阈值时启用批处理接口
  - 小批量保持 JS 路径以避免调用开销

重新编译命令（PowerShell，含 SIMD）：

```powershell
$env:USERPROFILE\.cargo\bin\rustup.exe target add wasm32-unknown-unknown
$env:RUSTFLAGS='-C target-feature=+simd128'
$env:USERPROFILE\.cargo\bin\cargo.exe build --release --target wasm32-unknown-unknown --manifest-path wasm/zhushen-core/Cargo.toml
Copy-Item wasm\zhushen-core\target\wasm32-unknown-unknown\release\zhushen_core.wasm public\wasm\zhushen_core.wasm -Force
```

### 复杂度直觉

- 决策层数从“目标等级层数”降为“最大转职次数层数”
- 每层通过剪枝和 Top-K 控制状态规模
- 并行 worker 可进一步利用多核 CPU

### 当前已知约束

1. `visitedMasks` 使用 `BigUint64Array`，当前上限是 64 职业
2. 并行分片策略当前按首转职业均分，属于通用策略，未做数据驱动负载均衡
3. 量化签名主要用于减少比较次数，不改变正确性；最终仍保留精确支配判定
4. 内存峰值主要由单步候选爆发引起；当前通过流式剪枝与状态池压缩控制峰值

### 下一步优化建议（当前稳定基线）

1. 高优先级：分桶邻域比较
   - 现状：同桶优先，仍会回退全层
   - 建议：引入“邻域桶”策略（相邻桶）减少全层回退比例

2. 中优先级：动态参数自适应
   - 基于 `stepMs` 和命中率动态调整 `beamWidth / yieldEvery / workerCount`

3. 中长期：WASM 核心继续迁移
   - 已完成：`score_batch`、`prune_flags`、`route_prune_flags`、`combo_pass_flags` 迁移，支持 SIMD 编译
   - 下一步：将扩展生成后的候选构建与更多前沿维护逻辑继续下沉到 wasm（保持 GitHub Pages 单线程约束）
