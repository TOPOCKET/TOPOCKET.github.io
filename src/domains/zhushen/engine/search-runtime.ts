/**
 * @file search-runtime
 * @description 诸神搜索引擎运行时依赖与调度参数定义。
 */
import type { ZhushenWasmCore } from '@/domains/zhushen/wasm/zhushen-wasm'

/**
 * 搜索引擎运行时选项。
 */
export interface SearchRuntimeOptions {
  yieldEvery?: number
  bnbLowerBoundScore?: number
  bnbUpperScoreCache?: Map<string, number>
  wasmCore?: ZhushenWasmCore | null
}
