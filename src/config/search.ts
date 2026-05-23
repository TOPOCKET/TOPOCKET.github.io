/**
 * @file search 文件说明。
 * @description 搜索与 WASM 运行参数统一配置。
 */

/**
 * SEARCH_RUNTIME_CONFIG 导出定义。
 * @remarks 该常量为共享配置或数据源，修改后会影响所有消费方。
 */
export const SEARCH_RUNTIME_CONFIG = {
  beamWidthDefault: 1000,
  maxTransferDefault: 5,
  maxTierDeltaDefault: 3,
  maxSkillPerStepDefault: 2,
  workerYieldEvery: 2000,
  routeWasmThreshold: 256,
  groupWasmThreshold: 128,
  parallelWorkerIdleTimeoutMs: 180000,
} as const

