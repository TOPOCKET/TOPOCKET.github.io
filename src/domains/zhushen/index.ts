/**
 * @file index 文件说明。
 * @description zhushen 领域门面导出。
 */
export { default as ZhushenSimulatorPage } from './page/ZhushenSimulatorPage.vue'
export * from '../../features/zhushen-model'
export { formatVec } from '../../features/zhushen-model'
export { runZhushenSimulation } from './engine/simulation'
export { ZhushenSearchOrchestrator } from './orchestrator/search-orchestrator'
